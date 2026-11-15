// The signature element, the student's own words marked up, and the product copy rules (UX-01 in audits/REPORT.md).
import { test, expect, needsMock, decodeText, mainText } from './helpers.mjs';
import { mockDecode, CARD_DECODE, SCAM_DECODE } from '../lib/decode-fixtures.mjs';

test('UX-01 a term the model rewords ("unsubsidized loan") is still marked where the student wrote it', async ({ page }) => {
  needsMock();
  // The same input and the same reworded term came back from the live model on 2026-11-15.
  await decodeText(page, 'What does unsubsidized mean on my student loan? [[mock:terms-reworded]]');
  await expect(page.locator('button.term', { hasText: /^unsubsidized$/i })).toHaveCount(1);
  await expect(page.getByText(/your words, marked up/i)).toBeVisible();
});

test('a decoded term only lights up on a whole word: "APR" is not marked inside "April"', async ({ page }) => {
  await mockDecode(page, { ...CARD_DECODE, jargon: [{ term: 'APR', definition: 'A yearly interest rate.' }] });
  await decodeText(page, 'Your APR changes in April.');
  await expect(page.locator('button.term')).toHaveCount(1);
  await expect(page.locator('button.term')).toHaveText('APR');
});

// Product copy: plain words, no em dashes, no tildes, no emojis. Checked on every screen a student sees.
const BAD = /[\u2014~]|\p{Extended_Pictographic}/u;

test('no screen uses an em dash, a tilde or an emoji', async ({ page }) => {
  await page.goto('/');
  const screens = [await page.locator('body').innerText()];
  await mockDecode(page, CARD_DECODE);
  await decodeText(page, 'Anything at all.');
  await page.getByRole('button', { name: /copy this step/i }).click().catch(() => {});
  screens.push(await page.locator('body').innerText());
  await page.unroute('**/api/decode');
  await mockDecode(page, SCAM_DECODE);
  await page.getByRole('button', { name: /decode something else/i }).click();
  await decodeText(page, 'Anything else.');
  screens.push(await page.locator('body').innerText());
  for (const s of screens) expect(s.match(BAD)?.[0] ?? null).toBeNull();
});

test('the whole explanation copies as plain text with every part a student would send on', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await mockDecode(page, CARD_DECODE);
  await decodeText(page, 'Anything at all.');
  await page.getByRole('button', { name: /copy the whole explanation/i }).click();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toMatch(/How urgent: Moderate/);
  expect(copied).toMatch(/Do this next/);
  expect(copied).toMatch(/not financial advice/);
  expect(copied).not.toMatch(/[\u2014~]/);
  expect(await mainText(page)).toMatch(/not financial advice/);
});
