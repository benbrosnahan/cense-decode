"use client";

import { motion } from "framer-motion";
import { GoDeeper } from "@/types";
import { ROUTE_TARGETS, routeUrl } from "@/lib/routes";

interface Props {
  goDeeper: GoDeeper;
}

export default function GoDeeperCTA({ goDeeper }: Props) {
  const href = routeUrl(goDeeper.route);
  if (!href) return null; // route not deployed yet -> no broken link

  const label = goDeeper.label || ROUTE_TARGETS[goDeeper.route].defaultLabel;

  return (
    <motion.a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: "easeInOut", delay: 0.4 }}
      className="flex items-center justify-between rounded-xl bg-primary/5 ring-1 ring-primary/20 card-soft p-5 hover:bg-primary/10 transition-colors group"
    >
      <div>
        <p className="text-xs font-medium text-primary/70 uppercase tracking-wide">
          Go deeper (optional)
        </p>
        <p className="mt-1 text-sm font-medium text-foreground">{label}</p>
      </div>
      <svg
        className="w-5 h-5 text-primary shrink-0 transition-transform group-hover:translate-x-0.5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
      </svg>
    </motion.a>
  );
}
