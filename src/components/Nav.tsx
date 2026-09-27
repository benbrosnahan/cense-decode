export default function Nav() {
  return (
    <header className="mx-auto flex w-full max-w-2xl items-center justify-between gap-3 px-4 pt-5 sm:px-6 sm:pt-7">
      <p className="flex items-baseline gap-1.5 whitespace-nowrap font-display text-lg font-bold sm:text-xl">
        <a
          href="https://cense.beehiiv.com"
          className="rounded-md text-brand-orange hover:underline"
          aria-label="Cense newsletter home"
        >
          Cense
        </a>
        <span className="text-foreground">Decode</span>
      </p>
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-foreground">
        <svg
          aria-hidden
          viewBox="0 0 16 16"
          className="h-3.5 w-3.5 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M8 1.8 13 4v3.6c0 3-2 5.4-5 6.6-3-1.2-5-3.6-5-6.6V4l5-2.2Z" />
        </svg>
        Nothing stored
      </span>
    </header>
  );
}
