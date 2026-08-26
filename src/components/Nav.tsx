export default function Nav() {
  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <a
            href="https://cense.beehiiv.com"
            className="flex items-center gap-2 rounded-lg hover:opacity-75 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            aria-label="Cense newsletter home"
          >
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground text-xs font-bold">C</span>
            </div>
            <span className="font-semibold text-foreground">Cense</span>
          </a>
          <span className="text-muted-foreground/60">/</span>
          <span className="text-muted-foreground text-sm">Decode</span>
        </div>
      </div>
    </header>
  );
}
