export type AppView = "input" | "loading" | "results";

export type WorryLevel = "green" | "yellow" | "red";

export interface JargonTerm {
  /** The exact term as it appeared in the input. */
  term: string;
  /** One short, plain-language sentence. No jargon, no extra terms. */
  definition: string;
}

export interface WorryRead {
  level: WorryLevel;
  /** A short, calm headline, e.g. "Nothing here needs action today." */
  headline: string;
  /** The concrete cues the read is grounded in. Shows its work. */
  basedOn: string[];
}

/** Which Cense tool a "go deeper" CTA routes into, chosen by topic. */
export type RouteKey =
  | "invest-ready" // investing: stocks, ETFs, funds, portfolios, diversifying
  | "offer-lab" // job offers / salary / compensation comparison
  | "loan-lab" // student loans / repayment plans
  | "cc-recommender" // choosing or comparing credit cards
  | "worth-it" // deciding whether to buy a specific purchase
  | "web-app"; // general "what should I do with my money" / budgeting

export interface GoDeeper {
  /** CTA label, e.g. "See if you're ready to start investing". */
  label: string;
  route: RouteKey;
}

/** Topic the model classifies the input into; the server maps it to a route. */
export type Topic =
  | "investing"
  | "job-offer"
  | "student-loan"
  | "credit-card"
  | "purchase-decision"
  | "general-finance"
  | "none";

export interface DecodeResult {
  /** "What this actually says" in plain language. */
  plainLanguage: string;
  /** One everyday analogy that makes the concept click. */
  analogy: string;
  worry: WorryRead;
  /** Only terms actually present in the input. */
  jargon: JargonTerm[];
  /** Exactly ONE concrete, definitive, actionable next step. Never "read it again". */
  nextStep: string;
  /**
   * 2-3 short, specific things to weigh, ONLY when the student is evaluating a
   * decision (a card/loan offer, a product). Omitted for pure definitions and scams.
   */
  considerations?: string[];
  /** Present when the topic is investing. */
  goDeeper?: GoDeeper;
  /** Always names who to double-check with. */
  disclaimer: string;
}

/** Request body for POST /api/decode. */
export interface DecodeRequest {
  mode: "text" | "image";
  text?: string;
  image?: {
    mediaType: "image/png" | "image/jpeg" | "image/webp";
    dataBase64: string;
  };
}
