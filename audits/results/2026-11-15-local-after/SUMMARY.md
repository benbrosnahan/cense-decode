# Audit summary

- Target: http://localhost:3208/ (given with --url)
- Started: 2026-11-15T19:19:43.200Z
- Command: `node run.mjs --url http://localhost:3208/ --runs 1`
- Budgets: PASS: 26 passed, 0 failed, 2 not measured

| Step | Result | Time |
|---|---|---|
| lighthouse | ok | 24.2 s |
| flow | failed: mobile: clickText: no visible control "Look around with example loans"; desktop: clickText: no visible control "Look around with example loans" | 14.8 s |
| security | ok | under 0.1 s |
| geo | ok | 10.6 s |
| design | partial: form-errors-desktop: clickText: no visible control "Add my first loan"; form-errors-mobile: clickText: no visible control "Add my first loan"; plans-desktop: clickTab: no section button for plans; 5 more | 46.8 s |
| ux | partial: form-errors-desktop: clickText: no visible control "Add my first loan"; form-errors-mobile: clickText: no visible control "Add my first loan"; plans-desktop: clickTab: no section button for plans; 5 more | under 0.1 s |
| tools | ok | 0.4 s |
| responsive | partial: form-errors@320: clickText: no visible control "Add my first loan"; form-errors@375: clickText: no visible control "Add my first loan"; form-errors@768: clickText: no visible control "Add my first loan"; 17 more | 49.7 s |
| inp | failed: cpu1x loans=8 run1: clickTab: no section button for plans; cpu1x loans=8 run2: clickTab: no section button for plans; cpu1x loans=25 run1: clickTab: no section button for plans; 9 more | 20.3 s |
| readable | ok | 9.1 s |

## Scoreboard

| Page | Perf | A11y | BP | SEO | LCP | FCP | CLS |
|---|---|---|---|---|---|---|---|
| Empty, mobile | 100 | 100 | 100 | 100 | 761 ms | 761 ms | 0 |
| Empty, desktop | 100 | 100 | 100 | 100 | 207 ms | 207 ms | 0 |
| Seeded, mobile | 100 | 100 | 100 | 100 | 755 ms | 755 ms | 0 |
| Seeded, desktop | 100 | 100 | 100 | 100 | 206 ms | 206 ms | 0 |

Median of 1 Lighthouse run per page, chosen by performance score. Empty is a first visit; seeded has the eight-loan fixture in localStorage before load. TBT: empty, mobile 63 ms, empty, desktop 0 ms, seeded, mobile 31 ms, seeded, desktop 0 ms.

## Budgets

| Budget | Measured | Limit | Result |
|---|---|---|---|
| Performance, empty, mobile | 100 | ≥ 90 | pass |
| Accessibility, empty, mobile | 100 | ≥ 100 | pass |
| Best practices, empty, mobile | 100 | ≥ 95 | pass |
| SEO, empty, mobile | 100 | ≥ 100 | pass |
| LCP, empty, mobile | 761 ms | ≤ 2500 ms | pass |
| FCP, empty, mobile | 761 ms | ≤ 1800 ms | pass |
| CLS, empty, mobile | 0 | ≤ 0.1 | pass |
| TBT, empty, mobile | 63 ms | ≤ 200 ms | pass |
| Performance, empty, desktop | 100 | ≥ 90 | pass |
| Accessibility, empty, desktop | 100 | ≥ 100 | pass |
| Best practices, empty, desktop | 100 | ≥ 95 | pass |
| SEO, empty, desktop | 100 | ≥ 100 | pass |
| Performance, seeded, mobile | 100 | ≥ 90 | pass |
| Accessibility, seeded, mobile | 100 | ≥ 100 | pass |
| Best practices, seeded, mobile | 100 | ≥ 95 | pass |
| SEO, seeded, mobile | 100 | ≥ 100 | pass |
| LCP, seeded, mobile | 755 ms | ≤ 2500 ms | pass |
| FCP, seeded, mobile | 755 ms | ≤ 1800 ms | pass |
| CLS, seeded, mobile | 0 | ≤ 0.1 | pass |
| TBT, seeded, mobile | 31 ms | ≤ 200 ms | pass |
| Performance, seeded, desktop | 100 | ≥ 90 | pass |
| Accessibility, seeded, desktop | 100 | ≥ 100 | pass |
| Best practices, seeded, desktop | 100 | ≥ 95 | pass |
| SEO, seeded, desktop | 100 | ≥ 100 | pass |
| Flow INP (worst timespan), mobile | – (the flow failed: clickText: no visible control "Look around with example loans") | ≤ 200 ms | not measured |
| Flow INP (worst timespan), desktop | – (the flow failed: clickText: no visible control "Look around with example loans") | ≤ 200 ms | not measured |
| GEO score (floor) | 84 | ≥ 60 | pass |
| Readable, first visit (floor) | 1518 ms (median of 1 cold load) | ≤ 3500 ms | pass |

First-load JS: no production build next to audits/, so it was not checked.
Floors are not goals: they are the scores measured on 2026-11-02, so falling below one means something regressed.
The readable floor is a time, so going over it fails. It sits well above the times measured on 2026-11-02, because throttled loads on a shared machine are noisy: a regression guard, not a goal.

Targets, which never fail a run:

| Measure | Now | Target | Status |
|---|---|---|---|
| GEO score | 84 | 80 | met |
| Readable, first visit | 1518 ms | 1600 ms | met |

## User flow

Lighthouse user flow: first load, example loans, plans with income typed, a plan chosen, the extra-payment slider dragged, and a snapshot saved in Records. Timespans measure INP, CLS and TBT; snapshots audit the state for accessibility, best practices and SEO.

### Mobile

Failed: clickText: no visible control "Look around with example loans"

### Desktop

Failed: clickText: no visible control "Look around with example loans"


## Security

**35** of 100. HTTPS 0, headers 0, cookies 100, content 100, dependencies not measured.

Lighthouse-based checks: included, from the median mobile Lighthouse run of the empty page.

This target is plain HTTP, so TLS and every header read as missing whatever the server sends. Judge security with --target live.

- critical: Page not served over HTTPS
- critical: Missing Content-Security-Policy (0/10 points)
- critical: Missing Strict-Transport-Security (0/8 points)
- warning: Missing X-Content-Type-Options (0/4 points)
- warning: Missing X-Frame-Options (0/4 points)

## GEO

**84** of 100: crawl access 20/20, server content 28/30, structured data 16/20, social and meta 15/15, LLM discovery 0/10, indexability 5/5.

Words in the raw HTML: 163. Words once rendered: 163. Content parity 100%.

- warn: Heading Hierarchy (1/3)
- warn: Rich Schema Types (4/8)

## Design

| State | Desktop | Mobile | Score | Grade | Accessibility | Consistency | Motion | Performance |
|---|---|---|---|---|---|---|---|---|
| empty | 88.6 B | 88.6 B | 89 | B | 88 | 76 | 88 | 100 |
| form-errors | – | – | – | – | – | – | – | – |
| loans | 88.6 B | 88.6 B | 89 | B | 88 | 76 | 88 | 100 |
| plans | – | – | – | – | – | – | – | – |
| payoff | – | – | – | – | – | – | – | – |
| records | – | – | – | – | – | – | – | – |

Design engine 1.3.0. Score is the mean of the rounded desktop (1440x900) and mobile (375x812) scores; buckets are 0 to 100. The engine scores against Material 3 conventions and this app does not use Material, so a radius or target-size rule is advisory unless it is also a WCAG failure.

## UX deterministic

| Screen | Rule findings | P1 | P2 | P3 | Probe findings | Design |
|---|---|---|---|---|---|---|
| empty-desktop | 4 | 0 | 4 | 0 | 0 | 88.6 |
| empty-mobile | 4 | 0 | 4 | 0 | 0 | 88.6 |
| form-errors-desktop | failed: clickText: no visible control "Add my first loan" | – | – | – | – | – |
| form-errors-mobile | failed: clickText: no visible control "Add my first loan" | – | – | – | – | – |
| loans-desktop | 4 | 0 | 4 | 0 | 0 | 88.6 |
| loans-mobile | 4 | 0 | 4 | 0 | 0 | 88.6 |
| plans-desktop | failed: clickTab: no section button for plans | – | – | – | – | – |
| plans-mobile | failed: clickTab: no section button for plans | – | – | – | – | – |
| payoff-desktop | failed: clickTab: no section button for payoff | – | – | – | – | – |
| payoff-mobile | failed: clickTab: no section button for payoff | – | – | – | – | – |
| records-desktop | failed: clickTab: no section button for records | – | – | – | – | – |
| records-mobile | failed: clickTab: no section button for records | – | – | – | – | – |

Distinct findings, with how many screens show each:

- P2 1 animation/transition(s) under 50ms (non-instant but too fast to read). (4 screens)
- P2 1 border-radius value(s) off the 7-step scale (0/4/8/12/16/28/full). (4 screens)
- P2 8 pointer target(s) smaller than M3's comfortable 48×48px at 1440px wide (2 screens)
- P2 4 reading-copy text node(s) below 16px (or any text below 11px). (4 screens)
- P2 8 tap target(s) smaller than M3's comfortable 48×48px at 375px wide (2 screens)

These are rule findings only. UX scores come from the AI review, which reads ux/<screen>.jpg and ux/<screen>.dom.json and writes ux/ai/<screen>.json; then `node lib/merge-ux.mjs <results>/ux` scores and merges them.

## Responsive overflow

| State | 320 | 375 | 768 | 1024 | 1440 |
|---|---|---|---|---|---|
| empty | ok, 1426 px | ok, 1223 px | ok, 1121 px | ok, 1121 px | ok, 1121 px |
| form-errors | failed | failed | failed | failed | failed |
| loans | ok, 1426 px | ok, 1223 px | ok, 1121 px | ok, 1121 px | ok, 1121 px |
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
| First visit | 1540 ms | 1518 ms | 1518 ms | 1540 ms |
| Returning, eight loans | 1520 ms | 1501 ms | 1501 ms | 1520 ms |

One cold load per scenario, each in a fresh browser, on slow 4G and 4x CPU applied for real with devtools throttling, at 412x823 and DPR 1.75; ms from navigation start. First paint is Paint Timing's first-paint, the skeleton here. Real content is the first frame with `main h1` and no skeleton, readable the first frame with the first `.rise` block fully faded in. FCP and the other marks are in readable.json.

Lighthouse's simulated LCP sees only the skeleton for this app (761 ms on the empty mobile page in this run), so the Scoreboard's LCP is not when a borrower can read anything: the Readable column is.

## Site tools

| Tool | Result |
|---|---|
| header-check | score 80: 8 good, 1 warnings, 1 missing |
| meta-validate | score 100: 15 good, 0 warnings, 0 missing |
| structured-data | 1 schemas, 0 errors, 1 warnings |
| sitemap-validate | found, 1 URLs, 1 issues |
| redirect-check | 0 redirects, final status 200: No redirects detected. URL resolves directly. |
| broken-links | 13 links, 0 broken, 0 redirects, 0 errors, 0 timeouts |
| webmcp-check | AI readiness 0 |
