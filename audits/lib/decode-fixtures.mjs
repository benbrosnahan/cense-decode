// Canned decodes for screenshots and browser tests. Each one is shaped exactly like the final event of
// POST /api/decode, and its jargon terms are copied from the matching example input, so the marked-up source
// renders the way it does for a real decode. Nothing here calls a model.

export const CARD_OFFER =
  '0% intro APR on purchases for 15 months. After that, a variable APR of 19.24% to 29.24% applies based on your creditworthiness. 3% balance transfer fee. No annual fee. Earn a $200 bonus after you spend $500 in the first 3 months.';

export const SCAM_TEXT =
  'ALERT: Your bank account has been suspended due to unusual activity. Verify your identity within 24 hours at secure-account-verify.example or your funds will be frozen.';

export const CARD_DECODE = {
  plainLanguage:
    'This card charges no interest on purchases for the first 15 months. After that, anything you have not paid off is charged a yearly rate between 19.24% and 29.24%, set by your credit history. Moving a balance from another card costs 3% of what you move. There is no yearly fee, and you get $200 back if you spend $500 in your first 3 months.',
  analogy:
    'Think of the intro period as a free parking window. Park as long as the sign says and it costs nothing; stay past it and the meter starts on whatever is still parked.',
  worry: {
    level: 'yellow',
    headline: 'A normal card offer. The part to understand is the interest after month 15.',
    basedOn: [
      'Shows a 0% intro APR for 15 months, then 19.24% to 29.24%.',
      'Lists a 3% balance transfer fee.',
      'No deadline or request to send money.',
    ],
  },
  jargon: [
    { term: 'intro APR', definition: 'A lower yearly interest rate that only lasts for the first stretch of time.' },
    { term: 'variable APR', definition: 'A yearly interest rate that can move up or down over time.' },
    { term: 'creditworthiness', definition: 'How likely a lender thinks you are to pay back what you borrow.' },
    { term: 'balance transfer fee', definition: 'A charge for moving debt from another card onto this one.' },
    { term: 'annual fee', definition: 'A yearly charge just for having the card.' },
  ],
  nextStep:
    'Before applying, decide whether you can pay the full balance every month, because the rewards only pay off if you avoid interest after month 15.',
  considerations: [
    'Whether you can reach $500 of spending in 3 months without buying extra things.',
    'Whether you tend to carry a balance, which would make the interest outweigh the bonus.',
  ],
  goDeeper: { route: 'cc-recommender', label: 'Find the credit card that fits you' },
  disclaimer:
    'This is a plain-language explainer, not financial advice. Check the final terms with the card issuer before you apply.',
};

export const SCAM_DECODE = {
  plainLanguage:
    'This message says your bank account is suspended and tells you to verify your identity on a website within 24 hours or your money will be frozen.',
  analogy:
    'It is like a stranger at your door in a uniform you have never seen, saying you must hand over your keys today.',
  worry: {
    level: 'red',
    headline: 'This looks like a scam. Do not click the link or reply.',
    basedOn: [
      'A 24 hour deadline.',
      'Asks you to verify your identity on a website that is not your bank.',
      'Threatens to freeze your money.',
    ],
  },
  jargon: [{ term: 'unusual activity', definition: 'Account actions that do not look like your normal pattern.' }],
  nextStep:
    'Do not act on this yet. Verify it directly with your bank or the real company before doing anything.',
  disclaimer:
    'This is a plain-language explainer, not financial advice. Call the number on the back of your card to check.',
};

/** The NDJSON body /api/decode streams: a few growing partials, then the final event. */
export function ndjson(final) {
  const lines = [];
  const words = final.plainLanguage.split(' ');
  for (let n = 6; n < words.length; n += 12) {
    lines.push({ type: 'partial', data: { plainLanguage: words.slice(0, n).join(' ') } });
  }
  lines.push({ type: 'partial', data: { plainLanguage: final.plainLanguage, analogy: final.analogy, worry: final.worry } });
  lines.push({ type: 'final', data: final });
  return lines.map(l => JSON.stringify(l)).join('\n') + '\n';
}

/** Intercepts /api/decode inside the browser and answers with `final`, or fails the way `mode` says. */
export async function mockDecode(page, final, mode = 'ok') {
  await page.route('**/api/decode', route => {
    if (mode === 'http500') return route.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"x"}' });
    if (mode === 'http429') return route.fulfill({ status: 429, contentType: 'application/json', body: '{"error":"x"}' });
    return route.fulfill({ status: 200, contentType: 'application/x-ndjson; charset=utf-8', body: ndjson(final) });
  });
}
