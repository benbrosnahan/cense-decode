"use client";

import { DecodeResult, PartialDecode } from "@/types";
import WorryMeter from "./WorryMeter";
import PlainLanguageCard from "./PlainLanguageCard";
import JargonDecoder from "./JargonDecoder";
import NextStepCard from "./NextStepCard";
import GoDeeperCTA from "./GoDeeperCTA";
import { Button } from "@/components/ui/button";
import { SkeletonLine } from "@/components/ui/skeleton";

interface Props {
  /** A streaming partial until isFinal, then the full normalized result. */
  result: PartialDecode | DecodeResult;
  isFinal: boolean;
  onDecodeAnother: () => void;
}

export default function ResultsScreen({ result, isFinal, onDecodeAnother }: Props) {
  const streaming = !isFinal;
  // goDeeper and the disclaimer only ever arrive with the final result.
  const final = isFinal ? (result as DecodeResult) : null;

  return (
    <div className="flex flex-col gap-4" aria-busy={streaming}>
      <WorryMeter worry={result.worry} />
      <PlainLanguageCard
        plainLanguage={result.plainLanguage ?? ""}
        analogy={result.analogy}
        streaming={streaming}
      />
      <JargonDecoder jargon={result.jargon} streaming={streaming} />
      <NextStepCard
        nextStep={result.nextStep}
        considerations={result.considerations}
        streaming={streaming}
      />
      {final?.goDeeper && <GoDeeperCTA goDeeper={final.goDeeper} />}

      {final ? (
        <p className="text-xs text-muted-foreground/80 leading-relaxed px-1">
          {final.disclaimer}
        </p>
      ) : (
        <div className="px-1 py-[5px]">
          <SkeletonLine className="h-2.5 w-3/4" />
        </div>
      )}

      <div className="flex justify-center mt-2">
        <Button
          variant="secondary"
          size="lg"
          className="w-full max-w-xs"
          onClick={onDecodeAnother}
        >
          Decode something else
        </Button>
      </div>
    </div>
  );
}
