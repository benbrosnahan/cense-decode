"use client";

// Cense Decode. Created with Claude Code.
//
// Your own words, marked up.
//
// This is the part of Decode that makes it a translator rather than a chatbot.
// Students cannot check an explanation against expertise they do not have, so
// the document itself has to be the check: every term we explain is marked in
// the place it actually appeared, and the definition opens right under it.
// Definitions are tap-to-open and are also listed in full below, because a
// hover tooltip does not exist on a phone and some people never tap.

import { useMemo, useState } from "react";
import { JargonTerm, Submission } from "@/types";
import { markTerms } from "@/lib/markup";
import { Eyebrow, SkeletonLine } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface Props {
  source: Submission;
  /** Absent while the terms have not started streaming in yet. */
  jargon?: JargonTerm[];
  /** True while the decode is still streaming in. */
  streaming?: boolean;
}

const COLLAPSE_AT = 420;
/** Closing punctuation that should stay attached to the word before it. */
const TRAILING = /^[.,;:!?)\]'"\u2019\u201d]+/;

export default function SourceMarkup({ source, jargon, streaming }: Props) {
  const [active, setActive] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);

  const terms = useMemo(() => jargon ?? [], [jargon]);
  const text = source.text.trim();
  const long = text.length > COLLAPSE_AT;

  const segments = useMemo(() => markTerms(text, terms), [text, terms]);
  const marked = segments.some((s) => s.kind === "term");
  const current = active !== null ? terms[active] : null;

  const nothingToShow = !text && !source.image && !terms.length && !streaming;
  if (nothingToShow) return null;

  return (
    <section
      aria-label="Your words, decoded"
      className="rounded-3xl bg-card p-5 card-soft ring-1 ring-border sm:p-7"
    >
      <Eyebrow as="h2">
        {!source.image && marked ? "Your words, marked up" : "What you sent"}
      </Eyebrow>

      {source.image && (
        <div className="mt-3 flex items-start gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={source.image.preview}
            alt="The screenshot you sent"
            className="max-h-56 w-auto max-w-[45%] rounded-xl border border-border object-contain"
          />
          {text && (
            <p className="text-base leading-relaxed text-soft">{text}</p>
          )}
        </div>
      )}

      {!source.image && text && (
        <>
          <div
            className={cn(
              "relative mt-3 rounded-2xl bg-muted/70 p-4",
              long && !expanded && "max-h-44 overflow-hidden"
            )}
          >
            <p className="whitespace-pre-wrap break-words text-base leading-[1.9] text-foreground">
              {segments.map((s, i) => {
                if (s.kind === "text") {
                  // Punctuation right after a term is drawn with the term
                  // (below), so a full stop never wraps to the next line alone.
                  const prev = segments[i - 1];
                  const text =
                    prev?.kind === "term" ? s.text.replace(TRAILING, "") : s.text;
                  return <span key={i}>{text}</span>;
                }
                const next = segments[i + 1];
                const trailing =
                  next?.kind === "text" ? next.text.match(TRAILING)?.[0] ?? "" : "";
                return (
                  <span key={i} className="whitespace-nowrap">
                    <button
                      type="button"
                      className="term"
                      aria-pressed={active === s.index}
                      aria-controls="term-definition"
                      onClick={() =>
                        setActive(active === s.index ? null : s.index)
                      }
                    >
                      {s.text}
                    </button>
                    {trailing}
                  </span>
                );
              })}
            </p>
            {long && !expanded && (
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 bottom-0 h-16 rounded-b-2xl bg-gradient-to-t from-[#f9f6e6] to-transparent"
              />
            )}
          </div>
          {long && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
              className="mt-1 min-h-11 rounded-full px-2 text-sm font-semibold text-primary underline underline-offset-4 hover:no-underline"
            >
              {expanded ? "Show less" : "Show all of it"}
            </button>
          )}

          <div id="term-definition" aria-live="polite" className="mt-3">
            {current ? (
              <div className="rounded-2xl border-l-4 border-mark-strong bg-mark/60 p-4">
                <p className="text-base font-bold text-foreground">
                  {current.term}
                </p>
                <p className="mt-0.5 text-base leading-relaxed text-foreground">
                  {current.definition || "One moment, still writing this one."}
                </p>
              </div>
            ) : (
              marked && (
                <p className="text-sm text-muted-foreground">
                  Tap any marked word to see what it means.
                </p>
              )
            )}
          </div>
        </>
      )}

      {(terms.length > 0 || (streaming && !jargon)) && (
        <div className="mt-5 border-t border-border pt-4">
          <Eyebrow as="h3">
            {terms.length === 1 ? "The term, defined" : "Every term, defined"}
          </Eyebrow>
          <dl className="mt-2 flex flex-col divide-y divide-border">
            {jargon
              ? terms.map((j, i) => (
                  // Index keys: a term's text grows while it streams in.
                  <div key={i} className="py-3 first:pt-1 last:pb-0">
                    <dt className="text-base font-bold text-foreground">
                      {j.term}
                    </dt>
                    <dd className="mt-0.5 text-base leading-relaxed text-soft">
                      {j.definition ||
                        (streaming && (
                          <span className="block py-1.5">
                            <SkeletonLine className="w-3/4" />
                          </span>
                        ))}
                    </dd>
                  </div>
                ))
              : [0, 1].map((i) => (
                  <div key={i} className="py-3 first:pt-1" aria-hidden>
                    <SkeletonLine className="w-24" />
                    <SkeletonLine className="mt-2.5 w-3/4" />
                  </div>
                ))}
          </dl>
        </div>
      )}
    </section>
  );
}
