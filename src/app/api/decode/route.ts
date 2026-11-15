import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT, DECODE_TOOL_SCHEMA } from "@/lib/prompt";
import { getFallbackDecode } from "@/lib/fallback";
import { buildPartial, normalizeResult } from "@/lib/normalize";
import { parsePartialObject } from "@/lib/partialJson";
import { RateLimiter } from "@/lib/rateLimit";
import { DecodeResult, DecodeStreamEvent } from "@/types";

export const runtime = "nodejs";
// Decodes typically finish in 10-20s; leave headroom for long screenshots.
export const maxDuration = 60;

// Five decodes a minute per address, per serverless instance. The address is
// safe to key on because Vercel overwrites x-forwarded-for
// (https://vercel.com/docs/headers/request-headers#x-forwarded-for).
const limiter = new RateLimiter({ limit: 5, windowMs: 60_000, maxKeys: 10_000 });

// Claude Opus 5.5. DECODE_MODEL overrides it. Effort is low: the task is
// reading one artifact and explaining it, the server's clamp is the check on
// the urgency read, and a student is watching the answer stream in.
// DECODE_EFFORT overrides it (low, medium, high).
const MODEL = process.env.DECODE_MODEL || "claude-opus-5-5";
const EFFORT = (process.env.DECODE_EFFORT || "low") as "low" | "medium" | "high";
/** Only ask the model a second time if the first answer came back this fast. */
const RETRY_IF_UNDER_MS = 25_000;
const CALL_THE_TOOL =
  "Please give your answer by calling the decode tool. Do not reply in plain text.";

/** Strict tool use needs additionalProperties: false on every object in the schema. */
function closeObjects<T>(schema: T): T {
  if (Array.isArray(schema)) return schema.map(closeObjects) as T;
  if (!schema || typeof schema !== "object") return schema;
  const out: Record<string, unknown> = Object.fromEntries(
    Object.entries(schema).map(([k, v]) => [k, closeObjects(v)])
  );
  if (out.type === "object") out.additionalProperties = false;
  return out as T;
}

const DECODE_TOOL: Anthropic.Tool = {
  name: "decode",
  description: "Return the calm, plain-language decode of the student's input.",
  input_schema: closeObjects(DECODE_TOOL_SCHEMA),
  // strict: true makes the input always match the schema, including its
  // required fields (the model intermittently dropped jargon, nextStep or
  // topic without it).
  strict: true,
  // Stream the tool input as it is generated instead of in one burst at the
  // end. The finished input still goes through normalizeResult.
  eager_input_streaming: true,
};

/** The decode tool call in a finished message, if the model made one. */
function decodeCall(message: Anthropic.Message): Anthropic.ToolUseBlock | null {
  for (const block of message.content) {
    if (block.type === "tool_use" && block.name === "decode") return block;
  }
  return null;
}
const MAX_TEXT_CHARS = 4000;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // ~5 MB decoded
const ALLOWED_MEDIA = new Set(["image/png", "image/jpeg", "image/webp"]);
/** Minimum gap between partial events, so the client is not flooded. */
const PARTIAL_THROTTLE_MS = 80;

// A student's bill or notice is never something a browser or CDN should keep.
const NO_STORE = { "Cache-Control": "no-store" };

const NDJSON_HEADERS = {
  ...NO_STORE,
  "Content-Type": "application/x-ndjson; charset=utf-8",
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

function jsonError(status: number, error: string): Response {
  return Response.json({ error }, { status, headers: NO_STORE });
}

/**
 * True when the request comes from a page on another site. A cross-site form
 * can post text/plain with no CORS preflight, and this route reads any body as
 * JSON, so without this check any page could spend tokens through its
 * visitors' browsers. Browsers send Origin on every POST; a request with no
 * Origin and no Sec-Fetch-Site is not a browser, and the rate limit covers it.
 */
function fromAnotherSite(request: Request): boolean {
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none") return true;
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).host !== request.headers.get("host");
  } catch {
    return true;
  }
}

/** The model finished its answer, rather than being cut off or refusing. */
function finishedNormally(stopReason: string | null): boolean {
  return stopReason === "tool_use" || stopReason === "end_turn";
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
 * DecodeResult (or the safe fallback on any failure, including an answer
 * cut off before it finished). A request from another site (403), input
 * errors (400/413) and rate limiting (429) are plain JSON with a non-2xx
 * status. Every answer is no-store.
 */
export async function POST(request: Request) {
  if (fromAnotherSite(request)) return jsonError(403, "Not allowed.");

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  if (limiter.hit(ip)) {
    return jsonError(429, "Too many requests. Please wait a moment.");
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
        return jsonError(400, "Unsupported or missing image.");
      }
      // Rough byte estimate from base64 length.
      if ((dataBase64.length * 3) / 4 > MAX_IMAGE_BYTES) {
        return jsonError(413, "Image too large. Please use one under 5 MB.");
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
        return jsonError(400, "Please paste something to decode.");
      }
      content.push({ type: "text", text: sourceText });
    }
  } catch {
    return jsonError(400, "Send JSON.");
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // No key configured: return a safe fallback rather than crashing the UI.
    return finalOnly(getFallbackDecode());
  }

  // One retry for an overloaded API, inside the function's 60 seconds.
  const client = new Anthropic({ apiKey, timeout: 45_000, maxRetries: 1 });
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
      const startedAt = Date.now();

      let lastSentAt = 0;
      let lastPayload = "";

      /** One call to the model, streaming the decode tool's input to the browser as it is written. */
      const runOnce = async (messages: Anthropic.MessageParam[]) => {
        const stream = client.messages.stream({
          model: MODEL,
          // A full decode (verbose plainLanguage + analogy + 6-7 jargon defs +
          // considerations) ran ~1.5k tokens on Opus 4.8, and content-rich
          // screenshots push higher. Opus 5.5 counts about a third more tokens
          // for the same text, so 6144 keeps the old headroom.
          max_tokens: 6144,
          system: SYSTEM_PROMPT,
          tools: [DECODE_TOOL],
          // Opus 5.5 rejects a forced tool_choice ("tool" or "any") with a 400.
          // The tool is strict and the system prompt says to always call it;
          // an answer without the call is handled below.
          tool_choice: { type: "auto" },
          // Thinking cannot be switched off on Opus 5.5. between_tools skips
          // thinking before the first (and only) tool call.
          thinking: { type: "between_tools" },
          output_config: { effort: EFFORT },
          messages,
        });
        modelStream = stream;

        let toolIndex = -1;
        let json = "";

        for await (const event of stream) {
          if (
            event.type === "content_block_start" &&
            event.content_block.type === "tool_use" &&
            event.content_block.name === "decode"
          ) {
            toolIndex = event.index;
            json = "";
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

        return stream.finalMessage();
      };

      try {
        const messages: Anthropic.MessageParam[] = [{ role: "user", content }];
        let message = await runOnce(messages);
        let toolUse = decodeCall(message);

        // With tool_choice auto the model can, rarely, answer in plain text
        // instead of calling the tool. Ask once more, if there is time left
        // inside the function's 60 seconds; nothing was streamed yet, so the
        // student sees one answer either way.
        if (
          !toolUse &&
          message.stop_reason === "end_turn" &&
          Date.now() - startedAt < RETRY_IF_UNDER_MS &&
          !clientGone
        ) {
          console.warn("decode: answered without the tool, asking once more");
          messages.push(
            { role: "assistant", content: message.content },
            { role: "user", content: [{ type: "text", text: CALL_THE_TOOL }] }
          );
          message = await runOnce(messages);
          toolUse = decodeCall(message);
        }

        if (!finishedNormally(message.stop_reason)) {
          // Cut off by the token cap, or a refusal: the tool input can stop
          // mid-way, so it is never shown as a finished decode.
          console.warn(`decode: stopped early (${message.stop_reason}), serving the failure`);
        } else if (toolUse) {
          // normalizeResult also returns the failure if a required field is
          // missing, however the answer ended.
          final = normalizeResult(toolUse.input, sourceText);
        } else {
          console.warn("decode: no tool call, serving the failure");
        }
      } catch (err) {
        // A client disconnect aborts the model stream; that is not an error.
        // Only the message is logged; nothing from it reaches the browser.
        if (!clientGone) {
          console.error("decode error:", err instanceof Error ? err.message : err);
        }
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
