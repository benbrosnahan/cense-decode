"use client";

import { useState } from "react";
import { DecodeResult, PartialDecode, Submission } from "@/types";
import WorryMeter from "./WorryMeter";
import PlainLanguageCard from "./PlainLanguageCard";
import SourceMarkup from "./SourceMarkup";
import NextStepCard from "./NextStepCard";
import GoDeeperCTA from "./GoDeeperCTA";
import { Button } from "@/components/ui/button";
import { SkeletonLine } from "@/components/ui/skeleton";
import { asPlainText } from "@/lib/summary";

interface Props {
  /** A streaming partial until isFinal, then the full normalized result. */
  result: PartialDecode | DecodeResult;
  isFinal: boolean;
  source: Submission;
  onDecodeAnother: () => void;
  onStop: () => void;
}

// Order is the answer first, then the evidence: how urgent, what it means,
// what to do, and only then the marked-up original and the definitions. Each
// block stands on its own, so someone can stop reading at any point and still
// leave with the part that matters.
export default function ResultsScreen({
  result,
  isFinal,
  source,
  onDecodeAnother,
  onStop,
}: Props) {
  const streaming = !isFinal;
  // goDeeper and the disclaimer only ever arrive with the final result.
  const final = isFinal ? (result as DecodeResult) : null;
  const [copied, setCopied] = useState(false);
  const nothingYet = streaming && !result.plainLanguage && !result.worry;

  async function copyAll() {
    if (!final) return;
    try {
      await navigator.clipboard.writeText(asPlainText(final));
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // Clipboard blocked. Everything is on screen to select by hand.
    }
  }

  return (
    <div className="flex flex-col gap-5 pt-6" aria-busy={streaming}>
      <div className="flex min-h-11 items-center justify-between gap-3">
        <Button variant="ghost" size="sm" className="-ml-3" onClick={onDecodeAnother}>
          <svg
            aria-hidden
            viewBox="0 0 16 16"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M13 8H3M7 4 3 8l4 4" />
          </svg>
          Start over
        </Button>
        {streaming && (
          <p
            role="status"
            className="flex items-center gap-2 whitespace-nowrap text-sm font-semibold text-muted-foreground"
          >
            <span
              aria-hidden
              className="h-2 w-2 rounded-full bg-primary motion-safe:animate-pulse"
            />
            {nothingYet ? "Reading it carefully" : "Still writing"}
            <button
              type="button"
              onClick={onStop}
              className="min-h-11 rounded-full px-2 font-semibold text-primary underline underline-offset-4 hover:no-underline"
            >
              Stop
            </button>
          </p>
        )}
      </div>

      <WorryMeter worry={result.worry} />
      <PlainLanguageCard
        plainLanguage={result.plainLanguage ?? ""}
        analogy={result.analogy}
        streaming={streaming}
      />
      <NextStepCard
        nextStep={result.nextStep}
        considerations={result.considerations}
        streaming={streaming}
      />
      <SourceMarkup source={source} jargon={result.jargon} streaming={streaming} />
      {final?.goDeeper && <GoDeeperCTA goDeeper={final.goDeeper} />}

      {final ? (
        <p className="px-1 text-sm leading-relaxed text-muted-foreground">
          {final.disclaimer}
        </p>
      ) : (
        <div className="px-1 py-1.5">
          <SkeletonLine className="w-3/4" />
        </div>
      )}

      {final && (
        <div className="flex flex-col gap-2.5 sm:flex-row">
          <Button variant="secondary" onClick={copyAll}>
            <span aria-live="polite">
              {copied ? "✓ Copied" : "Copy the whole explanation"}
            </span>
          </Button>
          <Button onClick={onDecodeAnother}>Decode something else</Button>
        </div>
      )}
    </div>
  );
}
