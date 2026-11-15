// The main journeys a student takes, end to end through the real route and the stand-in API: type or pick an
// example, decode, read the result, open a marked term, recover from a failure without losing what was typed.
import { test, expect, needsMock, decodeText, mainText, settled, PHONE } from './helpers.mjs';
import { mockDecode, CARD_DECODE } from '../lib/decode-fixtures.mjs';

test('the input screen loads with a headline, the input and five examples, and the button waits for text', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('/');
  await expect(page.locator('h1')).toBeVisible();
  await expect(page.locator('#source')).toBeVisible();
  await expect(page.getByRole('button', { name: /decode it/i })).toBeDisabled();
  await expect(page.getByRole('button', { name: /credit card offer|past-due|paid in full|feels off|keep seeing/i })).toHaveCount(5);
  await page.locator('#source').fill('x');
  await expect(page.getByRole('button', { name: /decode it/i })).toBeEnabled();
  expect(errors).toEqual([]);
});

test('an example fills the input with a real document, not a question', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /credit card offer/i }).click();
  await expect(page.locator('#source')).toHaveValue(/intro APR/);
});

test('a full decode of the card example shows every block in order, with the terms marked in the student\'s words', async ({ page }) => {
  needsMock();
  await page.goto('/');
  await page.getByRole('button', { name: /credit card offer/i }).click();
  await page.getByRole('button', { name: /decode it/i }).click();
  await settled(page);
  const text = await mainText(page);
  const order = ['How urgent', 'In plain words', 'Do this next', 'Before you decide'].map(s => text.toLowerCase().indexOf(s.toLowerCase()));
  expect(order.every(i => i >= 0)).toBe(true);
  expect([...order].sort((a, b) => a - b)).toEqual(order);
  const terms = page.locator('button.term');
  expect(await terms.count()).toBeGreaterThanOrEqual(4);
  await expect(page.getByRole('link', { name: /another free cense tool/i })).toHaveAttribute('href', /^https:\/\/cense\.vercel\.app/);
});

test('tapping a marked term opens its definition under the text, and tapping again closes it', async ({ page }) => {
  needsMock();
  await page.goto('/');
  await page.getByRole('button', { name: /credit card offer/i }).click();
  await page.getByRole('button', { name: /decode it/i }).click();
  await settled(page);
  const term = page.locator('button.term', { hasText: /^variable APR$/ });
  await term.click();
  await expect(term).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#term-definition')).toContainText(/can move up or down/);
  await term.click();
  await expect(term).toHaveAttribute('aria-pressed', 'false');
});

test('a failed decode shows a failure, and Edit what I sent brings back exactly what was typed', async ({ page }) => {
  await mockDecode(page, null, 'http500');
  await page.goto('/');
  const typed = 'Statement balance $412.18, minimum due $35 by 12/04.';
  await page.locator('#source').fill(typed);
  await page.getByRole('button', { name: /decode it/i }).click();
  await settled(page);
  await expect(page.locator('main [role="alert"]')).toContainText(/could not read that/i);
  await page.getByRole('button', { name: /edit what i sent/i }).click();
  await expect(page.locator('#source')).toHaveValue(typed);
});

test('a rate-limited decode says to wait a minute', async ({ page }) => {
  await mockDecode(page, null, 'http429');
  await decodeText(page, 'Anything at all.');
  await expect(page.locator('main [role="alert"]')).toContainText(/minute/i);
});

test('Start over goes back to an empty input', async ({ page }) => {
  await mockDecode(page, CARD_DECODE);
  await page.setViewportSize(PHONE);
  await decodeText(page, 'Anything at all.');
  await page.getByRole('button', { name: /start over/i }).click();
  await expect(page.locator('#source')).toHaveValue('');
});
