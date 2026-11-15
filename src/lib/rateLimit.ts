// Cense Decode. Created with Claude Code.

export interface RateLimiterOptions {
  /** Requests allowed per window, per key. */
  limit: number;
  windowMs: number;
  /** Most keys held at once. The oldest are dropped past it. */
  maxKeys: number;
  /** Clock, for tests. */
  now?: () => number;
}

/**
 * A fixed-window limiter held in memory.
 *
 * It lives in one serverless instance, so it is a brake on one browser or
 * script, not a wall: several instances each keep their own count. Expired
 * keys are swept once per window, and the map never holds more than
 * `maxKeys`, so a flood of new addresses cannot grow it without bound. (The
 * version before 2026-11-15 only swept past 5,000 keys and had no cap.)
 */
export class RateLimiter {
  private readonly hits = new Map<string, { count: number; resetAt: number }>();
  private nextSweep = 0;
  private readonly opts: Required<RateLimiterOptions>;

  constructor(opts: RateLimiterOptions) {
    this.opts = { now: Date.now, ...opts };
  }

  get size(): number {
    return this.hits.size;
  }

  /** Counts one request for `key`. True when it is over the limit. */
  hit(key: string): boolean {
    const now = this.opts.now();
    if (now >= this.nextSweep) {
      for (const [k, v] of this.hits) if (now >= v.resetAt) this.hits.delete(k);
      this.nextSweep = now + this.opts.windowMs;
    }

    const entry = this.hits.get(key);
    if (entry && now < entry.resetAt) {
      entry.count++;
      return entry.count > this.opts.limit;
    }

    this.hits.delete(key);
    this.hits.set(key, { count: 1, resetAt: now + this.opts.windowMs });
    // A Map iterates in insertion order, so the first keys are the oldest.
    while (this.hits.size > this.opts.maxKeys) {
      const oldest = this.hits.keys().next().value;
      if (oldest === undefined) break;
      this.hits.delete(oldest);
    }
    return false;
  }
}
