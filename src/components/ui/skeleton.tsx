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

/**
 * Small caps label above a section. On the results screen it is the
 * section's heading (h2, or h3 inside a section), so a screen reader can
 * jump between "How urgent this is", "In plain words" and the rest.
 */
export function Eyebrow({
  children,
  className,
  as: Tag = "p",
}: {
  children: React.ReactNode;
  className?: string;
  as?: "p" | "h2" | "h3";
}) {
  return (
    <Tag
      className={cn(
        "text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground",
        className
      )}
    >
      {children}
    </Tag>
  );
}
