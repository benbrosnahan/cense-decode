"use client";

import { motion } from "framer-motion";

export default function LoadingScreen() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center gap-4 py-24"
    >
      <div className="flex gap-1.5">
        <span className="w-2 h-2 rounded-full bg-primary/50 animate-pulse" />
        <span className="w-2 h-2 rounded-full bg-primary/50 animate-pulse [animation-delay:200ms]" />
        <span className="w-2 h-2 rounded-full bg-primary/50 animate-pulse [animation-delay:400ms]" />
      </div>
      <p className="text-sm text-muted-foreground">Reading this carefully...</p>
    </motion.div>
  );
}
