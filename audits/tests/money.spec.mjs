// Money and claims: the urgency read a student acts on, results that are not complete, the model's
// instructions, and where "go deeper" sends a student (MONEY-01 to MONEY-05 in audits/REPORT.md).
//
// The scam and urgency oracle below is written from the regulators' own descriptions, not from the app's pattern
// list, and each message is phrased the way the real thing reads:
//   FTC, phishing: https://consumer.ftc.gov/articles/how-recognize-and-avoid-phishing-scams
//   FTC, gift cards: https://consumer.ftc.gov/articles/avoiding-and-reporting-gift-card-scams
//   FTC, payment apps and crypto: https://consumer.ftc.gov/articles/how-avoid-scam
//   Federal Student Aid, never pay for help: https://studentaid.gov/resources/scams
//   CFPB, late fees and collections: https://www.consumerfinance.gov/ask-cfpb/what-is-a-late-fee-en-2073/
// The stand-in API is told to call every one of them green, the worst case for a model. The server must never
// let that through as calm.
import { readFileSync } from 'node:fs';
import { test, expect, needsMock, decodeText, urgencyWord, urgencyHeadline, postDecode, finalOf } from './helpers.mjs';

const MODEL_GREEN_HEADLINE = 'Nothing here to act on, you can relax.';

// Scam wording, as the FTC and Federal Student Aid describe the signs. Ben's call, 2026-11-15: these read Higher
// whatever the model said, with the verify-first step and no other tool offered.
const SCAM = [
  ['gift cards, plural', 'To release your tax refund, buy two $100 gift cards and text me the codes on the back.'],
  ['a payment app', 'Send the $400 deposit by Zelle today to hold the apartment. Other students are interested.'],
  ['crypto by name', 'Pay the $150 processing fee in Bitcoin to unlock your account.'],
  ['suspicious activity and a login link', 'We noticed suspicious activity on your account. Confirm your login details at the link below.'],
  ['a freeze threat with a clock', 'Your card will be frozen in 24 hours unless you call 1-800-555-0100.'],
  ['paid help with loan forgiveness', 'Pay a one-time $299 fee and our team will get your student loans forgiven in 30 days.'],
  ['a refund to claim', 'Click here to claim your $500 government refund before it expires.'],
  ['a wire request', 'Wire the remaining tuition balance to the account below by Friday.'],
];

// Money at stake soon, from a real lender or collector as often as a scammer (CFPB). Never Low; Moderate is enough.
const URGENCY = [
  ['a late payment and a fee', 'Your payment is 30 days past due and a $35 late fee has been charged to your account.'],
  ['a final notice', 'FINAL NOTICE: your balance will be sent to collections.'],
];

// The verify-first step the prompt gives the model for red, written out here rather than imported.
const VERIFY_STEP = 'Do not act on this yet. Verify it directly with your bank or the real company before doing anything.';

for (const [name, text] of SCAM) {
  for (const [said, marker] of [['Low', 'green'], ['Moderate', 'ok']]) {
    test(`MONEY-06 scam wording reads Higher when the model said ${said}: ${name}`, async ({ page }) => {
      needsMock();
      await decodeText(page, `${text} [[mock:${marker}]]`);
      expect(await urgencyWord(page)).toBe('Higher');
      expect(await urgencyHeadline(page)).not.toBe(MODEL_GREEN_HEADLINE);
      await expect(page.getByText(VERIFY_STEP)).toBeVisible();
      await expect(page.getByRole('link', { name: /another free cense tool/i })).toHaveCount(0);
    });
  }
}

for (const [name, text] of URGENCY) {
  test(`MONEY-01 urgency wording never comes back calm: ${name}`, async ({ page }) => {
    needsMock();
    await decodeText(page, `${text} [[mock:green]]`);
    expect(await urgencyWord(page)).not.toBe('Low');
    // Lifting the level is not enough if the headline still says relax.
    expect(await urgencyHeadline(page)).not.toBe(MODEL_GREEN_HEADLINE);
  });
}

test('MONEY-06 a model that rules a scam out is not read as calling one: a card offer "not a scam" stays Moderate', async ({ page }) => {
  needsMock();
  await decodeText(page, 'Get 3% cash back on dining with no annual fee. [[mock:yellow-not-a-scam]]');
  expect(await urgencyWord(page)).toBe('Moderate');
});

test('MONEY-06 "immediately" in an ordinary explanation is not scam wording', async ({ page }) => {
  needsMock();
  // Direct Unsubsidized Loans: interest accrues from disbursement (studentaid.gov). A Moderate read stays Moderate.
  await decodeText(page, 'Interest on this unsubsidized loan begins to accrue immediately after disbursement. [[mock:ok]]');
  expect(await urgencyWord(page)).toBe('Moderate');
});

test('MONEY-06 a screenshot the model explains as a gift card demand reads Higher, with the verify-first step', async ({ request }) => {
  needsMock();
  const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
  const res = await postDecode(request, {
    mode: 'image',
    image: { mediaType: 'image/png', dataBase64: png },
    text: '[[mock:green-explains-gift-cards]]',
  });
  const final = finalOf(await res.text());
  expect(final.failure).toBeUndefined();
  expect(final.worry.level).toBe('red');
  expect(final.nextStep).toBe(VERIFY_STEP);
  expect(final.goDeeper).toBeUndefined();
});

test('MONEY-06 a model that reassures by naming what is absent ("nothing asks you to wire money or use a gift card") stays calm', async ({ page }) => {
  needsMock();
  // Seen live on Opus 5.5, 2026-11-15: this sentence lifted an ordinary electric bill to Higher.
  await decodeText(page, 'Eversource electric bill. Amount due $86.42 by Nov 24. Payment received $79.10, thank you. [[mock:green-reassures-absent]]');
  expect(await urgencyWord(page)).toBe('Low');
});

test('the clamp does not fire on ordinary words: a plain question the model calls calm stays calm', async ({ page }) => {
  needsMock();
  await decodeText(page, 'What does APR stand for on a credit card statement? [[mock:green]]');
  expect(await urgencyWord(page)).toBe('Low');
});

test('MONEY-02 a decode cut off at the token cap is shown as a failure, not as a finished result', async ({ page }) => {
  needsMock();
  await decodeText(page, 'A short bill. [[mock:max-tokens]]');
  await expect(page.getByRole('button', { name: /try again/i })).toBeVisible();
  await expect(page.getByText(/could not read that/i)).toBeVisible();
});

test('MONEY-02 a cut inside the urgency read never shows an urgency level nobody wrote', async ({ request }) => {
  needsMock();
  const final = finalOf(await (await postDecode(request, { text: 'A short bill. [[mock:max-tokens-early]]' })).text());
  expect(final.failure).toBe('unavailable');
});

test('a refusal partway through is shown as a failure', async ({ page }) => {
  needsMock();
  await decodeText(page, 'A short bill. [[mock:refusal]]');
  await expect(page.getByRole('button', { name: /try again/i })).toBeVisible();
});

// The model's instructions. Read as text: these check what the prompt says, not what the app computes.
const prompt = readFileSync(new URL('../../src/lib/prompt.ts', import.meta.url), 'utf8');

test('MONEY-03 the prompt tells the model not to state rates, limits or plan rules from memory', async () => {
  expect(prompt).toMatch(/only (the )?numbers?[^.]*(in|from) the input/i);
  expect(prompt).toMatch(/studentaid\.gov/i);
});

test('MONEY-03 the prompt\'s examples carry no interest rate the model could copy onto someone else\'s offer', async () => {
  expect(prompt).not.toMatch(/\b\d{1,2} to \d{1,2} percent\b/i);
});

test('MONEY-04 the calibration examples do not forecast the market or call a step certain', async () => {
  expect(prompt).not.toMatch(/not a sign of a storm/i);
  expect(prompt).not.toMatch(/begin with one broad ETF/i);
});

// Where "go deeper" sends a student, per topic. The expected addresses are the live Cense tools as listed in the
// audit brief, checked by page title on 2026-11-15, not read from src/lib/routes.ts.
const DEEPER = [
  ['investing', 'https://invest-ready.vercel.app'],
  ['job-offer', 'https://offer-lab-ivory.vercel.app'],
  ['student-loan', 'https://cense-loan-desk.vercel.app'],
  ['credit-card', 'https://cense.vercel.app'],
  ['purchase-decision', 'https://worth-it-omega.vercel.app'],
];

for (const [topic, url] of DEEPER) {
  test(`go deeper for ${topic} opens ${url}`, async ({ page }) => {
    needsMock();
    await decodeText(page, `Something about money. [[topic:${topic}]]`);
    const link = page.getByRole('link', { name: /another free cense tool/i });
    await expect(link).toHaveAttribute('href', new RegExp(`^${url.replace(/\./g, '\\.')}/?\\?`));
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', /noopener/);
  });
}

test('MONEY-05 a red result offers no other tool: a past-due notice never suggests a new credit card', async ({ page }) => {
  needsMock();
  // The live model, 2026-11-15, read the past-due example as red with topic credit-card, and the page offered
  // "Find the credit card that fits you" under "pay at least the minimum today".
  await decodeText(page, 'Your account is 32 days past due. A late fee of $39.00 has been assessed. [[mock:red]]');
  expect(await urgencyWord(page)).toBe('Higher');
  await expect(page.getByRole('link', { name: /another free cense tool/i })).toHaveCount(0);
});

for (const topic of ['general-finance', 'none']) {
  test(`no go-deeper link is shown for ${topic}`, async ({ page }) => {
    needsMock();
    await decodeText(page, `Something about money. [[topic:${topic}]]`);
    await expect(page.getByRole('link', { name: /another free cense tool/i })).toHaveCount(0);
  });
}

test('MONEY-21 the prompt keeps red for scams and money already at risk, and calls an ordinary bill with a due date yellow', () => {
  // Ben, 2026-11-15: an ordinary electric bill read Higher because the prompt made any deadline or fee red.
  const prompt = readFileSync(new URL('../../src/lib/prompt.ts', import.meta.url), 'utf8');
  expect(prompt).not.toMatch(/has a deadline or fees/);
  expect(prompt).toMatch(/"yellow": worth acting on in time, but routine\. A normal bill with a due date/);
  expect(prompt).toMatch(/"red": money is at risk now, or it may be a scam/);
  expect(prompt).toMatch(/past due, in collections, a final notice/);
  expect(prompt).toMatch(/A due date and a late-fee term on an ordinary bill or statement are not scam signals/);
  // The override still covers the scam signals regulators list.
  for (const cue of ['wire money', 'gift cards', 'verify your account', 'password']) expect(prompt).toContain(cue);
});
