import { RouteKey, Topic } from "@/types";

/** Deterministic topic -> tool route mapping (null = no deeper tool). */
export const TOPIC_TO_ROUTE: Record<Topic, RouteKey | null> = {
  investing: "invest-ready",
  "job-offer": "offer-lab",
  "student-loan": "loan-lab",
  "credit-card": "cc-recommender",
  "purchase-decision": "worth-it",
  "general-finance": "web-app",
  none: null,
};

/**
 * Maps each "go deeper" route to its deployed Cense tool. URLs use the
 * <project>.vercel.app convention — VERIFY/REPLACE each with the real
 * production URL (custom domain etc.). A route with url: null renders no CTA,
 * so the topic is still classified but no broken link appears.
 */
export const ROUTE_TARGETS: Record<
  RouteKey,
  { url: string | null; defaultLabel: string }
> = {
  "invest-ready": {
    url: "https://invest-ready.vercel.app",
    defaultLabel: "See if you're ready to start investing",
  },
  "offer-lab": {
    url: "https://offer-lab.vercel.app",
    defaultLabel: "Compare your job offers side by side",
  },
  "loan-lab": {
    url: "https://loan-lab.vercel.app",
    defaultLabel: "Find your best student loan repayment plan",
  },
  "cc-recommender": {
    // cc-recommender's Vercel project is named "cense".
    url: "https://cense.vercel.app",
    defaultLabel: "Find the credit card that fits you",
  },
  "worth-it": {
    url: "https://worth-it.vercel.app",
    defaultLabel: "Check if this purchase is worth it",
  },
  "web-app": {
    // No Vercel deployment yet (Python/Plaid backend). CTA stays hidden until set.
    url: null,
    defaultLabel: "Get a plan for your money",
  },
};

/** Build the outbound URL with attribution params, or null if not deployed. */
export function routeUrl(route: RouteKey): string | null {
  const target = ROUTE_TARGETS[route];
  if (!target?.url) return null;
  const sep = target.url.includes("?") ? "&" : "?";
  return `${target.url}${sep}utm_source=cense&utm_medium=decode&utm_campaign=money-translator`;
}
