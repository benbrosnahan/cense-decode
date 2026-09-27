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
        "block h-3.5 rounded-full bg-border motion-safe:animate-pulse",
        className
      )}
    />
  );
}

/** Small caps label above a section. */
export function Eyebrow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground",
        className
      )}
    >
      {children}
    </p>
  );
}
