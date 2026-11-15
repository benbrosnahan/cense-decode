// The route's in-memory rate limiter (SEC-06 in audits/REPORT.md). It lives in one serverless instance, so it is
// a brake, not a wall; what matters here is that it cannot grow without bound while it does its job.
import { test, expect, knownIssue } from './helpers.mjs';

const load = () => import('../../src/lib/rateLimit.ts');

test('SEC-06 addresses whose minute is over are forgotten, so the limiter does not grow forever', async () => {
  knownIssue('SEC-06');
  const { RateLimiter } = await load();
  let now = 0;
  const limiter = new RateLimiter({ limit: 5, windowMs: 60_000, maxKeys: 10_000, now: () => now });
  for (let i = 0; i < 300; i++) limiter.hit(`10.0.${i >> 8}.${i & 255}`);
  expect(limiter.size).toBe(300);
  now += 61_000;
  limiter.hit('10.9.9.9');
  expect(limiter.size).toBe(1);
});

test('SEC-06 even under a flood of fresh addresses the limiter stays under its cap', async () => {
  knownIssue('SEC-06');
  const { RateLimiter } = await load();
  const limiter = new RateLimiter({ limit: 5, windowMs: 60_000, maxKeys: 1_000, now: () => 0 });
  for (let i = 0; i < 5_000; i++) limiter.hit(`ip-${i}`);
  expect(limiter.size).toBeLessThanOrEqual(1_000);
});

test('SEC-06 the sixth hit inside a minute is limited and the minute after is not', async () => {
  knownIssue('SEC-06');
  const { RateLimiter } = await load();
  let now = 0;
  const limiter = new RateLimiter({ limit: 5, windowMs: 60_000, maxKeys: 100, now: () => now });
  const results = Array.from({ length: 6 }, () => limiter.hit('a'));
  expect(results).toEqual([false, false, false, false, false, true]);
  now += 60_001;
  expect(limiter.hit('a')).toBe(false);
});
