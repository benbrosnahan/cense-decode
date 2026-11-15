export default function Nav() {
  return (
    <header className="mx-auto flex w-full max-w-2xl items-center justify-between gap-3 px-4 pt-5 sm:px-6 sm:pt-7">
      <nav
        aria-label="Cense"
        className="flex items-baseline gap-1.5 whitespace-nowrap font-display text-lg font-bold sm:text-xl"
      >
        <a
          href="https://cense.beehiiv.com"
          // 40px tall to tap, with the extra height taken from the margins
          // so the header does not move.
          className="-my-1.5 inline-flex min-h-10 items-center rounded-md text-brand-orange hover:underline"
          aria-label="Cense newsletter home"
        >
          Cense
        </a>
        <span className="text-foreground">Decode</span>
      </nav>
    </header>
  );
}
