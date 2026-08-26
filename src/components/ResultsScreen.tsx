"use client";

import { DecodeResult } from "@/types";
import WorryMeter from "./WorryMeter";
import PlainLanguageCard from "./PlainLanguageCard";
import JargonDecoder from "./JargonDecoder";
import NextStepCard from "./NextStepCard";
import GoDeeperCTA from "./GoDeeperCTA";
import { Button } from "@/components/ui/button";

interface Props {
  result: DecodeResult;
  onDecodeAnother: () => void;
}

export default function ResultsScreen({ result, onDecodeAnother }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <WorryMeter worry={result.worry} />
      <PlainLanguageCard
        plainLanguage={result.plainLanguage}
        analogy={result.analogy}
      />
      <JargonDecoder jargon={result.jargon} />
      <NextStepCard
        nextStep={result.nextStep}
        considerations={result.considerations}
      />
      {result.goDeeper && <GoDeeperCTA goDeeper={result.goDeeper} />}

      <p className="text-xs text-muted-foreground/80 leading-relaxed px-1">
        {result.disclaimer}
      </p>

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
