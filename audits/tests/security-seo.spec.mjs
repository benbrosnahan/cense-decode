// Response headers, what the page promises about privacy, dependencies, and what a crawler or a link preview
// gets (SEC-01, SEC-02, SEC-05, SEO-01 in audits/REPORT.md).
import { readFileSync } from 'node:fs';
import { test, expect } from './helpers.mjs';

test('the page has its name, a description and a language', async ({ request }) => {
  const html = await (await request.get('/')).text();
  expect(html).toMatch(/<title>Decode by Cense<\/title>/);
  expect(html).toMatch(/<meta name="description" content="[^"]{50,}"/);
  expect(html).toMatch(/<html lang="en"/);
});

test('SEC-01 the page refuses framing and MIME sniffing, limits where scripts load from, and switches off unused device features', async ({ request }) => {
  const h = (await request.get('/')).headers();
  expect(h['x-content-type-options']).toBe('nosniff');
  expect(h['referrer-policy']).toMatch(/strict-origin|no-referrer/);
  expect(`${h['x-frame-options'] ?? ''} ${h['content-security-policy'] ?? ''}`).toMatch(/DENY|frame-ancestors 'none'/);
  expect(h['permissions-policy'] ?? '').toMatch(/camera=\(\)/);
  expect(h['content-security-policy'] ?? '').toMatch(/default-src 'self'/);
  expect(h['content-security-policy'] ?? '').toMatch(/connect-src 'self'/);
});

test('SEC-01 the API route carries the same headers', async ({ request }) => {
  const h = (await request.post('/api/decode', { data: { text: '' }, failOnStatusCode: false })).headers();
  expect(h['x-content-type-options']).toBe('nosniff');
});

// Anthropic's published terms for API customers, opened 2026-11-15: inputs and outputs are deleted within 30 days
// of receipt (dated July 1, 2026), except that content flagged by its trust and safety systems can be kept up to two
// years; inputs and outputs from commercial products, the API among them, are not used for training by default
// (updated August 18, 2026). Decode sends no feedback and has no opt-in.
// https://privacy.claude.com/en/articles/7996866-how-long-do-you-store-my-organization-s-data and
// https://privacy.claude.com/en/articles/7996868-is-my-data-used-for-model-training
test('SEC-02 the privacy footer matches Anthropic\'s terms: no "never", the 30 days and the safety-review exception named', async ({ page }) => {
  await page.goto('/');
  const footer = (await page.locator('footer').innerText()).replace(/\s+/g, ' ');
  expect(footer).not.toMatch(/never used for (AI )?training/i);
  expect(footer).toMatch(/by default does not train/i);
  expect(footer).toMatch(/within 30 days/i);
  expect(footer).toMatch(/two years if its safety checks flag it/i);
});

test('PRIV-01 before sending, the page says plainly that what is sent goes to Anthropic\'s API, is kept up to 30 days and is not trained on, and links Anthropic\'s terms', async ({ page }) => {
  for (const size of [{ width: 375, height: 812 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(size);
    await page.goto('/');
    const help = page.locator('#source-help');
    const text = (await help.innerText()).replace(/\s+/g, ' ');
    expect(text).toMatch(/goes to Anthropic's API/i);
    expect(text).toMatch(/up to 30 days/i);
    expect(text).toMatch(/by default does not train/i);
    // Flagged content can be kept longer; the note must not promise 30 days flat.
    expect(text).toMatch(/longer only if its safety checks flag it/i);
    const link = help.getByRole('link', { name: /anthropic's data terms/i });
    await expect(link).toHaveAttribute('href', 'https://privacy.claude.com/en/articles/7996866-how-long-do-you-store-my-organization-s-data');
    await expect(link).toHaveAttribute('rel', /noopener/);
    // Seen before sending: the note sits above the Decode it button and is on screen with it.
    const noteBox = await help.boundingBox();
    const buttonBox = await page.getByRole('button', { name: /decode it/i }).boundingBox();
    expect(noteBox.y + noteBox.height).toBeLessThanOrEqual(buttonBox.y);
    await expect(help).toBeInViewport();
  }
});

test('PRIV-01 the header carries no privacy badge', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('header')).not.toContainText(/nothing (saved|stored)/i);
  expect((await page.locator('header').innerText()).replace(/\s+/g, ' ').trim()).toBe('Cense Decode');
});

test('SEC-05 Next.js is on a release with the 2026 security fixes (16.4.6 or later)', async () => {
  const pkg = JSON.parse(readFileSync(new URL('../../node_modules/next/package.json', import.meta.url), 'utf8'));
  const [maj, min, patch] = pkg.version.split(/[.-]/).map(Number);
  expect(maj * 1e6 + min * 1e3 + patch, pkg.version).toBeGreaterThanOrEqual(16 * 1e6 + 4 * 1e3 + 6);
});

test('SEO-01 a shared link has a preview title, description, image and its own canonical address', async ({ request }) => {
  const html = await (await request.get('/')).text();
  expect(html).toMatch(/property="og:title"/);
  expect(html).toMatch(/property="og:description"/);
  expect(html).toMatch(/property="og:image"/);
  expect(html).toMatch(/name="twitter:card"/);
  expect(html).toMatch(/rel="canonical" href="https:\/\/cense-decode\.vercel\.app\/?"/);
});

test('SEO-01 robots.txt and sitemap.xml exist, and robots keeps crawlers off the API', async ({ request }) => {
  const robots = await request.get('/robots.txt');
  expect(robots.status()).toBe(200);
  const text = await robots.text();
  expect(text).toMatch(/sitemap: https:\/\/cense-decode\.vercel\.app\/sitemap\.xml/i);
  expect(text).toMatch(/disallow: \/api\//i);
  expect((await request.get('/sitemap.xml')).status()).toBe(200);
});

test('SEO-01 the server HTML describes the tool as structured data', async ({ request }) => {
  const html = await (await request.get('/')).text();
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m => JSON.parse(m[1]));
  expect(blocks.some(b => /WebApplication/.test(b['@type']) && /Decode/.test(b.name))).toBe(true);
});

test('a reader without JavaScript gets the headline, the input and the privacy note', async ({ request }) => {
  const html = await (await request.get('/')).text();
  expect(html).toMatch(/<h1[\s>]/);
  expect(html).toMatch(/<textarea[^>]*id="source"/);
  expect(html).toMatch(/Anthropic/);
});
