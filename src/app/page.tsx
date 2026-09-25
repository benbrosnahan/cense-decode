"use client";

import { useState, useCallback, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import InputScreen from "@/components/InputScreen";
import LoadingScreen from "@/components/LoadingScreen";
import ResultsScreen from "@/components/ResultsScreen";
import {
  AppView,
  DecodeRequest,
  DecodeResult,
  DecodeStreamEvent,
  PartialDecode,
} from "@/types";
import { getFallbackDecode } from "@/lib/fallback";

export default function Home() {
  const [view, setView] = useState<AppView>("input");
  // While streaming this holds the latest partial; once the final event lands
  // it holds the full, normalized DecodeResult.
  const [result, setResult] = useState<PartialDecode | DecodeResult | null>(null);
  const [isFinal, setIsFinal] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const handleSubmit = useCallback(async (req: DecodeRequest) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setResult(null);
    setIsFinal(false);
    setView("loading");
    window.scrollTo({ top: 0, behavior: "smooth" });

    const finish = (final: DecodeResult) => {
      if (controller.signal.aborted) return;
      setResult(final);
      setIsFinal(true);
      setView("results");
    };

    let gotFinal = false;
    const handleLine = (line: string) => {
      if (!line.trim() || gotFinal) return;
      let event: DecodeStreamEvent;
      try {
        event = JSON.parse(line) as DecodeStreamEvent;
      } catch {
        return; // ignore a malformed line; the final event still decides
      }
      if (event.type === "final") {
        gotFinal = true;
        finish(event.data);
      } else if (event.type === "partial" && !controller.signal.aborted) {
        setResult(event.data);
        // Leave the loading screen as soon as there is something to read.
        if (event.data.plainLanguage?.trim()) setView("results");
      }
    };

    try {
      const res = await fetch("/api/decode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        // 429 and other handled errors still return JSON; show a safe result.
        finish(getFallbackDecode());
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        lines.forEach(handleLine);
      }
      buffer += decoder.decode();
      handleLine(buffer);

      // The stream ended without a final event: never leave a half-written
      // (and worry-less) result on screen.
      if (!gotFinal) finish(getFallbackDecode());
    } catch {
      if (!gotFinal) finish(getFallbackDecode());
    }
  }, []);

  const handleDecodeAnother = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setResult(null);
    setIsFinal(false);
    setView("input");
  }, []);

  return (
    <>
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8 pb-12 flex-1 w-full">
        <AnimatePresence mode="wait">
          {view === "input" && (
            <motion.div
              key="input"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.28, ease: "easeInOut" }}
            >
              <InputScreen onSubmit={handleSubmit} />
            </motion.div>
          )}

          {view === "loading" && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.28, ease: "easeInOut" }}
            >
              <LoadingScreen />
            </motion.div>
          )}

          {view === "results" && result && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.28, ease: "easeInOut" }}
            >
              <ResultsScreen
                result={result}
                isFinal={isFinal}
                onDecodeAnother={handleDecodeAnother}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="border-t border-border/50 bg-card/50 mt-auto">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Built by{" "}
                <span className="font-medium text-foreground/60">Cense</span>
              </p>
              <p className="text-xs text-muted-foreground">
                For students, by students
              </p>
            </div>
            <div className="border-t border-border/50 pt-3">
              <p className="text-[11px] text-muted-foreground/70 leading-relaxed">
                <span className="font-medium text-muted-foreground">
                  Your data stays on your device.
                </span>{" "}
                No account, no database, no tracking. When we decode something,
                the text or image you submit is sent encrypted to Anthropic&apos;s
                API. Anthropic may retain it for up to 30 days for safety
                monitoring, then deletes it. It is never used for AI training.
                This is a plain-language explainer, not financial advice.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
