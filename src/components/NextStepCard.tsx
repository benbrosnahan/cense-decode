"use client";

import { useState } from "react";

interface Props {
  /** Empty or absent while it is still on its way. */
  nextStep?: string;
  considerations?: string[];
  /** True while the decode is still streaming in. */
  streaming?: boolean;
}

// The one thing to do. It is the only filled block on the results page, so it
// is the first thing the eye lands on after the verdict.
export default function NextStepCard({
  nextStep,
  considerations,
  streaming,
}: Props) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!nextStep) return;
    try {
      await navigator.clipboard.writeText(nextStep);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // Clipboard blocked. The text is on screen to select by hand.
    }
  }

  return (
    <section
      aria-label="Do this next"
      className="rounded-3xl bg-primary p-5 text-primary-foreground card-lift sm:p-7"
    >
      <h2 className="text-xs font-semibold uppercase tracking-[0.08em] text-white/80">
        Do this next
      </h2>
      {nextStep ? (
        <p className="mt-2 text-pretty font-display text-xl font-bold leading-snug sm:text-2xl">
          {nextStep}
        </p>
      ) : (
        streaming && (
          <div className="mt-3 flex flex-col gap-3">
            <span className="block h-4 w-11/12 rounded-full bg-white/25 motion-safe:animate-pulse" />
            <span className="block h-4 w-1/2 rounded-full bg-white/25 motion-safe:animate-pulse" />
          </div>
        )
      )}

      {nextStep && !streaming && (
        <button
          type="button"
          onClick={copy}
          className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-full bg-white/15 px-4 text-sm font-semibold text-white transition-colors hover:bg-white/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <span aria-live="polite">
            {copied ? "✓ Copied" : "Copy this step"}
          </span>
        </button>
      )}

      {considerations && considerations.length > 0 && (
        <div className="mt-5 border-t border-white/25 pt-4">
          <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-white/80">
            Before you decide
          </h3>
          <ul className="mt-2 flex flex-col gap-2">
            {considerations.map((c, i) => (
              <li
                key={i}
                className="flex gap-2.5 text-base leading-snug text-white/95"
              >
                <span
                  aria-hidden
                  className="mt-[0.6em] h-1.5 w-1.5 flex-shrink-0 rounded-full bg-white/70"
                />
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
