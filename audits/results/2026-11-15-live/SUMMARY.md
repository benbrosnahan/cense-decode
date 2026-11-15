# Audit summary

- Target: https://cense-decode.vercel.app/ (given with --url)
- Started: 2026-11-15T18:44:13.071Z
- Command: `node run.mjs --url https://cense-decode.vercel.app/ --runs 1`
- Budgets: PASS: 26 passed, 0 failed, 2 not measured

| Step | Result | Time |
|---|---|---|
| lighthouse | ok | 27.3 s |
| flow | failed: mobile: clickText: no visible control "Look around with example loans"; desktop: clickText: no visible control "Look around with example loans" | 16 s |
| security | ok | 0.2 s |
| geo | ok | 11.4 s |
| design | partial: form-errors-desktop: clickText: no visible control "Add my first loan"; form-errors-mobile: clickText: no visible control "Add my first loan"; plans-desktop: clickTab: no section button for plans; 5 more | 50.6 s |
| ux | partial: form-errors-desktop: clickText: no visible control "Add my first loan"; form-errors-mobile: clickText: no visible control "Add my first loan"; plans-desktop: clickTab: no section button for plans; 5 more | under 0.1 s |
| tools | ok | 1.1 s |
| responsive | partial: form-errors@320: clickText: no visible control "Add my first loan"; form-errors@375: clickText: no visible control "Add my first loan"; form-errors@768: clickText: no visible control "Add my first loan"; 17 more | 57.7 s |
| inp | failed: cpu1x loans=8 run1: clickTab: no section button for plans; cpu1x loans=8 run2: clickTab: no section button for plans; cpu1x loans=25 run1: clickTab: no section button for plans; 9 more | 23.7 s |
| readable | ok | 11.2 s |

## Scoreboard

| Page | Perf | A11y | BP | SEO | LCP | FCP | CLS |
|---|---|---|---|---|---|---|---|
| Empty, mobile | 99 | 100 | 100 | 100 | 815 ms | 815 ms | 0 |
| Empty, desktop | 100 | 100 | 100 | 100 | 225 ms | 225 ms | 0 |
| Seeded, mobile | 100 | 100 | 100 | 100 | 776 ms | 776 ms | 0 |
| Seeded, desktop | 100 | 100 | 100 | 100 | 263 ms | 263 ms | 0 |

Median of 1 Lighthouse run per page, chosen by performance score. Empty is a first visit; seeded has the eight-loan fixture in localStorage before load. TBT: empty, mobile 97 ms, empty, desktop 0 ms, seeded, mobile 34 ms, seeded, desktop 0 ms.

## Budgets

| Budget | Measured | Limit | Result |
|---|---|---|---|
| Performance, empty, mobile | 99 | ≥ 90 | pass |
| Accessibility, empty, mobile | 100 | ≥ 100 | pass |
| Best practices, empty, mobile | 100 | ≥ 95 | pass |
| SEO, empty, mobile | 100 | ≥ 100 | pass |
| LCP, empty, mobile | 815 ms | ≤ 2500 ms | pass |
| FCP, empty, mobile | 815 ms | ≤ 1800 ms | pass |
| CLS, empty, mobile | 0 | ≤ 0.1 | pass |
| TBT, empty, mobile | 97 ms | ≤ 200 ms | pass |
| Performance, empty, desktop | 100 | ≥ 90 | pass |
| Accessibility, empty, desktop | 100 | ≥ 100 | pass |
| Best practices, empty, desktop | 100 | ≥ 95 | pass |
| SEO, empty, desktop | 100 | ≥ 100 | pass |
| Performance, seeded, mobile | 100 | ≥ 90 | pass |
| Accessibility, seeded, mobile | 100 | ≥ 100 | pass |
| Best practices, seeded, mobile | 100 | ≥ 95 | pass |
| SEO, seeded, mobile | 100 | ≥ 100 | pass |
| LCP, seeded, mobile | 776 ms | ≤ 2500 ms | pass |
| FCP, seeded, mobile | 776 ms | ≤ 1800 ms | pass |
| CLS, seeded, mobile | 0 | ≤ 0.1 | pass |
| TBT, seeded, mobile | 34 ms | ≤ 200 ms | pass |
| Performance, seeded, desktop | 100 | ≥ 90 | pass |
| Accessibility, seeded, desktop | 100 | ≥ 100 | pass |
| Best practices, seeded, desktop | 100 | ≥ 95 | pass |
| SEO, seeded, desktop | 100 | ≥ 100 | pass |
| Flow INP (worst timespan), mobile | – (the flow failed: clickText: no visible control "Look around with example loans") | ≤ 200 ms | not measured |
| Flow INP (worst timespan), desktop | – (the flow failed: clickText: no visible control "Look around with example loans") | ≤ 200 ms | not measured |
| GEO score (floor) | 60 | ≥ 44 | pass |
| Readable, first visit (floor) | 1522 ms (median of 1 cold load) | ≤ 3500 ms | pass |

First-load JS is read from the local build, so it is checked only when the target is served from this machine.
Floors are not goals: they are the scores measured on 2026-11-02, so falling below one means something regressed.
The readable floor is a time, so going over it fails. It sits well above the times measured on 2026-11-02, because throttled loads on a shared machine are noisy: a regression guard, not a goal.

Targets, which never fail a run:

| Measure | Now | Target | Status |
|---|---|---|---|
| GEO score | 60 | 80 | 20 to go |
| Readable, first visit | 1522 ms | 1600 ms | met |

## User flow

Lighthouse user flow: first load, example loans, plans with income typed, a plan chosen, the extra-payment slider dragged, and a snapshot saved in Records. Timespans measure INP, CLS and TBT; snapshots audit the state for accessibility, best practices and SEO.

### Mobile

Failed: clickText: no visible control "Look around with example loans"

### Desktop

Failed: clickText: no visible control "Look around with example loans"


## Security

**71** of 100. HTTPS 100, headers 27, cookies 100, content 80, dependencies not measured.

Lighthouse-based checks: included, from the median mobile Lighthouse run of the empty page.

- critical: Missing Content-Security-Policy (0/10 points)
- warning: Missing X-Content-Type-Options (0/4 points)
- warning: Missing X-Frame-Options (0/4 points)
- warning: CORS allows all origins

## GEO

**60** of 100: crawl access 20/20, server content 28/30, structured data 0/20, social and meta 7/15, LLM discovery 0/10, indexability 5/5.

Words in the raw HTML: 161. Words once rendered: 161. Content parity 100%.

- warn: Heading Hierarchy (1/3)
- fail: JSON-LD in SSR (0/12)
- fail: Rich Schema Types (0/8)
- warn: Open Graph Tags (3/7)
- warn: Canonical URL (0/4)

High-priority recommendations: Add JSON-LD structured data.

## Design

| State | Desktop | Mobile | Score | Grade | Accessibility | Consistency | Motion | Performance |
|---|---|---|---|---|---|---|---|---|
| empty | 85 B | 85 B | 85 | B | 76 | 76 | 88 | 100 |
| form-errors | – | – | – | – | – | – | – | – |
| loans | 85 B | 85 B | 85 | B | 76 | 76 | 88 | 100 |
| plans | – | – | – | – | – | – | – | – |
| payoff | – | – | – | – | – | – | – | – |
| records | – | – | – | – | – | – | – | – |

Design engine 1.3.0. Score is the mean of the rounded desktop (1440x900) and mobile (375x812) scores; buckets are 0 to 100. The engine scores against Material 3 conventions and this app does not use Material, so a radius or target-size rule is advisory unless it is also a WCAG failure.

## UX deterministic

| Screen | Rule findings | P1 | P2 | P3 | Probe findings | Design |
|---|---|---|---|---|---|---|
| empty-desktop | 5 | 0 | 5 | 0 | 0 | 85 |
| empty-mobile | 5 | 0 | 5 | 0 | 0 | 85 |
| form-errors-desktop | failed: clickText: no visible control "Add my first loan" | – | – | – | – | – |
| form-errors-mobile | failed: clickText: no visible control "Add my first loan" | – | – | – | – | – |
| loans-desktop | 5 | 0 | 5 | 0 | 0 | 85 |
| loans-mobile | 5 | 0 | 5 | 0 | 0 | 85 |
| plans-desktop | failed: clickTab: no section button for plans | – | – | – | – | – |
| plans-mobile | failed: clickTab: no section button for plans | – | – | – | – | – |
| payoff-desktop | failed: clickTab: no section button for payoff | – | – | – | – | – |
| payoff-mobile | failed: clickTab: no section button for payoff | – | – | – | – | – |
| records-desktop | failed: clickTab: no section button for records | – | – | – | – | – |
| records-mobile | failed: clickTab: no section button for records | – | – | – | – | – |

Distinct findings, with how many screens show each:

- P2 1 animation/transition(s) under 50ms (non-instant but too fast to read). (4 screens)
- P2 1 border-radius value(s) off the 7-step scale (0/4/8/12/16/28/full). (4 screens)
- P2 Missing landmark(s): nav. (4 screens)
- P2 8 pointer target(s) smaller than M3's comfortable 48×48px at 1440px wide (2 screens)
- P2 5 reading-copy text node(s) below 16px (or any text below 11px). (4 screens)
- P2 8 tap target(s) smaller than M3's comfortable 48×48px at 375px wide (2 screens)

These are rule findings only. UX scores come from the AI review, which reads ux/<screen>.jpg and ux/<screen>.dom.json and writes ux/ai/<screen>.json; then `node lib/merge-ux.mjs <results>/ux` scores and merges them.

## Responsive overflow

| State | 320 | 375 | 768 | 1024 | 1440 |
|---|---|---|---|---|---|
| empty | ok, 1403 px | ok, 1200 px | ok, 1098 px | ok, 1098 px | ok, 1098 px |
| form-errors | failed | failed | failed | failed | failed |
| loans | ok, 1403 px | ok, 1200 px | ok, 1098 px | ok, 1098 px | ok, 1098 px |
| plans | failed | failed | failed | failed | failed |
| payoff | failed | failed | failed | failed | failed |
| records | failed | failed | failed | failed | failed |

0 of 30 pages scroll sideways. Each cell: horizontal overflow (document scrollWidth beyond the viewport), then page height. Full-page screenshots are in responsive/.

## INP probe

| CPU | Loans | Runs | tabToPlans | typeIncome5 | tabToPayoff | dragSlider30 | typeExtra3 | tabToRecords | tabToLoans |
|---|---|---|---|---|---|---|---|---|---|
| 1x | 8 | 0 (2 failed) | – | – | – | – | – | – | – |
| 1x | 25 | 0 (2 failed) | – | – | – | – | – | – | – |
| 1x | 60 | 0 (2 failed) | – | – | – | – | – | – | – |
| 4x | 8 | 0 (2 failed) | – | – | – | – | – | – | – |
| 4x | 25 | 0 (2 failed) | – | – | – | – | – | – | – |
| 4x | 60 | 0 (2 failed) | – | – | – | – | – | – | – |

Each cell: the worst Event Timing interaction in ms that started inside the step, then main-thread task ms in parentheses, the higher of the runs. 0 means no interaction reached 16 ms. The page stops scrolling before every step and each field is centred before typing, so no click lands mid-scroll or on the edge of the viewport.

## What a borrower sees and when

| Scenario | First paint | Real content | Readable | LCP (in page) |
|---|---|---|---|---|
| First visit | 1584 ms | 1522 ms | 1522 ms | 1584 ms |
| Returning, eight loans | 1616 ms | 1558 ms | 1558 ms | 1616 ms |

One cold load per scenario, each in a fresh browser, on slow 4G and 4x CPU applied for real with devtools throttling, at 412x823 and DPR 1.75; ms from navigation start. First paint is Paint Timing's first-paint, the skeleton here. Real content is the first frame with `main h1` and no skeleton, readable the first frame with the first `.rise` block fully faded in. FCP and the other marks are in readable.json.

Lighthouse's simulated LCP sees only the skeleton for this app (815 ms on the empty mobile page in this run), so the Scoreboard's LCP is not when a borrower can read anything: the Readable column is.

## Site tools

| Tool | Result |
|---|---|
| header-check | score 40: 4 good, 1 warnings, 5 missing |
| meta-validate | score 80: 12 good, 2 warnings, 1 missing |
| structured-data | 0 schemas, 0 errors, 0 warnings |
| sitemap-validate | not found (Sitemap not found at https://cense-decode.vercel.app/sitemap.xml. HTTP 404) |
| redirect-check | 0 redirects, final status 200: No redirects detected. URL resolves directly. |
| broken-links | 12 links, 0 broken, 0 redirects, 0 errors, 0 timeouts |
| webmcp-check | AI readiness 0 |
