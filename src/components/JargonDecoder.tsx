"use client";

import { motion } from "framer-motion";
import { JargonTerm } from "@/types";
import { SkeletonLine } from "@/components/ui/skeleton";

interface Props {
  /** Absent while the terms have not started streaming in yet. */
  jargon?: JargonTerm[];
  /** True while the decode is still streaming in. */
  streaming?: boolean;
}

export default function JargonDecoder({ jargon, streaming }: Props) {
  if (jargon && jargon.length === 0) return null;
  if (!jargon && !streaming) return null;

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
        {jargon
          ? jargon.map((j, i) => (
              // Index keys: a term's text grows while it streams in.
              <div key={i} className="py-2.5 first:pt-0 last:pb-0">
                <dt className="text-sm font-semibold text-foreground">{j.term}</dt>
                <dd className="mt-0.5 text-sm text-foreground/70 leading-relaxed">
                  {j.definition || (streaming && (
                    <span className="block py-[5px]">
                      <SkeletonLine className="w-3/4" />
                    </span>
                  ))}
                </dd>
              </div>
            ))
          : [0, 1].map((i) => (
              <div key={i} className="py-2.5 first:pt-0 last:pb-0" aria-hidden>
                <div className="py-[4px]">
                  <SkeletonLine className="w-24" />
                </div>
                <div className="mt-0.5 py-[5px]">
                  <SkeletonLine className="w-3/4" />
                </div>
              </div>
            ))}
      </dl>
    </motion.div>
  );
}
