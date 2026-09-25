import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT, DECODE_TOOL_SCHEMA } from "@/lib/prompt";
import { getFallbackDecode } from "@/lib/fallback";
import { buildPartial, normalizeResult } from "@/lib/normalize";
import { parsePartialObject } from "@/lib/partialJson";
import { DecodeResult, DecodeStreamEvent } from "@/types";

export const runtime = "nodejs";
// Decodes typically finish in 10-20s; leave headroom for long screenshots.
export const maxDuration = 60;

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60_000;

const MODEL = process.env.DECODE_MODEL || "claude-opus-4-8";
const MAX_TEXT_CHARS = 4000;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // ~5 MB decoded
const ALLOWED_MEDIA = new Set(["image/png", "image/jpeg", "image/webp"]);
/** Minimum gap between partial events, so the client is not flooded. */
const PARTIAL_THROTTLE_MS = 80;

const NDJSON_HEADERS = {
  "Content-Type": "application/x-ndjson; charset=utf-8",
  "Cache-Control": "no-cache, no-transform",
  "X-Accel-Buffering": "no",
};

function eventLine(event: DecodeStreamEvent): string {
  return JSON.stringify(event) + "\n";
}

/** A complete NDJSON response holding nothing but a final event. */
function finalOnly(result: DecodeResult): Response {
  return new Response(eventLine({ type: "final", data: result }), {
    status: 200,
    headers: NDJSON_HEADERS,
  });
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  // Opportunistic cleanup so the map can't grow unbounded across many IPs.
  if (rateLimitMap.size > 5000) {
    for (const [k, v] of rateLimitMap) if (now > v.resetAt) rateLimitMap.delete(k);
  }
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT;
}

function sanitizeText(str: unknown): string {
  if (typeof str !== "string") return "";
  return str.slice(0, MAX_TEXT_CHARS).trim();
}

/**
 * POST /api/decode
 *
 * Streams NDJSON: zero or more {"type":"partial"} lines while the model writes
 * the decode, then exactly one {"type":"final"} line holding the normalized
 * DecodeResult (or the safe fallback on any failure). Input errors (400/413)
 * and rate limiting (429) are plain JSON with a non-2xx status.
 */
export async function POST(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  if (isRateLimited(ip)) {
    return Response.json(
      { error: "Too many requests. Please wait a moment." },
      { status: 429 }
    );
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // No key configured: return a safe fallback rather than crashing the UI.
    return finalOnly(getFallbackDecode());
  }

  let sourceText = "";
  const content: Anthropic.ContentBlockParam[] = [];

  try {
    const body = await request.json();
    const mode = body?.mode === "image" ? "image" : "text";

    if (mode === "image") {
      const image = body?.image;
      const mediaType = image?.mediaType;
      const dataBase64 = image?.dataBase64;
      if (
        typeof dataBase64 !== "string" ||
        !ALLOWED_MEDIA.has(mediaType) ||
        !dataBase64
      ) {
        return Response.json(
          { error: "Unsupported or missing image." },
          { status: 400 }
        );
      }
      // Rough byte estimate from base64 length.
      if ((dataBase64.length * 3) / 4 > MAX_IMAGE_BYTES) {
        return Response.json(
          { error: "Image too large. Please use one under 5 MB." },
          { status: 413 }
        );
      }
      const note = sanitizeText(body?.text);
      content.push({
        type: "image",
        source: { type: "base64", media_type: mediaType, data: dataBase64 },
      });
      content.push({
        type: "text",
        text: note
          ? `Decode this screenshot for me. I do not understand it and it is making me anxious. For context: ${note}`
          : "Decode this screenshot for me. I do not understand it and it is making me anxious.",
      });
      // Include the note in the source text so the scam clamp can see it too.
      sourceText = note ? `[screenshot] ${note}` : "[screenshot]";
    } else {
      sourceText = sanitizeText(body?.text);
      if (!sourceText) {
        return Response.json(
          { error: "Please paste something to decode." },
          { status: 400 }
        );
      }
      content.push({ type: "text", text: sourceText });
    }
  } catch (err) {
    console.error("decode error:", err);
    return finalOnly(getFallbackDecode());
  }

  const client = new Anthropic({ apiKey });
  let modelStream: ReturnType<typeof client.messages.stream> | null = null;
  let clientGone = false;

  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      let open = true;
      const send = (event: DecodeStreamEvent) => {
        if (!open) return;
        try {
          controller.enqueue(encoder.encode(eventLine(event)));
        } catch {
          open = false; // client went away
        }
      };

      let final: DecodeResult = getFallbackDecode();

      try {
        const stream = client.messages.stream({
          model: MODEL,
          // Generous headroom: a full decode (verbose plainLanguage + analogy +
          // 6-7 jargon defs + considerations) can run ~1.5k tokens, and
          // content-rich screenshots push higher. 2000 truncated mid-JSON and
          // dropped the later fields (jargon, nextStep, topic). 4096 leaves
          // comfortable room.
          max_tokens: 4096,
          system: SYSTEM_PROMPT,
          tools: [
            {
              name: "decode",
              description:
                "Return the calm, plain-language decode of the student's input.",
              input_schema: DECODE_TOOL_SCHEMA,
              // strict: true enforces the schema's `required` fields, so the
              // model can never omit jargon/nextStep/topic (it intermittently
              // did without).
              strict: true,
              // Stream the tool input as it is generated instead of in one
              // burst at the end. The API no longer validates it for us, so
              // the finished input still goes through normalizeResult.
              eager_input_streaming: true,
            },
          ],
          tool_choice: { type: "tool", name: "decode" },
          messages: [{ role: "user", content }],
        });
        modelStream = stream;

        let toolIndex = -1;
        let json = "";
        let lastSentAt = 0;
        let lastPayload = "";

        for await (const event of stream) {
          if (
            event.type === "content_block_start" &&
            event.content_block.type === "tool_use" &&
            event.content_block.name === "decode"
          ) {
            toolIndex = event.index;
            continue;
          }
          if (
            event.type !== "content_block_delta" ||
            event.index !== toolIndex ||
            event.delta.type !== "input_json_delta"
          ) {
            continue;
          }

          json += event.delta.partial_json;
          const now = Date.now();
          if (now - lastSentAt < PARTIAL_THROTTLE_MS) continue;

          const data = buildPartial(parsePartialObject(json), sourceText);
          if (Object.keys(data).length === 0) continue;
          const payload = JSON.stringify(data);
          if (payload === lastPayload) continue;

          lastPayload = payload;
          lastSentAt = now;
          send({ type: "partial", data });
        }

        const message = await stream.finalMessage();

        if (message.stop_reason === "max_tokens") {
          // The tool JSON was cut off, so later fields are missing and would
          // fall back to placeholders. Surface it rather than silently
          // degrading.
          console.warn("decode: response hit max_tokens, output may be truncated");
        }

        const toolUse = message.content.find((b) => b.type === "tool_use");
        if (message.stop_reason === "refusal") {
          // A refusal can cut the tool input off mid-way; do not trust it.
          console.warn("decode: model refused, serving fallback");
        } else if (toolUse && toolUse.type === "tool_use") {
          final = normalizeResult(toolUse.input, sourceText);
        }
      } catch (err) {
        // A client disconnect aborts the model stream; that is not an error.
        if (!clientGone) console.error("decode error:", err);
      }

      send({ type: "final", data: final });
      if (open) {
        open = false;
        try {
          controller.close();
        } catch {
          // already closed
        }
      }
    },
    cancel() {
      // The browser disconnected: stop paying for tokens nobody will read.
      clientGone = true;
      modelStream?.abort();
    },
  });

  return new Response(body, { status: 200, headers: NDJSON_HEADERS });
}
