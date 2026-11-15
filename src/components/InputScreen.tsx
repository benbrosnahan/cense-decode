"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Submission } from "@/types";
import { ImageError, prepareImage } from "@/lib/image";
import { EXAMPLES } from "@/lib/examples";
import { cn } from "@/lib/utils";

interface Props {
  /** Lives in the page, so what was typed survives a failed decode. */
  value: Submission;
  onChange: (next: Submission) => void;
  onSubmit: () => void;
}

/** Anthropic's privacy center: how long API data is kept. */
export const ANTHROPIC_PRIVACY =
  "https://privacy.claude.com/en/articles/7996866-how-long-do-you-store-my-organization-s-data";

/** The API reads the first 4,000 characters. Say so before it matters. */
const MAX_CHARS = 4000;
const WARN_AT = 3500;

export default function InputScreen({ value, onChange, onSubmit }: Props) {
  const { text, image } = value;
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  const canSubmit = !busy && (image !== null || text.trim().length > 0);
  const over = text.length > MAX_CHARS;

  async function handleFile(file: File | undefined | null) {
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      const prepared = await prepareImage(file);
      onChange({ text, image: prepared });
    } catch (e) {
      setError(
        e instanceof ImageError
          ? e.message
          : "We could not open that image. Try taking a screenshot of it instead."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="pt-7 sm:pt-12">
        <h1 className="text-balance font-display text-[2.3rem] font-bold leading-[1.04] tracking-tight text-foreground sm:text-6xl">
          Put the confusing money thing here.
        </h1>
        <p className="mt-3 max-w-xl text-pretty text-base leading-relaxed text-soft sm:mt-4 sm:text-lg">
          A loan email, a card offer, a line on a statement. You get it in
          plain words, how much it matters, and one thing to do next. No
          question is dumb here.
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (canSubmit) onSubmit();
        }}
        className="flex flex-col gap-3"
      >
        {/* One surface for every way in: type, paste, drop, or pick a file. */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            handleFile(e.dataTransfer.files?.[0]);
          }}
          className={cn(
            "rounded-3xl border-2 bg-card card-soft transition-colors",
            "focus-within:border-primary",
            dragOver ? "border-primary bg-secondary" : "border-border-strong"
          )}
        >
          <label htmlFor="source" className="sr-only">
            {image
              ? "Anything to add about this screenshot, optional"
              : "What you want decoded"}
          </label>
          <textarea
            id="source"
            ref={textRef}
            value={text}
            onChange={(e) => onChange({ text: e.target.value, image })}
            onPaste={(e) => {
              const file = Array.from(e.clipboardData.files).find((f) =>
                f.type.startsWith("image/")
              );
              if (file) {
                e.preventDefault();
                handleFile(file);
              }
            }}
            placeholder={
              image
                ? "Optional: where is this from, and which part is worrying you?"
                : "Paste or type it here"
            }
            rows={image ? 3 : 5}
            aria-describedby="source-help"
            className="block w-full resize-none rounded-t-3xl bg-transparent px-5 pb-2 pt-5 text-base leading-relaxed text-foreground outline-none placeholder:text-muted-foreground"
          />

          {image && (
            <div className="mx-4 mb-3 flex items-center gap-3 rounded-2xl border border-border bg-muted/60 p-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image.preview}
                alt="The screenshot you added"
                className="h-16 w-16 rounded-xl border border-border object-cover"
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-foreground">
                  {image.name}
                </span>
                <span className="block text-sm text-muted-foreground">
                  Screenshot added
                </span>
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onChange({ text, image: null })}
              >
                Remove
              </Button>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 border-t border-border px-3 py-2.5">
            {!image && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={busy}
                onClick={() => fileInputRef.current?.click()}
              >
                <ImageIcon />
                {busy ? "Opening…" : "Add a screenshot"}
              </Button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              tabIndex={-1}
              aria-hidden
              onChange={(e) => {
                handleFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            {text.length >= WARN_AT && (
              <span
                className={cn(
                  "tabular ml-auto pr-2 text-sm",
                  over ? "font-semibold text-destructive" : "text-muted-foreground"
                )}
              >
                {text.length.toLocaleString()} of {MAX_CHARS.toLocaleString()}
              </span>
            )}
          </div>
        </div>

        <div id="source-help" className="flex flex-col gap-1.5 px-1">
          {error && (
            <p role="alert" className="text-sm font-semibold text-destructive">
              {error}
            </p>
          )}
          {over && (
            <p className="text-sm text-soft">
              That is longer than we can read in one go. We will decode the
              first {MAX_CHARS.toLocaleString()} characters, so put the part
              that worries you near the top.
            </p>
          )}
          {/* Said here, before the student presses Decode it, not only in a
              footer nobody reaches. Anthropic's terms for API customers,
              checked 2026-11-15: inputs and outputs are deleted within 30
              days (up to two years if a safety system flags them) and are not
              used for training by default. */}
          <p className="text-sm leading-relaxed text-muted-foreground">
            <strong className="font-semibold text-foreground">
              Cover account numbers and your Social Security number first.
            </strong>{" "}
            What you send goes to Anthropic&apos;s API so its AI can read it.
            Anthropic keeps it for up to 30 days, longer only if its safety
            checks flag it, and does not train its AI on it.{" "}
            <a
              href={ANTHROPIC_PRIVACY}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-primary underline underline-offset-2 hover:no-underline"
            >
              Anthropic&apos;s data terms
            </a>
          </p>
        </div>

        <Button type="submit" size="lg" className="w-full" disabled={!canSubmit}>
          Decode it
        </Button>
      </form>

      {!image && !text && (
        <div className="flex flex-col gap-2.5">
          <h2 className="px-1 text-sm font-semibold text-foreground">
            Nothing on hand? Try one of these.
          </h2>
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((ex) => (
              <button
                key={ex.label}
                type="button"
                onClick={() => {
                  onChange({ text: ex.text, image: null });
                  textRef.current?.focus();
                }}
                className="min-h-11 rounded-full border border-border-strong bg-card px-4 text-sm font-semibold text-foreground transition-colors hover:border-primary hover:bg-secondary"
              >
                {ex.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ImageIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="3" width="12" height="10" rx="2" />
      <circle cx="5.8" cy="6.6" r="1.1" />
      <path d="m2.5 11.5 3.3-3 2.6 2.2 2-1.7 3.1 2.7" />
    </svg>
  );
}
