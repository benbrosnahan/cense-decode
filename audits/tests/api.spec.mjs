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
