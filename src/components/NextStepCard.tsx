"use client";

import { motion } from "framer-motion";

interface Props {
  nextStep: string;
  considerations?: string[];
}

export default function NextStepCard({ nextStep, considerations }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: "easeInOut", delay: 0.3 }}
      className="rounded-xl bg-card ring-1 ring-foreground/10 card-soft p-5"
    >
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
          <svg
            className="w-4 h-4 text-primary"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">Your next step</p>
          <p className="mt-0.5 text-sm text-foreground/75 leading-relaxed">
            {nextStep}
          </p>
        </div>
      </div>

      {considerations && considerations.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border/70">
          <p className="text-xs font-medium text-foreground/50 uppercase tracking-wide">
            Things to think about
          </p>
          <ul className="mt-2 flex flex-col gap-1.5">
            {considerations.map((c, i) => (
              <li key={i} className="flex gap-2 text-sm text-foreground/75 leading-relaxed">
                <span className="text-primary/50 mt-0.5">•</span>
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </motion.div>
  );
}
