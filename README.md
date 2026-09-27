# Decode

**Live: [cense-decode.vercel.app](https://cense-decode.vercel.app)**

Paste anything money-related that confuses or stresses you. A bill, a loan disclosure,
a benefits form, a line from a statement you do not recognize. Decode returns three things:
a plain-language explanation, an honest read on whether this is actually worth worrying
about, and one concrete next step.

## Why it works this way

Most financial explainers answer the question you asked. The problem is that people who are
confused by a financial document usually cannot phrase the question correctly, which is the
whole reason they are stuck. So the input is not a question. The input is the document.

The second design decision is the worry meter. Explaining a document accurately is not the
same as telling someone whether to panic, and the panic is usually the real reason they
opened the tool. A technically correct explanation that leaves someone still anxious has
not done the job.

The third is the one-next-step limit. Giving someone five options when they are already
overwhelmed reliably produces zero actions.

## How it is built

- Next.js App Router, TypeScript, Tailwind, Framer Motion
- Anthropic API called server side only, from `src/app/api/decode/route.ts`. The key is never
  exposed to the client.
- `src/lib/fallback.ts` handles the case where the model call fails, so the tool degrades to
  something useful rather than to an error screen.
- No accounts, no database, nothing about the user is stored.

## Design overhaul (2026-09-27)

Branch `ux-overhaul`. The prompt, the model call and the scam clamp are unchanged.

- **Answer first, evidence second.** Results read in a fixed order: how urgent, what it
  means, the one thing to do, then the original with every decoded term marked where it
  appeared. Someone can stop reading at any point and still leave with what matters.
- **Your words, marked up** (`src/components/SourceMarkup.tsx`). Students cannot check an
  explanation against expertise they do not have, so the document is the check. Terms are
  tap-to-open and also listed in full, because a hover tooltip does not exist on a phone.
- **The urgency scale shows all three steps.** "Moderate" on its own had no scale. Still
  neutral ink only, no red, amber or green.
- **A failure is shown as a failure.** The safe fallback now carries `failure`, and the
  client shows an error with Try again and Edit what I sent. What was typed is never lost.
  Before, a failed decode rendered as a result with an urgency level.
- **Screenshots of any size.** Large images are scaled to 1568px on the long edge in the
  browser (`src/lib/image.ts`) instead of being rejected at 5 MB. Pasting an image works.
- **Privacy is stated at the point of upload**, with a prompt to cover account numbers.
  The old footer opened with "Your data stays on your device", which the next sentence
  contradicted. That line is gone.
- **Examples are documents, not questions**, matching the reasoning above.
- **Contrast.** Text colours are solid tokens. `foreground/50` on white measured 2.5:1.
- Geist is replaced by Bricolage Grotesque and Instrument Sans, shared with Loan Desk.
  `framer-motion` is no longer imported and can be removed from `package.json`.

## Run it

```bash
npm install
cp .env.example .env.local   # add ANTHROPIC_API_KEY
npm run dev
```

Part of [Cense](https://cense.beehiiv.com).
