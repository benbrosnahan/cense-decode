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

## Run it

```bash
npm install
cp .env.example .env.local   # add ANTHROPIC_API_KEY
npm run dev
```

Built with Claude Code. Part of [Cense](https://cense.beehiiv.com).
