"use client";

import { useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import InputScreen from "@/components/InputScreen";
import LoadingScreen from "@/components/LoadingScreen";
import ResultsScreen from "@/components/ResultsScreen";
import { AppView, DecodeRequest, DecodeResult } from "@/types";
import { getFallbackDecode } from "@/lib/fallback";

export default function Home() {
  const [view, setView] = useState<AppView>("input");
  const [result, setResult] = useState<DecodeResult | null>(null);

  const handleSubmit = useCallback(async (req: DecodeRequest) => {
    setView("loading");
    window.scrollTo({ top: 0, behavior: "smooth" });
    try {
      const res = await fetch("/api/decode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
      });
      if (!res.ok) {
        // 429 and other handled errors still return JSON; show a safe result.
        setResult(getFallbackDecode());
      } else {
        setResult((await res.json()) as DecodeResult);
      }
    } catch {
      setResult(getFallbackDecode());
    }
    setView("results");
  }, []);

  const handleDecodeAnother = useCallback(() => {
    setResult(null);
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
