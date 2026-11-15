# Decode by Cense audit, 2026-11-15

Decode takes a pasted message or a screenshot of something money-related and returns, from the Anthropic API, a plain-language explanation, an urgency read (Low, Moderate, Higher), the jargon defined and marked in the student's own words, one next step, and sometimes a link to another Cense tool. Decode computes no figures of its own, so this audit treated every claim it makes and every rule that shapes what the model says as the money surface: the urgency calibration in the prompt, the server's scam and urgency clamp, the fallback, the privacy statements, and where "go deeper" sends a student. It made one real call on the live site and one through a local build, ran the Cense audit kit on the live site and on a local production build of `audit-redesign`, and wrote a 77-test Playwright suite that drives the real route against a local stand-in for the Anthropic API.

The 2026-09-27 redesign holds up: Lighthouse scores 99 to 100, axe finds one contrast failure, no secret reaches the browser, a failed decode is shown as a failure, and the live model answers correctly. What went wrong was in the checks around the model. The server's scam clamp, which exists so scam wording can never come back calm, missed 8 of 10 regulator-phrased scam and urgency messages and never saw a screenshot's words, and when it did fire it kept the model's "you can relax" headline (MONEY-01). A decode cut off at the token cap was dressed up as finished (MONEY-02). The privacy footer overstated Anthropic's terms (SEC-02), and Next 16.2.7 carries critical advisories (SEC-05). Every P0 and P1 is fixed on this branch, each with a test that failed on the unchanged build and passes now. There were no P0s.

## Scoreboard

Live: `node run.mjs --url https://cense-decode.vercel.app/ --runs 1` ([results/2026-11-15-live](results/2026-11-15-live/SUMMARY.md)). After: the same against a production build of this branch on port 3208 ([results/2026-11-15-local-after](results/2026-11-15-local-after/SUMMARY.md)). One Lighthouse run per page.

| Measure | Live before | Local after |
|---|---|---|
| Lighthouse perf, phone / desktop | 99 / 100 | 100 / 100 |
| Lighthouse accessibility, best practices, SEO | 100, 100, 100 | 100, 100, 100 |
| CLS, first visit, phone | 0 | 0 |
| Security (headers) | 71 (27) | Not comparable: local is plain HTTP, which the kit scores as no headers. Header check: 4 good (score 40) live, 8 good (score 80) after |
| GEO | 60 | 84 |
| Words in server HTML | 161, 100% parity | 163, 100% parity |
| Design heuristics | 85 (B) | 89 (B) |
| Sideways scroll, 30 page and width pairs | 0 | 0 |
| Readable, first visit, slow 4G, 4x CPU | 1.52 s | 1.52 s (local host, not like-for-like) |
| Budgets | 26 of 26 pass | 26 of 26 pass |
| Playwright | no suite | 77 tests, all pass. 74 existed when the unchanged build was tested: 34 failed there and 40 passed ([before run](results/2026-11-15-local-before/tests-with-known-issues-shown.txt)). MONEY-05's test and the 320px test were confirmed failing on the build before their fixes; A11Y-02's was written after its fix |

The kit was written for Loan Desk: `flow` and `inp` cannot drive this app, and `design`, `ux` and `responsive` measure the first screen only. First-load JS is not measured: Next 16 no longer prints the table the kit reads.

## The model

`claude-opus-4-8` is current. The Models API returned it on 2026-11-15 (created 2026-05-28, 1M context, 128K output), and a real decode on the live site finished in 13.5 s. Anthropic lists it as active, with no retirement date. The production deployment may set `DECODE_MODEL` to something else; Vercel's environment variables were not read.

The current Opus is `claude-opus-5-5`, at $4 / $20 per million tokens against $5 / $25. It is not a drop-in: it rejects the forced `tool_choice` this route uses (the call would need `tool_choice: auto` with `strict: true` and a prompt instruction), its thinking cannot be switched off, so it adds thinking tokens at its default `medium` effort, and the prompt would need re-checking. Whether a decode gets cheaper depends on those thinking tokens. Left unchanged for Ben.

## Hand-checked decodes

Decode's answers are written by the model, so the check is whether a real answer is right against the primary source, and whether the server keeps a wrong one from reaching a student.

| Input | Expected, from the source | What Decode did |
|---|---|---|
| "What does unsubsidized mean on my student loan?" (live site, real model) | Interest accrues from disbursement, including in school; unpaid interest is added to the balance when repayment begins (studentaid.gov, the Direct Loan MPN). Not urgent. Loan Desk is the right next tool | Correct facts, Moderate, Loan Desk. The term came back as "unsubsidized loan", which is not in the student's words, so nothing was marked (UX-01). Its analogy says the government pays a subsidized loan's interest "until you graduate"; it also pays during the six-month grace period and deferment, so this understates the benefit (P3, model wording) |
| The past-due example: 32 days late, $39 fee, $74 minimum, penalty APR up to 29.99% (local build, real model) | Higher: a fee and a clock, per the prompt's own rule. A penalty rate can reach the existing balance only once a payment is 60 days late (12 CFR 1026.55(b)(4)), so paying the minimum now avoids that trigger | Higher; every figure copied correctly; "pay at least the $74 minimum today to stop the penalty rate" matches the rule. It also offered "Find the credit card that fits you" (MONEY-05) |
| Ten scam and urgency messages phrased from FTC and Federal Student Aid guidance, with the model told to call each one calm (stand-in API) | Never Low, and never a "relax" headline | Before: 8 of 10 came back Low; the other 2 rose to Moderate but kept "Nothing here to act on, you can relax." A screenshot was never checked. After: all Moderate with a check-first headline (MONEY-01) |
| "What does APR stand for on a credit card statement?" told calm | Low; the clamp should not fire on ordinary words | Low, before and after |

The oracle in `tests/money.spec.mjs` is written from the regulators' descriptions, not from the app's pattern list, and the go-deeper addresses come from the live tools checked by page title, not from `src/lib/routes.ts`.

## Issues

| ID | Sev | Issue | Status | Test | Source |
|---|---|---|---|---|---|
| MONEY-01 | P1 | Scam and urgency clamp missed most real phrasings and every screenshot; a lifted read kept "you can relax" | Fixed | money.spec | https://consumer.ftc.gov/articles/how-recognize-and-avoid-phishing-scams, https://consumer.ftc.gov/articles/avoiding-and-reporting-gift-card-scams, https://consumer.ftc.gov/articles/how-avoid-scam, https://studentaid.gov/resources/scams |
| MONEY-02 | P1 | A decode cut off at max_tokens shown as finished, with placeholder text and a default "nothing here is urgent" | Fixed | money.spec | App rule; the route only logged a warning |
| MONEY-03 | P1 | Prompt let the model state rates, limits and repayment plans from memory; an example hard-coded "18 to 28 percent" | Fixed | money.spec | https://studentaid.gov/announcements-events/big-updates, https://www.ed.gov/media/document/rise-final-rule-fact-sheet-113947.pdf |
| MONEY-05 | P1 | A red result still offered another tool: a past-due notice got the card picker | Fixed | money.spec | Real decode, 2026-11-15; https://www.consumerfinance.gov/rules-policy/regulations/1026/55/ |
| SEC-02 | P1 | Privacy copy overstated Anthropic's terms: "never used for AI training", "up to 30 days ... then deletes it", badge "Nothing stored" | Fixed | security-seo.spec | https://privacy.claude.com/en/articles/7996866-how-long-do-you-store-my-organization-s-data, https://privacy.claude.com/en/articles/7996868-is-my-data-used-for-model-training |
| SEC-03 | P1 | Cross-site text/plain posts reached the model, so any page could spend tokens through its visitors | Fixed | api.spec | Live check 2026-11-15: 400, not 403 |
| SEC-05 | P1 | Next 16.2.7 has critical advisories, including RCE in the image optimizer and in next/og | Fixed: 16.4.6. Live stays on 16.2.7 until deployed | security-seo.spec, npm audit (production: 0) | https://github.com/advisories/GHSA-2xp9-vwfh-vxw4, https://github.com/advisories/GHSA-vcvr-r3jv-pc5j |
| A11Y-01 | P1 | An opened term was white on #C1652E, 4.06:1 | Fixed: #A8531F, 5.35:1 | a11y.spec (axe) | WCAG 1.4.3 |
| MONEY-04 | P2 | Calibration examples forecast ("not a sign of a storm") and sounded certain ("begin with one broad ETF") | Fixed | money.spec | The prompt's own SAFETY rules |
| SEC-01 | P2 | No CSP, nosniff, frame, referrer or permissions headers; live headers 27 of 100 | Fixed | security-seo.spec | Kit |
| SEC-04 | P2 | Route answers cacheable: errors "public, max-age=0", the stream "no-cache" | Fixed: no-store | api.spec | |
| SEO-01 | P2 | No canonical, link image, Twitter card, JSON-LD, robots.txt or sitemap; GEO 60 | Fixed: GEO 84 | security-seo.spec | Kit |
| UX-01 | P2 | Reworded terms were not marked, so the signature element could show nothing | Fixed | ux.spec | Live call, 2026-11-15 |
| A11Y-02 | P3 | Results had no h1 and no section headings; no nav landmark | Fixed | a11y.spec | WCAG 1.3.1 |
| A11Y-03 | P3 | The Cense link was a 28px target | Fixed: 40px | a11y.spec | Cense floors |
| SEC-06 | P3 | Rate limiter swept only past 5,000 keys and had no cap | Fixed. It is still per instance: needs Ben | limiter.spec | https://vercel.com/docs/headers/request-headers |
| SEC-07 | P3 | A moderate advisory in minimatch under typescript-eslint, dev only | Known, accepted | npm audit | |
| SCOPE-01 | P3 | For a screenshot the clamp reads only the model's description; a cue the model neither flags nor describes is not caught. While streaming, a Low can show before a cue in the term list lifts it | Known | none | |
| UX-02 | P3 | A 413 (image too large) shows "Nothing is wrong with what you sent"; images are shrunk in the browser first, so this should not happen | Known | none | |
| DX-01 | P3 | Unused framer-motion and geist packages; no lint, typecheck or test scripts | Fixed | | |

### MONEY-01 (P1)
Evidence: the pattern list matched exact phrases on word boundaries, so "gift card" missed "gift cards", "crypto" missed "cryptocurrency" and Bitcoin, and payment apps, login requests, "frozen", "past due", "late fee" and paid loan-forgiveness help were not listed at all. For a screenshot the server checked only "[screenshot]" and the optional note. When it did lift a green, the model's headline stayed, so "Moderate" sat above "Nothing here to act on, you can relax." The prompt already tells the model to call these red, so this is the check on the model, and the stand-in API tests the worst case. Fix: `src/lib/cues.ts` matches word stems from the FTC and Federal Student Aid descriptions, the check also runs on the model's own explanation, headline, reasons and terms (the only place a screenshot's words appear), and a lifted read gets "Some of this wording often shows up in scams or urgent money requests. Check it with the real company before you act." The floor is Moderate, not Higher: a definition question that contains "wire transfer" should not alarm anyone. The model's next step is left as written.

### MONEY-02 (P1)
Evidence: on `stop_reason: max_tokens` the route logged a warning and served the partial tool input. `normalizeResult` filled the gaps with the fallback's text ("We could not read this clearly just now", "Try again in a moment") and, with the worry object missing, a default Moderate headed "Worth understanding, but nothing here is urgent." Fix: any stop other than `tool_use` or `end_turn` is the failure, and `normalizeResult` returns the failure when the explanation, a valid urgency read or the next step is missing. The page shows its error with Try again; nothing typed is lost.

### MONEY-03, MONEY-04 (P1, P2)
The prompt never told the model where its numbers may come from. Federal student loan rules changed on 2026-07-01 (RAP and the Tiered Standard plan, new borrowing limits, Grad PLUS ended for new borrowers), so a model answering from memory can describe plans a student cannot use. Its card example said "that 18 to 28 percent interest", which the model could repeat for an offer with different terms. Fix: use only numbers in the input; never state a rate, limit, bracket, deadline or which repayment plans exist from memory; point to studentaid.gov, the servicer or the company. Two calibration examples were softened: a one-day market drop no longer "is not a sign of a storm", and the ETF step says many beginners choose a broad fund instead of telling the student to. The live answer after this change was not re-checked.

### MONEY-05 (P1)
A red read means "slow down and verify", and the one next step is the whole answer. The real past-due decode was classed `credit-card`, so it offered a card picker to a student 32 days behind. Fix: no go-deeper link on a red read, and the prompt says a bill, statement or notice on a card the student already has is `general-finance`.

### SEC-01 to SEC-06
Headers: CSP (self, inline for Next's bootstrap, blob: images for the screenshot preview), nosniff, X-Frame-Options DENY, a strict referrer policy and a Permissions-Policy. The privacy notes now say Anthropic does not train on what is sent by default and deletes it within 30 days, or within two years if it is flagged for a safety review; the badge says "Nothing saved by us". Route: 403 for another site's Origin or Sec-Fetch-Site, input validated before the key check, 400 for a body that is not JSON, only error messages logged and nothing from them sent to the browser, a 45 s SDK timeout with one retry, no-store on every answer, and a limiter that sweeps each window and holds at most 10,000 addresses. Vercel overwrites x-forwarded-for, so the address cannot be spoofed, but each serverless instance counts on its own. Next 16.2.7 to 16.4.6 (`npm audit fix` without `--force`; production dependencies report 0 advisories).

## Design

Direction: a light pass only. Decode is one of the two reference apps and keeps its 2026-09-27 design: cream #FFFCEC, green #275B2D, text orange #A8531F, Bricolage Grotesque headlines over Instrument Sans, answer first and evidence second. The signature element is unchanged: the student's own words, marked up, with each decoded term highlighted where it was written. Changes: the opened term's contrast, real headings behind the existing labels, a nav landmark and a 40px target for the Cense link, the badge copy, shorter privacy notes, and a link-preview image that shows a marked-up line. The kit's final scan caught the longer badge pushing the page 1px wide at 320px; the badge's icon now drops below 360px, with a test. Before and after screenshots at 375x812 and 1440x900 are on disk in `screenshots/` (not in git).

## What already worked
The live model ID; no key, model name or secret in any browser script or in git history; the no-key and API-error paths serve the failure without echoing anything; a failed decode is an error screen that keeps what was typed; all five go-deeper links resolve to the right live Cense tool; the 5-a-minute limit; streaming that never shows an unclamped urgency level; no sideways scroll at 320px on the live site; axe clean apart from A11Y-01.

## What Ben needs to decide
1. Merge and deploy `audit-redesign`. Production still runs Next 16.2.7 and the overstated privacy footer.
2. The model: keep `claude-opus-4-8`, or move to `claude-opus-5-5` (cheaper per token, needs the tool-choice change and a quality check).
3. A real rate limit: a Vercel Firewall rule on `/api/decode` or a shared store, and a monthly spend cap on the Anthropic key. The in-memory limit is per instance.
4. The clamp's floor: Moderate (as built) or Higher, for scam wording the model called Low.
5. No go-deeper link on red results (MONEY-05). Easy to reverse.
6. The badge copy, "Nothing saved by us".

## Not covered
Image mode with a real model (screenshots were tested through the stand-in API only); the model's wording after the prompt changes; how the new CSP and Permissions-Policy behave on Vercel previews and in a phone's photo picker; a real screen reader; the kit's Loan Desk-specific steps (`flow`, `inp`).

## Method
Read every source file; listed every claim, rule and link; checked them against Anthropic's privacy center and model list, studentaid.gov, the Department of Education, Regulation Z and FTC guidance; one real call on the live site and one through the local build; a cross-site POST to the live route with an empty body to confirm SEC-03 without spending a call; the kit's read-only live scan. The suite was written against intended behavior, run on the unchanged build with known issues shown, then each issue was fixed and its `knownIssue()` removed.
