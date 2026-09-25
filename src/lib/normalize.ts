import type {
  DecodeResult,
  JargonTerm,
  PartialDecode,
  Topic,
  WorryLevel,
  WorryRead,
} from "@/types";
import type { PartialObject } from "./partialJson";
import { getFallbackDecode } from "./fallback";
import { ROUTE_TARGETS, TOPIC_TO_ROUTE } from "./routes";

// Cues that should never be served as "green". Belt-and-suspenders on top of
// the system prompt's red-flag override.
export const SCAM_PATTERNS =
  /\b(urgent|immediately|verify your account|claim your refund|wire|gift card|suspended|act now|final notice|wire transfer|routing number|social security|password|crypto|guaranteed returns?)\b/i;

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
 * Validate the model's worry read and apply the scam clamp: an out-of-enum
 * level becomes yellow, and scam wording in the source can never be "green".
 * This is the only place a worry level is produced for the client, for both
 * streamed partials and the final result.
 */
export function normalizeWorry(raw: unknown, sourceText: string): WorryRead {
  const w = (raw && typeof raw === "object" ? raw : {}) as Partial<WorryRead>;

  const rawLevel = String(w.level ?? "").toLowerCase() as WorryLevel;
  let level: WorryLevel = VALID_LEVELS.includes(rawLevel) ? rawLevel : "yellow";
  const basedOn = Array.isArray(w.basedOn) ? [...w.basedOn] : [];

  // Scam clamp: never serve scammy wording as "green".
  if (SCAM_PATTERNS.test(sourceText) && level === "green") {
    level = "yellow";
    basedOn.push(
      "Contains wording often seen in scams or urgent money requests."
    );
  }

  return {
    level,
    headline: w.headline || DEFAULT_HEADLINES[level],
    basedOn,
  };
}

/**
 * Normalize the model output into a guaranteed-valid DecodeResult shape so the
 * UI can never crash on a missing field or an out-of-enum worry level, then
 * apply the scam clamp (never downgrade worry; force at least yellow on scam
 * wording).
 */
export function normalizeResult(raw: unknown, sourceText: string): DecodeResult {
  const r = (raw ?? {}) as Partial<DecodeResult>;
  const fallback = getFallbackDecode();

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
    worry: normalizeWorry(r.worry, sourceText),
    jargon: Array.isArray(r.jargon) ? r.jargon : [],
    nextStep: r.nextStep || fallback.nextStep,
    considerations: considerations.length > 0 ? considerations : undefined,
    goDeeper,
    disclaimer: r.disclaimer || fallback.disclaimer,
  };
}

/**
 * Build the client-safe view of a tool input that is still streaming.
 *
 * Text fields are passed through as they grow. The worry read is withheld
 * until its object has fully closed in the stream, and then goes through the
 * same normalizeWorry (and scam clamp) as the final result, so a half-written
 * or unclamped level can never reach the user. topic, goDeeper and disclaimer
 * are never included; they arrive with the final event.
 */
export function buildPartial(src: PartialObject, sourceText: string): PartialDecode {
  const v = src.value;
  const out: PartialDecode = {};

  if (typeof v.plainLanguage === "string") out.plainLanguage = v.plainLanguage;
  if (typeof v.analogy === "string") out.analogy = v.analogy;

  if (src.complete.has("worry")) {
    out.worry = normalizeWorry(v.worry, sourceText);
  }

  if (Array.isArray(v.jargon)) {
    const items: JargonTerm[] = [];
    for (const j of v.jargon) {
      if (!j || typeof j !== "object") continue;
      const { term, definition } = j as Partial<JargonTerm>;
      if (typeof term !== "string" || !term.trim()) continue;
      items.push({ term, definition: typeof definition === "string" ? definition : "" });
    }
    // An empty list only counts once it is closed; "[" alone means "coming".
    if (items.length > 0 || src.complete.has("jargon")) out.jargon = items;
  }

  if (typeof v.nextStep === "string") out.nextStep = v.nextStep;

  if (Array.isArray(v.considerations)) {
    const items = v.considerations
      .filter((c): c is string => typeof c === "string" && c.trim() !== "")
      .slice(0, 3);
    if (items.length > 0 || src.complete.has("considerations")) {
      out.considerations = items;
    }
  }

  return out;
}
