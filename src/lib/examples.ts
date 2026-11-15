// Cense Decode.

/**
 * Things to try. These are documents, not questions, on purpose: the whole
 * idea of Decode is that someone who is confused usually cannot phrase the
 * question, so the input is the thing itself. Each one is written the way the
 * real notice reads, with no real company named.
 */
export interface Example {
  label: string;
  text: string;
}

export const EXAMPLES: Example[] = [
  {
    label: "A credit card offer",
    text: "0% intro APR on purchases for 15 months. After that, a variable APR of 19.24% to 29.24% applies based on your creditworthiness. 3% balance transfer fee. No annual fee. Earn a $200 bonus after you spend $500 in the first 3 months.",
  },
  {
    label: "A past-due notice",
    text: "Your account is 32 days past due. A late fee of $39.00 has been assessed. Minimum payment due: $74.00. If we do not receive payment, a penalty APR of up to 29.99% may be applied to your account.",
  },
  {
    label: "“No interest if paid in full”",
    text: "No interest if paid in full within 12 months. Interest will be charged to your account from the purchase date if the purchase balance is not paid in full within 12 months. Minimum monthly payments required.",
  },
  {
    label: "A text that feels off",
    text: "ALERT: Your bank account has been suspended due to unusual activity. Verify your identity within 24 hours at secure-account-verify.example or your funds will be frozen.",
  },
  {
    label: "A word I keep seeing",
    text: "What does 'unsubsidized' mean on my student loan?",
  },
];
