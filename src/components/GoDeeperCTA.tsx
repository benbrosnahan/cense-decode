"use client";

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
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-4 rounded-3xl border border-border-strong bg-card p-5 transition-colors hover:border-primary hover:bg-secondary"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          If you want to go further
        </span>
        <span className="mt-1 block font-display text-lg font-bold leading-snug text-foreground">
          {label}
        </span>
        <span className="mt-0.5 block text-sm text-muted-foreground">
          Another free Cense tool. Opens in a new tab.
        </span>
      </span>
      <span
        aria-hidden
        className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform group-hover:translate-x-0.5"
      >
        <svg
          viewBox="0 0 16 16"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 8h10M9 4l4 4-4 4" />
        </svg>
      </span>
    </a>
  );
}
