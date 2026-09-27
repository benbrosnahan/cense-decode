import { DecodeResult } from "@/types";

/**
 * Deterministic, conservative result returned when the API call fails for any
 * reason. It never crashes the UI and never falsely reassures: it stays at
 * "yellow" and tells the student to verify with a real person.
 */
export function getFallbackDecode(): DecodeResult {
  return {
    plainLanguage:
      "We could not read this clearly just now. That does not mean anything is wrong with it, only that our explainer had a hiccup.",
    analogy:
      "Think of it like a call that dropped mid sentence. The line, not the message, is the problem.",
    worry: {
      level: "yellow",
      headline: "We could not analyze this, so do not act on it until you do.",
      basedOn: ["The explanation could not be generated this time."],
    },
    jargon: [],
    nextStep:
      "Try again in a moment, and if it still matters, ask the actual app or a person you trust to walk you through it.",
    disclaimer:
      "This is a plain-language explainer, not financial advice. Confirm anything that moves money with your bank or someone you trust before acting.",
    failure: "unavailable",
  };
}

/**
 * Shown when the API rate-limits the request (HTTP 429). Nothing was analyzed,
 * so it stays conservative, but it tells the student exactly what to do.
 */
export function getRateLimitedDecode(): DecodeResult {
  return {
    ...getFallbackDecode(),
    plainLanguage:
      "Lots of decodes came in from your network in the last minute, so we paused for a moment. Nothing is wrong with what you pasted.",
    analogy:
      "Think of it like a busy coffee counter. Your order is fine; the line just needs a minute to clear.",
    worry: {
      level: "yellow",
      headline: "Nothing was analyzed yet, so hold off on acting until you try again.",
      basedOn: ["Too many requests arrived in the last minute."],
    },
    nextStep: "Wait about a minute, then tap Decode again.",
    failure: "rate-limited",
  };
}
