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
import { cuesIn, type Cue } from "./cues";

const VALID_LEVELS: WorryLevel[] = ["green", "yellow", "red"];

// Neutral, level-appropriate headlines used only when the model omits one.
// (The fallback's "we could not analyze this" text is for total failures and
// must never leak onto a result that was actually analyzed.)
const DEFAULT_HEADLINES: Record<WorryLevel, string> = {
  green: "There is nothing here you need to act on right now.",
  yellow: "Worth understanding, but nothing here is urgent.",
  red: "Slow down and verify this before doing anything.",
};

/** Shown when the server lifts a "green" the model should not have given. */
const LIFTED_HEADLINE =
  "Some of this wording often shows up in scams or urgent money requests. Check it with the real company before you act.";

const LIFT_REASON: Record<Cue, string> = {
  scam: "Contains wording often seen in scams, such as a request for gift cards, a wire, a payment app or your login.",
  urgency: "Mentions a late payment, a fee, a deadline or a short clock.",
};

/** What the model wrote, for checking against the cue lists. */
export interface ModelText {
  plainLanguage?: unknown;
  jargon?: unknown;
}

function modelWords(worry: Partial<WorryRead>, extra: ModelText): string {
  const parts: string[] = [];
  if (typeof extra.plainLanguage === "string") parts.push(extra.plainLanguage);
  if (typeof worry.headline === "string") parts.push(worry.headline);
  if (Array.isArray(worry.basedOn)) {
    for (const b of worry.basedOn) if (typeof b === "string") parts.push(b);
  }
  if (Array.isArray(extra.jargon)) {
    for (const j of extra.jargon) {
      const term = (j as Partial<JargonTerm> | null)?.term;
      if (typeof term === "string") parts.push(term);
    }
  }
  return parts.join("\n");
}

/**
 * Validate the model's worry read and apply the scam and urgency clamp: an
 * out-of-enum level becomes yellow, and a "green" is lifted to yellow when
 * either the student's words or the model's own explanation carry scam or
 * urgency wording. The model's explanation is checked too because for a
 * screenshot the server never sees the words, only what the model says about
 * them. A lifted read gets a headline that does not tell anyone to relax.
 *
 * This is the only place a worry level is produced for the client, for both
 * streamed partials and the final result.
 */
export function normalizeWorry(
  raw: unknown,
  sourceText: string,
  extra: ModelText = {}
): WorryRead {
  const w = (raw && typeof raw === "object" ? raw : {}) as Partial<WorryRead>;

  const rawLevel = String(w.level ?? "").toLowerCase() as WorryLevel;
  const level: WorryLevel = VALID_LEVELS.includes(rawLevel) ? rawLevel : "yellow";
  const basedOn = Array.isArray(w.basedOn)
    ? w.basedOn.filter((b): b is string => typeof b === "string" && b.trim() !== "")
    : [];
  const headline =
    typeof w.headline === "string" && w.headline.trim()
      ? w.headline
      : DEFAULT_HEADLINES[level];

  if (level === "green") {
    const cues = new Set([
      ...cuesIn(sourceText),
      ...cuesIn(modelWords(w, extra), { fromModel: true }),
    ]);
    if (cues.size > 0) {
      return {
        level: "yellow",
        headline: LIFTED_HEADLINE,
        basedOn: [...basedOn, ...[...cues].map((c) => LIFT_REASON[c])],
      };
    }
  }

  return { level, headline, basedOn };
}

const nonEmpty = (v: unknown): v is string => typeof v === "string" && v.trim() !== "";

function cleanJargon(raw: unknown): JargonTerm[] {
  if (!Array.isArray(raw)) return [];
  const out: JargonTerm[] = [];
  for (const j of raw) {
    const { term, definition } = (j ?? {}) as Partial<JargonTerm>;
    if (nonEmpty(term)) out.push({ term, definition: nonEmpty(definition) ? definition : "" });
  }
  return out;
}

/**
 * Turn the model's finished tool input into a DecodeResult, or into the safe
 * fallback when it is not finished.
 *
 * The tool schema is strict, so a complete answer always carries the plain
 * explanation, a valid urgency read and a next step. If any of them is
 * missing, the answer was cut off (the token cap, a refusal, a dropped
 * stream), and a half answer is never dressed up as a whole one: the client
 * shows it as a failure with a retry. Before 2026-11-15 the gaps were filled
 * with placeholder text and a default "nothing here is urgent".
 */
export function normalizeResult(raw: unknown, sourceText: string): DecodeResult {
  const r = (raw ?? {}) as Partial<DecodeResult> & { topic?: Topic };
  const worry = (r.worry ?? {}) as Partial<WorryRead>;

  const complete =
    nonEmpty(r.plainLanguage) &&
    nonEmpty(r.nextStep) &&
    VALID_LEVELS.includes(worry.level as WorryLevel) &&
    nonEmpty(worry.headline);
  if (!complete) return getFallbackDecode();

  const fallback = getFallbackDecode();
  const considerations = Array.isArray(r.considerations)
    ? r.considerations.filter(nonEmpty).slice(0, 3)
    : [];
  const jargon = cleanJargon(r.jargon);

  const read = normalizeWorry(worry, sourceText, { plainLanguage: r.plainLanguage, jargon });

  // Derive the deeper-tool suggestion deterministically from the model's topic
  // classification (a required enum, far more reliable than an optional object).
  // A red read gets none: the one next step is the whole answer, and a past-due
  // notice classed as "credit-card" was being offered a card picker.
  const route =
    r.topic && read.level !== "red" ? TOPIC_TO_ROUTE[r.topic] ?? null : null;
  const goDeeper = route
    ? { route, label: ROUTE_TARGETS[route].defaultLabel }
    : undefined;

  return {
    plainLanguage: r.plainLanguage as string,
    analogy: nonEmpty(r.analogy) ? r.analogy : "",
    worry: read,
    jargon,
    nextStep: r.nextStep as string,
    considerations: considerations.length > 0 ? considerations : undefined,
    goDeeper,
    disclaimer: nonEmpty(r.disclaimer) ? r.disclaimer : fallback.disclaimer,
  };
}

/**
 * Build the client-safe view of a tool input that is still streaming.
 *
 * Text fields are passed through as they grow. The worry read is withheld
 * until its object has fully closed in the stream, and then goes through the
 * same normalizeWorry (and clamp) as the final result, so a half-written or
 * unclamped level can never reach the user. topic, goDeeper and disclaimer
 * are never included; they arrive with the final event.
 */
export function buildPartial(src: PartialObject, sourceText: string): PartialDecode {
  const v = src.value;
  const out: PartialDecode = {};

  if (typeof v.plainLanguage === "string") out.plainLanguage = v.plainLanguage;
  if (typeof v.analogy === "string") out.analogy = v.analogy;

  if (src.complete.has("worry")) {
    out.worry = normalizeWorry(v.worry, sourceText, {
      plainLanguage: v.plainLanguage,
      jargon: v.jargon,
    });
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
