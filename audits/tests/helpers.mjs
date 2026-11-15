// Shared helpers for the Decode Playwright suite.
//
// Every test gets its own made-up client address (x-forwarded-for), so the route's rate limiter of five decodes a
// minute per address never trips across tests or runs. The route trusts that header only because Vercel
// overwrites it in production (https://vercel.com/docs/headers/request-headers#x-forwarded-for).
import { test as base, expect } from '@playwright/test';

export { expect };

export const PHONE = { width: 375, height: 812 };
export const DESKTOP = { width: 1440, height: 900 };

/** True when the suite runs against its own server, wired to lib/mock-anthropic.mjs. */
export const MOCKED = !process.env.AUDIT_URL;

export const freshIp = () =>
  `198.18.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`;

export const test = base.extend({
  clientIp: async ({}, use) => use(freshIp()),
  page: async ({ page, clientIp }, use) => {
    await page.setExtraHTTPHeaders({ 'x-forwarded-for': clientIp });
    await use(page);
  },
});

/**
 * Marks a test as a known issue from audits/REPORT.md. The test asserts the fixed behaviour, so today it fails
 * and Playwright counts that as expected. Once the issue is fixed, Playwright reports "expected to fail, but
 * passed": delete the knownIssue() call and mark the issue fixed. AUDIT_SHOW_KNOWN=1 runs known issues as
 * ordinary tests, which shows the real failure message.
 */
export function knownIssue(id) {
  test.info().annotations.push({ type: 'issue', description: id });
  test.fail(!process.env.AUDIT_SHOW_KNOWN, `Known issue ${id}: see audits/REPORT.md`);
}

/** Skips a test that needs the stand-in API when the suite points at a real deployment. */
export function needsMock() {
  test.skip(!MOCKED, 'needs the stand-in Anthropic API (lib/mock-anthropic.mjs)');
}

/** POSTs to /api/decode the way the page does, from a fresh address unless one is given. */
export function postDecode(request, data, { ip = freshIp(), headers = {} } = {}) {
  return request.post('/api/decode', {
    data,
    headers: { 'x-forwarded-for': ip, ...headers },
    failOnStatusCode: false,
  });
}

/** Parses an NDJSON decode response into its events. */
export function events(body) {
  return body.split('\n').filter(l => l.trim()).map(l => JSON.parse(l));
}

/** The final event's data from a decode response body. */
export function finalOf(body) {
  return events(body).find(e => e.type === 'final')?.data;
}

/** Types `text` into the input, presses Decode it, and waits until a result or the error screen is showing. */
export async function decodeText(page, text) {
  await page.goto('/');
  await page.locator('#source').fill(text);
  await page.getByRole('button', { name: /decode it/i }).click();
  await settled(page);
}

/** Waits until the decode has finished: the final result's buttons, or the error screen. */
export async function settled(page) {
  await page
    .getByRole('button', { name: /decode something else|try again/i })
    .first()
    .waitFor({ timeout: 15_000 });
}

/** Everything on screen inside main, whitespace collapsed. */
export async function mainText(page) {
  return (await page.locator('main').innerText()).replace(/\s+/g, ' ').trim();
}

/** The urgency step the results screen shows: Low, Moderate or Higher (null on the error screen). */
export async function urgencyWord(page) {
  const meter = page.locator('[aria-label*="step"][aria-label*="of 3"]').first();
  if (!(await meter.count())) return null;
  return (await meter.getAttribute('aria-label'))?.match(/^(Low|Moderate|Higher)/)?.[1] ?? null;
}

/** The urgency headline under the meter. */
export async function urgencyHeadline(page) {
  const section = page.getByRole('region', { name: /how urgent/i });
  return (await section.locator('p.font-display').first().innerText()).trim();
}
