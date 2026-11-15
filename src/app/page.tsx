"use client";

import { useState, useCallback, useRef } from "react";
import InputScreen from "@/components/InputScreen";
import ResultsScreen from "@/components/ResultsScreen";
import ErrorScreen from "@/components/ErrorScreen";
import {
  AppView,
  DecodeFailure,
  DecodeRequest,
  DecodeResult,
  DecodeStreamEvent,
  PartialDecode,
  Submission,
} from "@/types";

const EMPTY: Submission = { text: "", image: null };

function toRequest(s: Submission): DecodeRequest | null {
  const text = s.text.trim();
  if (s.image) {
    return {
      mode: "image",
      image: { mediaType: s.image.mediaType, dataBase64: s.image.dataBase64 },
      text: text || undefined,
    };
  }
  return text ? { mode: "text", text } : null;
}

export default function Home() {
  const [view, setView] = useState<AppView>("input");
  // What the student is writing. Held here, not in the input screen, so a
  // failed decode never costs them what they typed.
  const [draft, setDraft] = useState<Submission>(EMPTY);
  // What was actually sent, so results can quote it back.
  const [sent, setSent] = useState<Submission>(EMPTY);
  // While streaming this holds the latest partial; once the final event lands
  // it holds the full, normalized DecodeResult.
  const [result, setResult] = useState<PartialDecode | DecodeResult | null>(null);
  const [isFinal, setIsFinal] = useState(false);
  const [failure, setFailure] = useState<DecodeFailure>("unavailable");
  const abortRef = useRef<AbortController | null>(null);

  const run = useCallback(async (submission: Submission) => {
    const req = toRequest(submission);
    if (!req) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setSent(submission);
    setResult({});
    setIsFinal(false);
    // Straight to the results layout, with placeholders. There is no separate
    // loading screen to flash past, and the page does not rearrange itself
    // when the first words arrive.
    setView("results");
    window.scrollTo({ top: 0 });

    const fail = (why: DecodeFailure) => {
      if (controller.signal.aborted) return;
      setFailure(why);
      setView("error");
      window.scrollTo({ top: 0 });
    };

    const finish = (final: DecodeResult) => {
      if (controller.signal.aborted) return;
      // The server's safe fallback means nothing was analyzed. Show that as
      // an error with a retry, never as a decode.
      if (final.failure) {
        fail(final.failure);
        return;
      }
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
        fail(res.status === 429 ? "rate-limited" : "unavailable");
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
      if (!gotFinal) fail("unavailable");
    } catch {
      if (gotFinal || controller.signal.aborted) return;
      fail(
        typeof navigator !== "undefined" && navigator.onLine === false
          ? "offline"
          : "unavailable"
      );
    }
  }, []);

  /** Back to the input. Keeps the draft unless they asked for a clean start. */
  const backToInput = useCallback((keepDraft: boolean) => {
    abortRef.current?.abort();
    abortRef.current = null;
    setResult(null);
    setIsFinal(false);
    if (!keepDraft) setDraft(EMPTY);
    setView("input");
    window.scrollTo({ top: 0 });
  }, []);

  return (
    <>
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-16 sm:px-6">
        {view === "input" && (
          <InputScreen
            value={draft}
            onChange={setDraft}
            onSubmit={() => run(draft)}
          />
        )}

        {view === "results" && result && (
          <ResultsScreen
            result={result}
            isFinal={isFinal}
            source={sent}
            onDecodeAnother={() => backToInput(false)}
            onStop={() => backToInput(true)}
          />
        )}

        {view === "error" && (
          <ErrorScreen
            failure={failure}
            onRetry={() => run(sent)}
            onEdit={() => backToInput(true)}
          />
        )}
      </main>

      <footer className="mt-auto border-t border-border">
        <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
          <p className="text-sm font-semibold leading-relaxed text-foreground">
            No account, no database, no tracking. We do not keep what you send.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            What you send goes encrypted to Anthropic&apos;s API. Anthropic
            does not train on it by default and deletes it within 30 days, or
            within two years if it is flagged for a safety review. A
            plain-language explainer, not financial advice.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Built by{" "}
            <a
              href="https://cense.beehiiv.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-primary underline underline-offset-2 hover:no-underline"
            >
              Cense
            </a>
            , for students, by students.
          </p>
        </div>
      </footer>
    </>
  );
}
