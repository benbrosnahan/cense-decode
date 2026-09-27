// Cense Decode. Created with Claude Code.

import { JargonTerm } from "@/types";

export type Segment =
  | { kind: "text"; text: string }
  | { kind: "term"; text: string; index: number };

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Split the student's own words around the terms that were decoded, so each
 * one can be marked where it actually appears.
 *
 * Longer terms are matched first ("variable APR" before "APR"), matches never
 * overlap, and a term only matches on a word boundary so "APR" does not light
 * up inside "April". `index` points back into the jargon list.
 */
export function markTerms(text: string, jargon: JargonTerm[]): Segment[] {
  const terms = jargon
    .map((j, index) => ({ term: j.term.trim(), index }))
    .filter((t) => t.term.length > 1)
    .sort((a, b) => b.term.length - a.term.length);
  if (!text || !terms.length) return [{ kind: "text", text }];

  const pattern = new RegExp(
    terms
      .map((t) => `(?<![\\p{L}\\p{N}])${escape(t.term)}(?![\\p{L}\\p{N}])`)
      .join("|"),
    "giu"
  );

  const out: Segment[] = [];
  let last = 0;
  for (const m of text.matchAll(pattern)) {
    const at = m.index ?? 0;
    const found = m[0];
    const hit = terms.find((t) => t.term.toLowerCase() === found.toLowerCase());
    if (!hit) continue;
    if (at > last) out.push({ kind: "text", text: text.slice(last, at) });
    out.push({ kind: "term", text: found, index: hit.index });
    last = at + found.length;
  }
  if (last < text.length) out.push({ kind: "text", text: text.slice(last) });
  return out;
}
