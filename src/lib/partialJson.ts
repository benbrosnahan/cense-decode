/**
 * Tolerant parser for a JSON object that is still being streamed.
 *
 * Unlike the SDK's built-in partial parser (which drops any string that has
 * not been closed yet), this keeps in-progress strings, so a field like
 * plainLanguage can be shown growing token by token. It also reports which
 * top-level keys have a fully closed value, which is what lets the server hold
 * back fields (the worry read) until they are complete.
 *
 * Anything it cannot make sense of is dropped rather than guessed at. The
 * final, authoritative result is always parsed from the finished tool input,
 * never from this.
 */

export interface PartialObject {
  value: Record<string, unknown>;
  /** Top-level keys whose values are fully closed in the source text. */
  complete: Set<string>;
}

interface Parsed {
  /** False when nothing usable was read (e.g. a half-written number). */
  ok: boolean;
  /** True when the value was closed in the source text. */
  done: boolean;
  value?: unknown;
  /** Only set for objects: keys whose values closed. */
  completeKeys?: string[];
}

const ESCAPES: Record<string, string> = {
  '"': '"',
  "\\": "\\",
  "/": "/",
  b: "\b",
  f: "\f",
  n: "\n",
  r: "\r",
  t: "\t",
};

class Parser {
  private i = 0;
  constructor(private readonly s: string) {}

  private ws() {
    while (this.i < this.s.length && /\s/.test(this.s[this.i])) this.i++;
  }

  value(): Parsed {
    this.ws();
    if (this.i >= this.s.length) return { ok: false, done: false };
    const c = this.s[this.i];
    if (c === "{") return this.object();
    if (c === "[") return this.array();
    if (c === '"') return this.string();
    return this.literal();
  }

  private string(): Parsed {
    this.i++; // opening quote
    let out = "";
    while (this.i < this.s.length) {
      const c = this.s[this.i];
      if (c === '"') {
        this.i++;
        return { ok: true, done: true, value: out };
      }
      if (c === "\\") {
        // An escape split across chunks: stop before it, show what we have.
        if (this.i + 1 >= this.s.length) break;
        const e = this.s[this.i + 1];
        if (e === "u") {
          if (this.i + 6 > this.s.length) break;
          const hex = this.s.slice(this.i + 2, this.i + 6);
          if (!/^[0-9a-fA-F]{4}$/.test(hex)) break;
          out += String.fromCharCode(parseInt(hex, 16));
          this.i += 6;
          continue;
        }
        out += ESCAPES[e] ?? e;
        this.i += 2;
        continue;
      }
      out += c;
      this.i++;
    }
    this.i = this.s.length;
    return { ok: true, done: false, value: out };
  }

  private literal(): Parsed {
    const start = this.i;
    while (this.i < this.s.length && /[A-Za-z0-9.+\-]/.test(this.s[this.i])) this.i++;
    // A literal running into the end of the buffer may still be growing.
    if (this.i >= this.s.length || this.i === start) {
      this.i = this.s.length;
      return { ok: false, done: false };
    }
    try {
      return { ok: true, done: true, value: JSON.parse(this.s.slice(start, this.i)) };
    } catch {
      this.i = this.s.length;
      return { ok: false, done: false };
    }
  }

  private array(): Parsed {
    this.i++; // [
    const out: unknown[] = [];
    for (;;) {
      this.ws();
      if (this.i >= this.s.length) return { ok: true, done: false, value: out };
      const c = this.s[this.i];
      if (c === "]") {
        this.i++;
        return { ok: true, done: true, value: out };
      }
      if (c === ",") {
        this.i++;
        continue;
      }
      const item = this.value();
      if (item.ok) out.push(item.value);
      if (!item.done) return { ok: true, done: false, value: out };
    }
  }

  private object(): Parsed {
    this.i++; // {
    const out: Record<string, unknown> = {};
    const completeKeys: string[] = [];
    const partial = (): Parsed => ({ ok: true, done: false, value: out, completeKeys });
    for (;;) {
      this.ws();
      if (this.i >= this.s.length) return partial();
      const c = this.s[this.i];
      if (c === "}") {
        this.i++;
        return { ok: true, done: true, value: out, completeKeys };
      }
      if (c === ",") {
        this.i++;
        continue;
      }
      if (c !== '"') {
        this.i = this.s.length;
        return partial();
      }
      const key = this.string();
      if (!key.done) return partial(); // half-written key: drop it
      this.ws();
      if (this.i >= this.s.length || this.s[this.i] !== ":") {
        this.i = this.s.length;
        return partial();
      }
      this.i++; // :
      const val = this.value();
      if (val.ok) out[key.value as string] = val.value;
      if (!val.done) return partial();
      completeKeys.push(key.value as string);
    }
  }
}

/** Parse a possibly unfinished JSON object. Never throws. */
export function parsePartialObject(src: string): PartialObject {
  try {
    const p = new Parser(src).value();
    if (p.ok && p.value && typeof p.value === "object" && !Array.isArray(p.value)) {
      return {
        value: p.value as Record<string, unknown>,
        complete: new Set(p.completeKeys ?? []),
      };
    }
  } catch {
    // fall through
  }
  return { value: {}, complete: new Set() };
}
