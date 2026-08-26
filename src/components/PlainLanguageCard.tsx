"use client";

import { motion } from "framer-motion";

interface Props {
  plainLanguage: string;
  analogy: string;
}

export default function PlainLanguageCard({ plainLanguage, analogy }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: "easeInOut", delay: 0.1 }}
      className="rounded-xl bg-accent/50 p-5 border-l-2 border-primary/30"
    >
      <p className="text-xs font-medium text-foreground/50 uppercase tracking-wide">
        What this actually says
      </p>
      <p className="mt-2 text-sm text-foreground/85 leading-relaxed">
        {plainLanguage}
      </p>
      <p className="mt-3 text-sm text-foreground/70 leading-relaxed italic">
        {analogy}
      </p>
    </motion.div>
  );
}
