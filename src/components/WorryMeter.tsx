"use client";

import { WorryRead, WorryLevel } from "@/types";
import { Eyebrow, SkeletonLine } from "@/components/ui/skeleton";
import { LEVEL_WORD } from "@/lib/summary";
import { cn } from "@/lib/utils";

interface Props {
  /**
   * Absent while the decode is still streaming. The server only sends the
   * worry read once it is complete and scam-clamped, so until then this card
   * shows placeholders and never a provisional level.
   */
  worry?: WorryRead;
}

// Neutral ink only. We deliberately avoid red, amber and green so the card
// never over-alarms or over-comforts an anxious student. The level is carried
// three ways that do not depend on colour: the word, how many steps are
// filled, and where the word sits on the scale. Showing all three steps is
// what gives "Moderate" a meaning. On its own the word had no scale.
const LEVELS: WorryLevel[] = ["green", "yellow", "red"];

export default function WorryMeter({ worry }: Props) {
  const pending = !worry;
  const level: WorryLevel =
    worry && LEVELS.includes(worry.level) ? worry.level : "yellow";
  const position = LEVELS.indexOf(level);
  const cues = worry?.basedOn ?? [];

  return (
    <section
      aria-label="How urgent this is"
      className="rounded-3xl bg-card p-5 card-soft ring-1 ring-border sm:p-7"
    >
      <Eyebrow as="h2">How urgent this is</Eyebrow>

      <div
        className="mt-3"
        role="img"
        aria-label={
          pending
            ? "Checking how urgent this is"
            : `${LEVEL_WORD[level]}, step ${position + 1} of 3 on a scale from low to higher`
        }
      >
        <div className="grid grid-cols-3 gap-1.5">
          {LEVELS.map((l, i) => (
            <span
              key={l}
              className={cn(
                "h-2 rounded-full transition-colors duration-300",
                !pending && i <= position ? "bg-primary" : "bg-border"
              )}
            />
          ))}
        </div>
        <div className="mt-1.5 grid grid-cols-3 gap-1.5 text-sm">
          {LEVELS.map((l, i) => (
            <span
              key={l}
              className={cn(
                i === 1 && "text-center",
                i === 2 && "text-right",
                !pending && i === position
                  ? "font-bold text-foreground"
                  : "text-muted-foreground"
              )}
            >
              {LEVEL_WORD[l]}
            </span>
          ))}
        </div>
      </div>

      {pending ? (
        <div className="mt-5 flex flex-col gap-2.5 py-1">
          <SkeletonLine className="h-5 w-4/5" />
          <SkeletonLine className="h-5 w-1/2" />
        </div>
      ) : (
        <p className="mt-5 text-pretty font-display text-xl font-bold leading-snug text-foreground sm:text-2xl">
          {worry?.headline}
        </p>
      )}

      {cues.length > 0 && (
        <div className="mt-5 border-t border-border pt-4">
          <Eyebrow as="h3">What we saw that says so</Eyebrow>
          <ul className="mt-2 flex flex-col gap-1.5">
            {cues.map((cue, i) => (
              <li
                key={i}
                className="flex gap-2.5 text-base leading-snug text-soft"
              >
                <span
                  aria-hidden
                  className="mt-[0.6em] h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary"
                />
                <span>{cue}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
