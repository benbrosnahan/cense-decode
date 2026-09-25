"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { DecodeRequest } from "@/types";
import { fileToBase64 } from "@/lib/utils";

interface Props {
  onSubmit: (req: DecodeRequest) => void;
}

const EXAMPLE_CHIPS = [
  "What's the difference between APY and APR?",
  "What does 'unsubsidized' mean on my student loan?",
  "My credit card APR is 26.99%, is that bad?",
  "What's an ETF?",
];

const ALLOWED = ["image/png", "image/jpeg", "image/webp"];

export default function InputScreen({ onSubmit }: Props) {
  const [text, setText] = useState("");
  const [image, setImage] = useState<{
    preview: string;
    mediaType: string;
    dataBase64: string;
    name: string;
  } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canSubmit = image !== null || text.trim().length > 0;

  async function handleFile(file: File | undefined | null) {
    if (!file) return;
    if (!ALLOWED.includes(file.type)) {
      setError("Please use a PNG, JPG, or WebP image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("That image is over 5 MB. Try a smaller screenshot.");
      return;
    }
    setError(null);
    const { dataBase64, mediaType } = await fileToBase64(file);
    setImage({
      preview: URL.createObjectURL(file),
      mediaType,
      dataBase64,
      name: file.name,
    });
  }

  function handleSubmit() {
    if (image) {
      onSubmit({
        mode: "image",
        image: {
          mediaType: image.mediaType as "image/png" | "image/jpeg" | "image/webp",
          dataBase64: image.dataBase64,
        },
        text: text.trim() || undefined,
      });
    } else if (text.trim()) {
      onSubmit({ mode: "text", text: text.trim() });
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center pt-4">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Confused or stressed by something money-related?
        </h1>
        <p className="mt-2 text-sm sm:text-base text-muted-foreground leading-relaxed max-w-md mx-auto">
          Paste it or drop a screenshot. We will tell you what it actually means,
          whether you should worry, and the one thing to do next. No question is
          dumb here.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={
            image
              ? "Optional: add any context about this screenshot. Where is it from? What part is worrying you?"
              : "Paste a confusing term, a sentence from your bank, a credit card offer, or anything money-related..."
          }
          rows={image ? 3 : 5}
          className="w-full rounded-xl border border-input bg-card p-4 text-base leading-relaxed transition-colors outline-none resize-none placeholder:text-muted-foreground/60 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />

        {/* Image dropzone */}
        {image ? (
          <div className="flex items-center gap-3 rounded-xl border border-input bg-card p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image.preview}
              alt="Screenshot to decode"
              className="h-14 w-14 rounded-lg object-cover ring-1 ring-foreground/10"
            />
            <span className="flex-1 text-sm text-foreground/80 truncate">
              {image.name}
            </span>
            <button
              onClick={() => setImage(null)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors px-2 py-2 -my-2"
            >
              Remove
            </button>
          </div>
        ) : (
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
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            role="button"
            tabIndex={0}
            aria-label="Add a screenshot to decode"
            className={`flex cursor-pointer outline-none focus-visible:ring-3 focus-visible:ring-ring/50 items-center justify-center gap-2 rounded-xl border border-dashed p-4 text-sm transition-colors ${
              dragOver
                ? "border-ring bg-accent/60 text-foreground"
                : "border-input text-muted-foreground hover:bg-accent/40"
            }`}
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5V18a2 2 0 002 2h14a2 2 0 002-2v-1.5M7.5 9L12 4.5 16.5 9M12 4.5V15"
              />
            </svg>
            Drop a screenshot, or choose one to upload
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </div>
        )}

        {error && <p className="text-xs text-destructive pl-1">{error}</p>}
      </div>

      {/* Example chips */}
      {!image && (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-muted-foreground pl-1">
            Not sure where to start? Try one:
          </p>
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_CHIPS.map((chip) => (
              <button
                key={chip}
                onClick={() => setText(chip)}
                className="rounded-full border border-border bg-card px-3 py-1.5 text-xs text-foreground/80 hover:bg-accent transition-colors"
              >
                {chip}
              </button>
            ))}
          </div>
        </div>
      )}

      <motion.div whileTap={{ scale: 0.99 }}>
        <Button
          size="lg"
          className="w-full"
          disabled={!canSubmit}
          onClick={handleSubmit}
        >
          Decode it
        </Button>
      </motion.div>
    </div>
  );
}
