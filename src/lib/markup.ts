// Cense Decode. Created with Claude Code.

import { JargonTerm } from "@/types";

export type Segment =
  | { kind: "text"; text: string }
  | { kind: "term"; text: string; index: number };

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const bounded = (needle: string) =>
  `(?<![\\p{L}\\p{N}])${escape(needle)}(?![\\p{L}\\p{N}])`;

const appears = (text: string, needle: string) =>
  new RegExp(bounded(needle), "iu").test(text);

/**
 * Where a decoded term shows up in the student's words. Usually the term
 * itself. When the model reworded it ("unsubsidized loan" for a student who
 * wrote "unsubsidized"), the singular or plural form, and failing that the
 * term's longest word of five letters or more, so the highlight still lands
 * where the student wrote it. Null when none of them appear.
 */
function needleFor(text: string, term: string): string | null {
  const forms = [term, term.endsWith("s") ? term.slice(0, -1) : `${term}s`];
  for (const f of forms) if (appears(text, f)) return f;
  const words = term
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w.length >= 5)
    .sort((a, b) => b.length - a.length);
  for (const w of words) if (appears(text, w)) return w;
  return null;
}

/**
 * Split the student's own words around the terms that were decoded, so each
 * one can be marked where it actually appears.
 *
 * Longer matches are tried first ("variable APR" before "APR"), matches never
 * overlap, and a term only matches on a word boundary so "APR" does not light
 * up inside "April". `index` points back into the jargon list.
 */
export function markTerms(text: string, jargon: JargonTerm[]): Segment[] {
  if (!text) return [{ kind: "text", text }];
  const used = new Set<string>();
  const terms: { needle: string; index: number }[] = [];
  jargon.forEach((j, index) => {
    const term = j.term.trim();
    if (term.length <= 1) return;
    const needle = needleFor(text, term);
    if (!needle || used.has(needle.toLowerCase())) return;
    used.add(needle.toLowerCase());
    terms.push({ needle, index });
  });
  if (!terms.length) return [{ kind: "text", text }];
  terms.sort((a, b) => b.needle.length - a.needle.length);

  const pattern = new RegExp(terms.map((t) => bounded(t.needle)).join("|"), "giu");

  const out: Segment[] = [];
  let last = 0;
  for (const m of text.matchAll(pattern)) {
    const at = m.index ?? 0;
    const found = m[0];
    const hit = terms.find((t) => t.needle.toLowerCase() === found.toLowerCase());
    if (!hit) continue;
    if (at > last) out.push({ kind: "text", text: text.slice(last, at) });
    out.push({ kind: "term", text: found, index: hit.index });
    last = at + found.length;
  }
  if (last < text.length) out.push({ kind: "text", text: text.slice(last) });
  return out;
}
