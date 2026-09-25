import { cn } from "@/lib/utils";

/**
 * A quiet placeholder bar for a field that has not streamed in yet. Sized to
 * roughly one line of the text it stands in for, so the card does not jump
 * much when the real text arrives.
 */
export function SkeletonLine({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "block h-3 rounded-full bg-foreground/[0.07] motion-safe:animate-pulse",
        className
      )}
    />
  );
}
