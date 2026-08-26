import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT, DECODE_TOOL_SCHEMA } from "@/lib/prompt";
import { getFallbackDecode } from "@/lib/fallback";
import { DecodeResult, WorryLevel, Topic } from "@/types";
import { ROUTE_TARGETS, TOPIC_TO_ROUTE } from "@/lib/routes";

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60_000;

const MODEL = process.env.DECODE_MODEL || "claude-opus-4-8";
const MAX_TEXT_CHARS = 4000;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // ~5 MB decoded
const ALLOWED_MEDIA = new Set(["image/png", "image/jpeg", "image/webp"]);

// Cues that should never be served as "green". Belt-and-suspenders on top of
// the system prompt's red-flag override.
const SCAM_PATTERNS =
  /\b(urgent|immediately|verify your account|claim your refund|wire|gift card|suspended|act now|final notice|wire transfer|routing number|social security|password|crypto|guaranteed returns?)\b/i;

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

const VALID_LEVELS: WorryLevel[] = ["green", "yellow", "red"];

// Neutral, level-appropriate headlines used only when the model omits one.
// (The fallback's "we could not analyze this" text is for total failures and
// must never leak onto a result that was actually analyzed.)
const DEFAULT_HEADLINES: Record<WorryLevel, string> = {
  green: "There is nothing here you need to act on right now.",
  yellow: "Worth understanding, but nothing here is urgent.",
  red: "Slow down and verify this before doing anything.",
};

/**
 * Normalize the model output into a guaranteed-valid DecodeResult shape so the
 * UI can never crash on a missing field or an out-of-enum worry level, then
 * apply the scam clamp (never downgrade worry; force at least yellow on scam
 * wording).
 */
function normalizeResult(raw: unknown, sourceText: string): DecodeResult {
  const r = (raw ?? {}) as Partial<DecodeResult>;
  const fallback = getFallbackDecode();

  const rawLevel = String(r.worry?.level ?? "").toLowerCase() as WorryLevel;
  let level: WorryLevel = VALID_LEVELS.includes(rawLevel) ? rawLevel : "yellow";
  const basedOn = Array.isArray(r.worry?.basedOn) ? r.worry!.basedOn : [];

  // Scam clamp: never serve scammy wording as "green".
  if (SCAM_PATTERNS.test(sourceText) && level === "green") {
    level = "yellow";
    basedOn.push(
      "Contains wording often seen in scams or urgent money requests."
    );
  }

  const considerations = Array.isArray(r.considerations)
    ? r.considerations.filter((c) => typeof c === "string" && c.trim()).slice(0, 3)
    : [];

  // Derive the deeper-tool suggestion deterministically from the model's topic
  // classification (a required enum, far more reliable than an optional object).
  const topic = (r as { topic?: Topic }).topic;
  const route = topic ? TOPIC_TO_ROUTE[topic] : null;
  const goDeeper = route
    ? { route, label: ROUTE_TARGETS[route].defaultLabel }
    : undefined;

  return {
    plainLanguage: r.plainLanguage || fallback.plainLanguage,
    analogy: r.analogy || fallback.analogy,
    worry: {
      level,
      headline: r.worry?.headline || DEFAULT_HEADLINES[level],
      basedOn,
    },
    jargon: Array.isArray(r.jargon) ? r.jargon : [],
    nextStep: r.nextStep || fallback.nextStep,
    considerations: considerations.length > 0 ? considerations : undefined,
    goDeeper,
    disclaimer: r.disclaimer || fallback.disclaimer,
  };
}

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
    return Response.json(getFallbackDecode(), { status: 200 });
  }

  let sourceText = "";

  try {
    const body = await request.json();
    const mode = body?.mode === "image" ? "image" : "text";

    const content: Anthropic.ContentBlockParam[] = [];

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

    const client = new Anthropic({ apiKey });

    const response = await client.messages.create({
      model: MODEL,
      // Generous headroom: a full decode (verbose plainLanguage + analogy +
      // 6-7 jargon defs + considerations) can run ~1.5k tokens, and content-rich
      // screenshots push higher. 2000 truncated mid-JSON and dropped the later
      // fields (jargon, nextStep, topic). 4096 leaves comfortable room.
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools: [
        {
          name: "decode",
          description:
            "Return the calm, plain-language decode of the student's input.",
          input_schema: DECODE_TOOL_SCHEMA,
          // strict: true enforces the schema's `required` fields, so the model
          // can never omit jargon/nextStep/topic (it intermittently did without).
          strict: true,
        },
      ],
      tool_choice: { type: "tool", name: "decode" },
      messages: [{ role: "user", content }],
    });

    if (response.stop_reason === "max_tokens") {
      // The tool JSON was cut off, so later fields are missing and would fall
      // back to placeholders. Surface it rather than silently degrading.
      console.warn("decode: response hit max_tokens, output may be truncated");
    }

    const toolUse = response.content.find((b) => b.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") {
      return Response.json(getFallbackDecode(), { status: 200 });
    }

    const result = normalizeResult(toolUse.input, sourceText);
    return Response.json(result, { status: 200 });
  } catch (err) {
    console.error("decode error:", err);
    return Response.json(getFallbackDecode(), { status: 200 });
  }
}
