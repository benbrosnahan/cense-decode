"use client";

import { motion } from "framer-motion";
import { JargonTerm } from "@/types";

interface Props {
  jargon: JargonTerm[];
}

export default function JargonDecoder({ jargon }: Props) {
  if (jargon.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: "easeInOut", delay: 0.2 }}
      className="rounded-xl bg-card ring-1 ring-foreground/10 card-soft p-5"
    >
      <p className="text-xs font-medium text-foreground/50 uppercase tracking-wide">
        Words decoded
      </p>
      <dl className="mt-3 flex flex-col divide-y divide-border/70">
        {jargon.map((j) => (
          <div key={j.term} className="py-2.5 first:pt-0 last:pb-0">
            <dt className="text-sm font-semibold text-foreground">{j.term}</dt>
            <dd className="mt-0.5 text-sm text-foreground/70 leading-relaxed">
              {j.definition}
            </dd>
          </div>
        ))}
      </dl>
    </motion.div>
  );
}
