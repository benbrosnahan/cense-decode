// Cense Decode. Created with Claude Code.

import { DecodeResult, WorryLevel } from "@/types";

export const LEVEL_WORD: Record<WorryLevel, string> = {
  green: "Low",
  yellow: "Moderate",
  red: "Higher",
};

/** The whole decode as plain text, for copying or sending to someone. */
export function asPlainText(r: DecodeResult): string {
  const lines: string[] = [
    `How urgent: ${LEVEL_WORD[r.worry.level]}. ${r.worry.headline}`,
    "",
    "In plain words",
    r.plainLanguage,
  ];
  if (r.analogy) lines.push("", r.analogy);
  lines.push("", "Do this next", r.nextStep);
  if (r.considerations?.length) {
    lines.push("", "Before you decide");
    for (const c of r.considerations) lines.push(`- ${c}`);
  }
  if (r.jargon.length) {
    lines.push("", "The terms");
    for (const j of r.jargon) lines.push(`- ${j.term}: ${j.definition}`);
  }
  lines.push("", r.disclaimer, "", "Decoded with Cense Decode, cense-decode.vercel.app");
  return lines.join("\n");
}
