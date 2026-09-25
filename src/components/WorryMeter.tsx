"use client";

import { motion } from "framer-motion";
import { WorryRead, WorryLevel } from "@/types";
import { SkeletonLine } from "@/components/ui/skeleton";

interface Props {
  /**
   * Absent while the decode is still streaming. The server only sends the
   * worry read once it is complete and scam-clamped, so until then this card
   * shows placeholders and never a provisional level.
   */
  worry?: WorryRead;
}

// Neutral wording only. We deliberately avoid color-coding urgency so the card
// never over-alarms or over-comforts an anxious student. The headline and
// reasons carry the actual meaning.
const LEVEL_WORD: Record<WorryLevel, string> = {
  green: "Low",
  yellow: "Moderate",
  red: "Higher",
};

export default function WorryMeter({ worry }: Props) {
  const pending = !worry;
  const level: WorryLevel = worry &&
    (["green", "yellow", "red"] as WorryLevel[]).includes(worry.level)
    ? worry.level
    : "yellow";
  const cues = worry?.basedOn ?? [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: "easeInOut" }}
      className="rounded-2xl bg-card ring-1 ring-foreground/10 card-soft p-6"
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-foreground/50 uppercase tracking-wide">
          Level of urgency
        </p>
        {pending ? (
          <SkeletonLine className="h-6 w-20" />
        ) : (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="text-xs font-medium text-muted-foreground rounded-full bg-muted px-2.5 py-1"
          >
            {LEVEL_WORD[level]}
          </motion.span>
        )}
      </div>

      {pending ? (
        <div className="mt-3 flex flex-col gap-2 py-1">
          <span className="sr-only">Checking how urgent this is.</span>
          <SkeletonLine className="h-3.5 w-4/5" />
          <SkeletonLine className="h-3.5 w-1/2" />
        </div>
      ) : (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="mt-3 text-base font-medium text-foreground leading-snug"
        >
          {worry?.headline}
        </motion.p>
      )}

      {cues.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="mt-4"
        >
          <p className="text-xs font-medium text-foreground/50 uppercase tracking-wide">
            Why we say this
          </p>
          <ul className="mt-1.5 flex flex-col gap-1">
            {cues.map((cue, i) => (
              <li key={i} className="flex gap-2 text-sm text-foreground/75">
                <span className="text-foreground/30 mt-0.5">•</span>
                <span>{cue}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      )}
    </motion.div>
  );
}
