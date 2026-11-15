// Cense Decode. Created with Claude Code.

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
 * "wired"). A false alarm costs a "Moderate" instead of a "Low"; a miss can
 * cost the student real money.
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
  String.raw`act now|urgent(?:ly)?|immediately|right away`,
  String.raw`suspend\w*|frozen|freez\w*|locked`,
];

/** Wording that means money is at stake soon: a late payment, a fee, a clock. */
const URGENCY = [
  String.raw`past due|overdue|late (?:fees?|payments?|charges?)|penalty`,
  String.raw`collections?|final notice|last notice|deadline`,
  String.raw`due (?:today|tomorrow|now|immediately)`,
  String.raw`within \d+ (?:hours?|days?)|in \d+ hours?`,
  String.raw`expires? (?:today|soon|in)|before it expires`,
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

export type Cue = "scam" | "urgency";

/** Which kinds of cue a piece of text carries, scam first. */
export function cuesIn(text: string, { fromModel = false } = {}): Cue[] {
  if (!text) return [];
  const found: Cue[] = [];
  if (
    SCAM_RE.test(text) ||
    (FORGIVENESS_RE.test(text) && FEE_RE.test(text)) ||
    (fromModel && MODEL_SAYS_SCAM_RE.test(text))
  ) {
    found.push("scam");
  }
  if (URGENCY_RE.test(text)) found.push("urgency");
  return found;
}
