# Insurance Plan Comparison Page — Design Spec

- **Date:** 2026-09-11
- **Source:** `AI_Engineering_Challenges/AI_Challenge_01.md`
- **Branch:** `challenge01`

## 1. Goal

A static web page that compares 3 insurance plans (Bronze, Silver, Gold) side by side, so a non-technical visitor can see at a glance what each plan covers, which plan wins each criterion, and which plan is recommended.

### Requirements (from the challenge)

- Side-by-side comparison of all benefits, limits, and pricing
- Visual indicators for included vs not-included benefits
- Best value highlighted in each row
- "Recommended" badge on one plan, based on value-for-money
- Responsive: side-by-side on desktop, stacked vertically on mobile
- Clean, professional design
- Pushed to GitHub, deployed to free hosting

### Non-goals

Dark mode, "Choose plan" buttons or any call to action, sticky table header, animations, runtime plan-data editing, i18n.

## 2. Decisions

| Topic | Decision | Rationale |
|---|---|---|
| Stack | Plain HTML/CSS/JS (ES modules), zero dependencies | Fastest to build and deploy. The code stays organized by splitting it into single-purpose modules. |
| Currency | USD, shown as `$` with a `CURRENCY` constant in `data.js` | The challenge is in English. The raw data has no unit. |
| UI language | English | Matches the challenge. |
| Recommended formula | Effective coverage per $1 of yearly premium (see §5.3) | Explainable in one sentence, accounts for copay, and gives a clear winner. |
| Layout | Desktop/tablet (≥ 768px): `<table>`, 3 plan columns. Mobile (< 768px): one card per plan, stacked vertically | The table is best for comparing. Cards satisfy "stacks vertically". |
| UI approach | One view-model, two renderers (`renderTable`, `renderCards`). CSS decides which one is visible. | Keeps table semantics for accessibility, keeps CSS simple, and keeps all logic in one tested place. |
| Location | Project root of `papaya-test` | User's choice. |
| Hosting | GitHub Pages through GitHub Actions | Free, and no extra account needed. The user creates the remote and pushes. |

## 3. Data

`js/data.js` exports the challenge JSON **verbatim** as `PLANS`, plus `CURRENCY = "USD"` and `TAGLINES`: a one-sentence summary of each plan's strongest point, keyed by plan name. The taglines replace the `highlights` tags in the plan header and restate their content:

| Plan | Tagline |
|---|---|
| Bronze | Essential cover at the lowest monthly price. |
| Silver | Adds dental and halves your copay, at half the price of Gold. |
| Gold | Complete cover with no copay, no waiting and unlimited visits. |

Semantics:

- `-1` means **unlimited**. It is compared as `Infinity` and displayed as `Unlimited`.
- `null` benefit means **not included**. It is excluded from best-value comparison and displayed as `✗ Not included`.
- Yearly premium = `monthly_premium × 12`.

## 4. Architecture

### 4.1 Files

```
papaya-test/
├── index.html                 # page shell, <div id="app">, loads js/main.js as a module
├── css/styles.css             # tokens, desktop table, mobile cards (@media (max-width: 767px))
├── js/
│   ├── data.js                # PLANS (verbatim JSON), CURRENCY
│   ├── format.js              # pure formatters
│   ├── compare.js             # pure: findBest, coveragePerDollar, pickRecommended
│   ├── rows.js                # ROWS config: one entry per comparison row
│   ├── viewModel.js           # buildViewModel(plans, rows) → render-ready data
│   ├── render.js              # renderTable(vm), renderCards(vm): DOM only, no logic
│   └── main.js                # entry point: build view-model, render both views into #app
├── tests/
│   ├── format.test.js
│   ├── compare.test.js
│   └── viewModel.test.js
├── package.json               # "type": "module"; scripts: test, start; no dependencies
├── .github/workflows/deploy.yml
└── README.md
```

Rule: every decision (what text to show, which cell is best, which plan is recommended) lives in pure modules (`format`, `compare`, `rows`, `viewModel`) that can be tested in Node without a browser. `render.js` only turns the view-model into DOM.

### 4.2 Data flow

```
PLANS ──► buildViewModel(PLANS, ROWS) ──► vm ──┬──► renderTable(vm) ──► <table> (desktop)
                                               └──► renderCards(vm) ──► cards   (mobile)
```

### 4.3 Row config (`rows.js`)

Each entry:

```js
{
  id: "annual_limit",
  group: "Coverage",                       // "Cost" | "Coverage" | "Extra benefits" | "Value"
  label: "Annual limit",
  hint: "Max paid per year, all benefits combined", // optional helper text under the label
  getValue: (plan) => plan.annual_limit,   // number | null (null = not included)
  direction: "higher",                     // "higher" | "lower": which value is best
  format: (value, plan) => "$500,000",     // display text (see §5.1)
  subtext: (plan) => "$1,800/yr",          // optional secondary line
  isBenefit: true,                         // optional: show ✓ when the value is non-null
}
```

Adding a new comparison row means adding one entry to `ROWS`.

`getValue` must use optional chaining (e.g. `plan.benefits.outpatient?.visits_per_year ?? null`), so that when a whole benefit is `null`, every row that depends on it returns `null` and renders as `✗ Not included` instead of throwing.

### 4.4 View-model shape (`buildViewModel(plans, rows, taglines)`)

```js
{
  plans: [
    { name: "Bronze", tier: "bronze", isRecommended: false, tagline: "Essential cover at the lowest monthly price." }, // tagline: null if missing
    // ...
  ],
  groups: [
    {
      title: "Cost",
      rows: [
        {
          id: "monthly_premium",
          label: "Monthly premium",
          hint: null,
          cells: [ // one per plan, in PLANS order
            { text: "$150/mo", subtext: "$1,800/yr", included: null, isBest: true },
            // included: true (✓) | false (✗ Not included) | null (no icon, non-benefit row)
          ],
        },
      ],
    },
  ],
  recommendation: { planName: "Gold", formula: "annual limit × (100% − copay) ÷ yearly premium" },
}
```

## 5. Rules

### 5.1 Formatting (`format.js`)

- Money: `Intl.NumberFormat("en-US", { style: "currency", currency: CURRENCY, maximumFractionDigits: 0 })`, always the full number (`$5,000,000`, never `$5M`).
- `-1` → `Unlimited`.
- Percent: `20` → `20%`.
- Days: `30` → `30 days`. `0` → `None`.
- Count (visits and days per year): plain number (`30`) or `Unlimited`.
- Any `null` value → text `Not included`, `included: false`.

### 5.2 Best value per row (`compare.findBest`)

- Compare the values in the row using its `direction`: `"lower"` for premium, copay, and waiting period; `"higher"` for everything else.
- `-1` is treated as `Infinity`. `null` is excluded and can never be best.
- Ties: every tied plan is marked best.
- If all plans have the same value, no cell is marked best (a highlight would add no information).

### 5.3 Recommended plan (`compare.coveragePerDollar`, `compare.pickRecommended`)

```
coveragePerDollar(plan) = annual_limit × (1 − copay_percentage / 100) ÷ (monthly_premium × 12)
```

Meaning: the maximum amount the insurer actually pays out, per $1 of yearly premium.

| Plan | Effective coverage | Yearly premium | Score |
|---|---|---|---|
| Bronze | 500,000 × 0.80 = 400,000 | 1,800 | 222.2 |
| Silver | 1,500,000 × 0.90 = 1,350,000 | 4,200 | 321.4 |
| Gold | 5,000,000 × 1.00 = 5,000,000 | 8,400 | **595.2** |

The plan with the highest score is recommended. If scores tie, the lower monthly premium wins. With the given data, the recommended plan is **Gold**.

Known limitation (stated in the README): the score measures the coverage ceiling, not expected usage. The data has no usage information.

## 6. Expected rendered values

`viewModel.test.js` asserts this table cell by cell.

| Group | Row | Bronze | Silver | Gold | Best |
|---|---|---|---|---|---|
| Cost | Monthly premium | $150/mo · $1,800/yr | $350/mo · $4,200/yr | $700/mo · $8,400/yr | Bronze |
| Cost | Copay — *Share of each bill you pay* | 20% | 10% | 0% | Gold |
| Cost | Waiting period — *Days before coverage starts* | 30 days | 15 days | None | Gold |
| Coverage | Annual limit — *Max paid per year, all benefits combined* | $500,000 | $1,500,000 | $5,000,000 | Gold |
| Coverage | Outpatient: per visit | ✓ $3,000 | ✓ $5,000 | ✓ $10,000 | Gold |
| Coverage | Outpatient: visits/year | 30 | 60 | Unlimited | Gold |
| Coverage | Inpatient: per day | ✓ $10,000 | ✓ $25,000 | ✓ $50,000 | Gold |
| Coverage | Inpatient: days/year | 60 | 120 | Unlimited | Gold |
| Extra benefits | Dental | ✗ Not included | ✓ $30,000/yr | ✓ $100,000/yr | Gold |
| Extra benefits | Maternity | ✗ Not included | ✗ Not included | ✓ $200,000 per pregnancy | Gold |
| Value | Coverage per $1 premium | $222 | $321 | $595 | Gold |

`isBenefit: true` rows: Outpatient per visit, Inpatient per day, Dental, Maternity. Coverage per $1 is displayed with `Math.round`, but compared on the raw score.

## 7. UI design

### 7.1 Page layout (top to bottom)

1. Header: title "Compare our plans", subtitle "Find the coverage that fits you".
2. Comparison: the table on desktop, or the cards on mobile. Content max-width is about 1080px, centered.
3. Footer notes:
   - Legend: `✓ Included · ✗ Not included · Best = best value in the row`.
   - Explanation of "Coverage per $1 premium" and why the recommended plan was chosen.

### 7.2 Plan header (table column head / card head)

- A thin tier-colored stripe on top.
- Plan name.
- `★ Recommended` badge (recommended plan only).
- The plan's tagline (§3) as one short muted sentence.

### 7.3 Desktop table (≥ 768px)

- First column holds row labels, left-aligned, with the `hint` as smaller muted text underneath.
- Plan columns are center-aligned.
- Group title rows (Cost / Coverage / Extra benefits / Value) are full-width rows with a light background.
- The recommended column has a primary-colored border and a slightly stronger background.
- The "Best" pill is pinned to the top-right corner of the cell, inside its top padding, so values stay on the same line in every column and row heights don't change.

### 7.4 Mobile cards (< 768px)

- One card per plan, in `PLANS` order.
- Each card: plan header, then the groups, each row laid out as `label …… value`.
- ✓/✗ icons are kept. The "Best" pill sits inline, to the left of the value. The recommended card gets the primary border and badge.

### 7.5 Tokens (CSS custom properties on `:root`)

| Token | Value | Use |
|---|---|---|
| `--bg` | `#F7F8FA` | page background |
| `--surface` | `#FFFFFF` | table and cards |
| `--border` | `#E5E7EB` | borders |
| `--radius` | `12px` | table and cards |
| `--primary` | `#1E3A8A` | headings, Recommended badge, recommended border |
| `--primary-soft` | `#F5F8FF` | recommended column background |
| `--best-bg` | `#EEF4FF` | best-value cell background; "Best" pill text uses `--primary` |
| `--included` | `#16A34A` | ✓ icon |
| `--excluded` | `#6B7280` | ✗ icon and "Not included" text (4.8:1 on white, passes AA; the earlier `#9CA3AF` was 2.5:1 and failed) |
| `--text` / `--muted` | `#111827` / `#6B7280` | body text / hints, subtexts, tags |
| `--tier-bronze` / `--tier-silver` / `--tier-gold` | `#B87333` / `#8A94A6` / `#C9A227` | tier stripe |

Font: `system-ui` stack (no web fonts).

### 7.6 Accessibility

- The table has a `<caption>` and uses `<th scope="col">` for plans and `<th scope="row">` for labels.
- Every state is shown with an icon plus text, never color alone (✓/✗ + text, "Best" pill, "Recommended" text).
- Contrast meets WCAG AA.
- The hidden view (table or cards) uses `display: none`, so screen readers never read it twice.

## 8. Testing

TDD with Node's built-in runner (`npm test` → `node --test`), no dependencies.

- `format.test.js`: money, `Unlimited`, `None`, percent, counts, `null`.
- `compare.test.js`: `findBest` in both directions, `Infinity` wins, `null` excluded, ties, all-equal → none. `coveragePerDollar` returns ≈ 222.2 / 321.4 / 595.2. `pickRecommended` returns Gold, and tie-break by premium.
- `viewModel.test.js`: builds the view-model from the real `PLANS` and asserts every cell (text, subtext, included, isBest) against §6, plus plan headers and the recommendation.

`render.js` has no unit tests. It is verified visually: run the local server, then screenshot at desktop 1280px and mobile 375px and compare against §7.

## 9. Local run & deployment

- `npm start` runs `python3 -m http.server 8000`. A server is needed because ES modules don't load from `file://`.
- `.github/workflows/deploy.yml`:
  - Triggers on push to `master` and on `workflow_dispatch`.
  - Steps: checkout → setup-node (Node 24) → `npm test` (a failure blocks the deploy) → copy `index.html`, `css/`, `js/` into `_site/` → `actions/upload-pages-artifact` → `actions/deploy-pages`.
  - Permissions: `pages: write`, `id-token: write`.
  - Only the site files are published, not `tests/`, `docs/`, the challenge folders, or markdown files.
- Manual steps for the user (documented in the README): create the GitHub repo, push, then set Settings → Pages → Source to **GitHub Actions**.

## 10. README contents

How to run and test, code structure, Recommended formula and its limitation, assumptions (USD, `-1` = unlimited, best-value rules), timeline (§11), and a short "Approach" section describing how the problem was broken down and how the AI tool was directed.

## 11. Timeline estimate (~3h)

| Step | Estimate |
|---|---|
| Requirements clarification + design | ~30 min |
| Setup + `data.js`, `format.js`, `compare.js` with tests | ~30 min |
| `rows.js`, `viewModel.js` with tests | ~20 min |
| `index.html`, `render.js` | ~20 min |
| CSS desktop + mobile | ~40 min |
| Visual QA + fixes | ~20 min |
| Deploy workflow + README | ~15 min |
| **Total** | **~2h 55m** |
