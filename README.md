# Insurance Plan Comparison

A single page that compares the Bronze, Silver and Gold insurance plans side by side. It highlights the best value in each row and recommends the plan with the best value for money.

- **Live URL:** https://vuminhluan.github.io/ai-challenge01/
- **Repository:** https://github.com/vuminhluan/ai-challenge01
- **Challenge:** [`AI_Engineering_Challenges/AI_Challenge_01.md`](AI_Engineering_Challenges/AI_Challenge_01.md)
- **Design spec:** [`docs/superpowers/specs/2026-09-11-insurance-plan-comparison-design.md`](docs/superpowers/specs/2026-09-11-insurance-plan-comparison-design.md)
- **AI conversation log:** [`ai-conversations/ai-conversation.txt`](ai-conversations/ai-conversation.txt)

## Run locally

Plain HTML/CSS/JavaScript with no dependencies. The page uses ES modules, which browsers don't load from `file://`, so serve the folder:

```bash
npm start            # python3 -m http.server 8000 → http://localhost:8000
```

## Test

```bash
npm test             # node --test (Node 20+)
```

The tests cover the formatters, the best-value and recommendation logic, and every cell of the comparison against the expected values in the spec.

## Structure

```
index.html          page shell
css/styles.css      design tokens, desktop table, mobile cards (breakpoint 767px)
js/data.js          plan data (verbatim from the challenge), currency, plan taglines
js/format.js        money / count / percent / days formatting
js/compare.js       best value per row, coverage per dollar, recommended plan
js/rows.js          one config entry per comparison row
js/viewModel.js     turns plans + rows into render-ready data
js/render.js        builds the table (desktop) and cards (mobile); DOM only
js/main.js          entry point
tests/              node:test suites for the pure modules
```

All decisions live in pure modules that can be tested without a browser. `render.js` only turns the view-model into DOM. To add a comparison row, add one entry to `js/rows.js`.

## How "Recommended" is chosen

```
coverage per $1 = annual limit × (100% − copay) ÷ (monthly premium × 12)
```

This is the maximum amount the insurer actually pays out for each dollar of yearly premium, after your copay share.

| Plan | Effective coverage | Yearly premium | Coverage per $1 |
|---|---|---|---|
| Bronze | $400,000 | $1,800 | $222 |
| Silver | $1,350,000 | $4,200 | $321 |
| Gold | $5,000,000 | $8,400 | **$595** |

Gold is recommended. If two plans tie, the cheaper one wins. Limitation: this compares maximum payouts, not expected usage, because the data has no usage information.

## Assumptions

- Amounts are in USD. The currency is one constant in `js/data.js`.
- `-1` means unlimited. `null` means the benefit is not included.
- Each plan header shows one tagline (`TAGLINES` in `js/data.js`) instead of the `highlights` tags. The tagline restates the highlights as a single sentence about the plan's strongest point.
- Best value: lowest wins for premium, copay, and waiting period. Highest wins for every limit and count, and unlimited beats any number. A benefit that is not included never wins. Ties highlight every tied plan. If all plans are equal, nothing is highlighted.

## Deploy (GitHub Pages)

`.github/workflows/deploy.yml` runs the tests, then publishes only `index.html`, `css/` and `js/` on every push to `master`, or when run manually.

One-time setup after pushing: **Settings → Pages → Build and deployment → Source: GitHub Actions**.

## Timeline

| Step | Time |
|---|---|
| Clarifying the requirements and designing the solution | 1h |
| Implementation: writing the code and the tests with AI | 1h |
| End-to-end testing and refinements | 30 min |
| Documentation and deployment | 30 min |
| **Total** | **3h** |

## Approach

Built with Claude Code:

1. **Clarify before coding.** I went through the open questions one at a time: stack, currency, the value-for-money formula (three formulas compared on the real data), mobile layout, and hosting. The decisions are recorded in the design spec.
2. **Decompose by responsibility.** Data → formatting → comparison rules → row config → view-model → rendering → styles. Each layer has one job and a small interface.
3. **Test the logic first (TDD).** The expected value of every cell is written down in the spec and asserted in `tests/viewModel.test.js`, which covers the "no missing or incorrect values" criterion directly.
4. **Verify visually.** Checked in a real browser at 1280px, 768px, 767px and 375px.

The full Claude Code session is in [`ai-conversations/ai-conversation.txt`](ai-conversations/ai-conversation.txt): every question, decision, review round and fix, from clarifying the requirements to deployment.
