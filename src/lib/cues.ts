// Cense Decode.

/**
 * Wording that means a decode must never come back calm.
 *
 * The system prompt already tells the model to call these red. This is the
 * check on the model: if it calls something green anyway, the server lifts it.
 * The lists follow how regulators describe the signs, not a guess at them:
 *
 * - FTC, phishing: https://consumer.ftc.gov/articles/how-recognize-and-avoid-phishing-scams
 * - FTC, gift cards: https://consumer.ftc.gov/articles/avoiding-and-reporting-gift-card-scams
 * - FTC, wires, payment apps and crypto: https://consumer.ftc.gov/articles/how-avoid-scam
 * - Federal Student Aid, never pay for help: https://studentaid.gov/resources/scams
 *
 * Patterns match word stems on purpose ("gift cards", "cryptocurrency",
 * "wired"). Scam wording reads Higher whatever the model said (see
 * normalize.ts), so a false alarm costs a "Higher"; a miss can cost the
 * student real money. Pressure words that ordinary notices also use
 * ("immediately", "right away") are urgency, not scam, so a loan explanation
 * that says interest starts immediately is not called a scam.
 */
const SCAM = [
  String.raw`gift ?cards?`,
  String.raw`wir(?:e|ed|es|ing)`,
  String.raw`wire transfers?`,
  String.raw`crypto\w*`,
  String.raw`bitcoin|ethereum|usdt|tether`,
  String.raw`zelle|venmo|cash ?app|western union|moneygram`,
  String.raw`verify (?:your )?(?:account|identity|information|details|payment)`,
  String.raw`confirm (?:your )?(?:account|identity|log-?in|password|details|information|payment)`,
  String.raw`(?:suspicious|unusual) (?:activity|log-?ins?|sign-?ins?)`,
  String.raw`routing number|social security|ssn|passwords?|pin|one-?time (?:pass)?code|verification code`,
  String.raw`claim\b[^.\n]{0,40}\b(?:refund|prize|reward|money|funds|payment)`,
  String.raw`guaranteed (?:returns?|profits?|income)`,
  String.raw`(?:upfront|up-front|processing|release|activation|unlock) fees?`,
  String.raw`suspend\w*|frozen|freez\w*|locked out|(?:account|card) (?:is |has been |will be )?locked`,
];

/** Wording that means money is at stake soon: a late payment, a fee, a clock. */
const URGENCY = [
  String.raw`past due|overdue|late (?:fees?|payments?|charges?)|penalty`,
  String.raw`collections?|final notice|last notice|deadline`,
  String.raw`due (?:today|tomorrow|now|immediately)`,
  String.raw`within \d+ (?:hours?|days?)|in \d+ hours?`,
  String.raw`expires? (?:today|soon|in)|before it expires`,
  String.raw`act now|urgent(?:ly)?|immediately|right away`,
];

const whole = (parts: string[]) =>
  new RegExp(`(?<![\\p{L}\\p{N}])(?:${parts.join("|")})(?![\\p{L}\\p{N}])`, "iu");

const SCAM_RE = whole(SCAM);
const URGENCY_RE = whole(URGENCY);
/** Paid help with loan forgiveness: both halves anywhere in the text. */
const FORGIVENESS_RE = /\b(?:forgiv\w*|discharg\w*|cancel\w* (?:your |my )?(?:student )?loans?)/i;
const FEE_RE = /\bfees?\b/i;
/** Words only the model's own explanation uses when it has seen a scam. */
const MODEL_SAYS_SCAM_RE = /\b(?:scam\w*|phishing|impersonat\w*|fraudster\w*)\b/i;

/** "This is not a scam" and the like, so a model that rules a scam out is not read as calling one. */
const RULED_OUT_RE =
  /\b(?:not|isn't|is not|no|no signs? of|nothing suggests|does ?n[o']t look like|does not look like)\s+(?:an?\s+|like\s+an?\s+)?(?:scam\w*|phishing|fraud\w*)/gi;

export type Cue = "scam" | "urgency";

const NEGATION_RE = /\b(?:no|not|nothing|never|none|neither|nor|without|unlikely|doesn'?t appear|does not appear|doesn'?t|does not|don'?t|do not|isn'?t|is not|won'?t|will not)\b/i;

/** The text with every sentence or list item that contains a negation removed. */
function withoutNegatedSentences(text: string): string {
  return text
    .split(/(?<=[.!?])\s+|\n+|","|\["|"\]/)
    .filter(part => !NEGATION_RE.test(part))
    .join(" ");
}

/** Which kinds of cue a piece of text carries, scam first. */
export function cuesIn(text: string, { fromModel = false } = {}): Cue[] {
  if (!text) return [];
  const found: Cue[] = [];
  // The model often reassures by naming what is absent ("Nothing here asks you to wire money or use a gift
  // card"). Seen live on Opus 5.5, 2026-11-15: that sentence lifted an ordinary electric bill to Higher. So in
  // the model's own words, sentences that negate are dropped before any list is checked. The same goes for
  // "Nothing says the account is past due or in collections" (urgency) and "This does not appear to be a
  // scam" (the model's own scam words), both seen live the same day.
  const own = fromModel ? withoutNegatedSentences(text) : text;
  if (
    SCAM_RE.test(own) ||
    (FORGIVENESS_RE.test(own) && FEE_RE.test(own)) ||
    (fromModel && MODEL_SAYS_SCAM_RE.test(own.replace(RULED_OUT_RE, "")))
  ) {
    found.push("scam");
  }
  if (URGENCY_RE.test(own)) found.push("urgency");
  return found;
}
