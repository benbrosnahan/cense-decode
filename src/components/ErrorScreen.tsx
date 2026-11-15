"use client";

// Cense Decode. Created with Claude Code.

import { Button } from "@/components/ui/button";
import { DecodeFailure } from "@/types";
import { Eyebrow } from "@/components/ui/skeleton";

interface Props {
  failure: DecodeFailure;
  onRetry: () => void;
  onEdit: () => void;
}

// A failure is shown as a failure. The old version returned a made-up decode
// with an urgency level and an analogy about a dropped call, which put
// "Moderate" next to something nobody had actually read.
const COPY: Record<DecodeFailure, { title: string; body: string }> = {
  unavailable: {
    title: "We could not read that just now",
    body: "Nothing is wrong with what you sent. Our explainer did not answer this time. What you wrote is still here, so you will not need to paste it again.",
  },
  "rate-limited": {
    title: "Give it about a minute",
    body: "A lot of decodes came from your network in the last minute, so we paused. What you wrote is still here. Wait a minute, then try again.",
  },
  offline: {
    title: "You look offline",
    body: "We could not reach the internet. What you wrote is still here. Reconnect, then try again.",
  },
};

export default function ErrorScreen({ failure, onRetry, onEdit }: Props) {
  const copy = COPY[failure];
  return (
    <div className="flex flex-col gap-5 pt-8 sm:pt-12">
      <div role="alert">
        <Eyebrow>Not decoded</Eyebrow>
        <h1 className="mt-2 text-balance font-display text-4xl font-bold leading-[1.05] text-foreground sm:text-5xl">
          {copy.title}
        </h1>
        <p className="mt-3 max-w-xl text-lg leading-relaxed text-soft">
          {copy.body}
        </p>
      </div>

      <div className="flex flex-col gap-2.5 sm:flex-row">
        <Button onClick={onRetry}>Try again</Button>
        <Button variant="secondary" onClick={onEdit}>
          Edit what I sent
        </Button>
      </div>

      <div className="rounded-3xl bg-secondary p-5">
        <Eyebrow as="h2">If it cannot wait</Eyebrow>
        <p className="mt-1.5 text-base leading-relaxed text-foreground">
          Do not act on a message you do not understand. Contact the company
          using the phone number on the back of your card or on its official
          website, never a number or link inside the message itself.
        </p>
      </div>
    </div>
  );
}
