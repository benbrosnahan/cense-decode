import { readFileSync } from 'node:fs';
// The decode route, /api/decode: who may call it, what it refuses, how it fails, what it lets a cache keep, and
// what reaches the browser (SEC-03, SEC-04 and SEC-06 in audits/REPORT.md). Nothing here reaches a real model.
import { test, expect, needsMock, postDecode, freshIp, events, finalOf } from './helpers.mjs';

test('a decode streams partial events and then exactly one final event', async ({ request }) => {
  needsMock();
  const res = await postDecode(request, { mode: 'text', text: 'A short bill for $40.' });
  expect(res.status()).toBe(200);
  expect(res.headers()['content-type']).toMatch(/application\/x-ndjson/);
  const evs = events(await res.text());
  expect(evs.filter(e => e.type === 'final')).toHaveLength(1);
  expect(evs.at(-1).type).toBe('final');
  expect(evs.some(e => e.type === 'partial')).toBe(true);
});

test('an empty decode is refused with a plain 400', async ({ request }) => {
  const res = await postDecode(request, { mode: 'text', text: '   ' });
  expect(res.status()).toBe(400);
  expect(await res.json()).toEqual({ error: expect.any(String) });
});

test('an image of an unsupported type is refused with a plain 400', async ({ request }) => {
  const res = await postDecode(request, { mode: 'image', image: { mediaType: 'image/svg+xml', dataBase64: 'PHN2Zy8+' } });
  expect(res.status()).toBe(400);
});

test('SEC-03 another site cannot post a decode through a visitor\'s browser', async ({ request }) => {
  const res = await postDecode(request, { mode: 'text', text: 'hello' }, { headers: { origin: 'https://someone-else.example' } });
  expect(res.status()).toBe(403);
});

test('SEC-03 a cross-site text/plain form post, which skips the CORS preflight, is refused', async ({ request }) => {
  const res = await request.post('/api/decode', {
    data: JSON.stringify({ mode: 'text', text: 'hello' }),
    headers: { 'content-type': 'text/plain', origin: 'https://someone-else.example', 'sec-fetch-site': 'cross-site', 'x-forwarded-for': freshIp() },
    failOnStatusCode: false,
  });
  expect(res.status()).toBe(403);
});

test('the page itself can still decode: a same-origin request is accepted', async ({ request, baseURL }) => {
  needsMock();
  const res = await postDecode(request, { mode: 'text', text: 'A short bill for $40.' }, { headers: { origin: new URL(baseURL).origin, 'sec-fetch-site': 'same-origin' } });
  expect(res.status()).toBe(200);
});

test('SEC-04 every answer from the route says no-store, so no cache keeps a student\'s document', async ({ request }) => {
  const bad = await postDecode(request, { mode: 'text', text: '' });
  expect(bad.headers()['cache-control'] ?? '').toMatch(/no-store/);
  if (process.env.AUDIT_URL) return;
  const ok = await postDecode(request, { mode: 'text', text: 'A short bill for $40.' });
  expect(ok.headers()['cache-control'] ?? '').toMatch(/no-store/);
});

test('a sixth decode inside a minute from one address is turned away with 429', async ({ request }) => {
  // Each test fakes its own address with x-forwarded-for. Vercel overwrites that header with the real one, so on a
  // deployment every test shares one address and the count is already used up. The firewall rule covers live traffic.
  test.skip(!!process.env.AUDIT_URL, 'Local only: a deployment ignores the faked address.');
  const ip = freshIp();
  const statuses = [];
  // Empty text costs nothing, and still counts against the limit.
  for (let i = 0; i < 6; i++) statuses.push((await postDecode(request, { mode: 'text', text: '' }, { ip })).status());
  expect(statuses.slice(0, 5)).not.toContain(429);
  expect(statuses[5]).toBe(429);
});

test('when the API fails, the browser gets the safe failure and nothing from the error', async ({ request }) => {
  needsMock();
  for (const scenario of ['api-error', 'api-overloaded']) {
    const res = await postDecode(request, { mode: 'text', text: `A bill. [[mock:${scenario}]]` });
    const body = await res.text();
    expect(finalOf(body).failure, scenario).toBe('unavailable');
    expect(body, scenario).not.toMatch(/MOCK-SENTINEL|sk-ant|x-api-key|authentication_error|overloaded_error|at \w+ \(|node_modules/);
  }
});

test('no script the browser loads carries an Anthropic key or a model name', async ({ request }) => {
  const html = await (await request.get('/')).text();
  const scripts = [...new Set(html.match(/\/_next\/static\/[^"']+\.js/g) ?? [])];
  expect(scripts.length).toBeGreaterThan(0);
  for (const src of scripts) {
    const js = await (await request.get(src)).text();
    expect(js, src).not.toMatch(/sk-ant-|ANTHROPIC_API_KEY|claude-(sonnet|opus|haiku)|DECODE_MODEL/);
  }
});

// MODEL-01: Claude Opus 5.5. The stand-in API refuses, with a 400, every request Opus 5.5 refuses (a forced
// tool_choice, thinking off, temperature, a prefill, a strict tool with an open object; lib/mock-anthropic.mjs),
// so every passing decode above also shows the route sends a request the model accepts.
const route = readFileSync(new URL('../../src/app/api/decode/route.ts', import.meta.url), 'utf8');

test('MODEL-01 the route defaults to claude-opus-5-5 and DECODE_MODEL still overrides it', async () => {
  expect(route).toMatch(/process\.env\.DECODE_MODEL \|\| "claude-opus-5-5"/);
});

test('MODEL-01 the route asks for the tool without forcing it, at low effort, with no up-front thinking', async () => {
  expect(route).toMatch(/tool_choice: \{ type: "auto" \}/);
  expect(route).not.toMatch(/tool_choice: \{ type: "(tool|any)"/);
  expect(route).toMatch(/thinking: \{ type: "between_tools" \}/);
  expect(route).toMatch(/process\.env\.DECODE_EFFORT \|\| "low"/);
  expect(route).not.toMatch(/temperature|top_p|top_k/);
});

test('MODEL-01 the SDK is 1.8.0 or later, so new stream events parse', async () => {
  const pkg = JSON.parse(readFileSync(new URL('../../node_modules/@anthropic-ai/sdk/package.json', import.meta.url), 'utf8'));
  const [maj, min] = pkg.version.split('.').map(Number);
  expect(maj * 1000 + min, pkg.version).toBeGreaterThanOrEqual(1008);
});

test('MODEL-01 a text block before the tool call does not stop the decode', async ({ request }) => {
  needsMock();
  const final = finalOf(await (await postDecode(request, { text: 'A short bill for $40. [[mock:text-first]]' })).text());
  expect(final.failure).toBeUndefined();
  expect(final.plainLanguage).toMatch(/ordinary money message/);
});

test('MODEL-01 an answer without the tool call is asked for once more, and the second answer is shown', async ({ request }) => {
  needsMock();
  const evs = events(await (await postDecode(request, { text: 'A short bill for $40. [[mock:no-tool]]' })).text());
  const final = evs.find(e => e.type === 'final').data;
  expect(final.failure).toBeUndefined();
  expect(final.worry.level).toBe('yellow');
});

test('MODEL-01 a model that never calls the tool gets the failure screen, not an empty result', async ({ page }) => {
  needsMock();
  await page.goto('/');
  await page.locator('#source').fill('A short bill for $40. [[mock:no-tool-ever]]');
  await page.getByRole('button', { name: /decode it/i }).click();
  await expect(page.getByRole('button', { name: /try again/i })).toBeVisible({ timeout: 15_000 });
});

test('MODEL-01 image mode still decodes', async ({ request }) => {
  needsMock();
  const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
  const final = finalOf(await (await postDecode(request, { mode: 'image', image: { mediaType: 'image/png', dataBase64: png } })).text());
  expect(final.failure).toBeUndefined();
  expect(final.plainLanguage).toBeTruthy();
});
