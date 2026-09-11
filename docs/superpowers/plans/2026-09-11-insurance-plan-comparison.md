# Insurance Plan Comparison Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a static page that compares the Bronze, Silver and Gold insurance plans. It shows a side-by-side table on desktop and stacked cards on mobile, highlights the best value in each row, and puts a "Recommended" badge on one plan. It deploys to GitHub Pages.

**Architecture:** Pure ES modules turn the plan data into one render-ready view-model: `format` → `compare` → `rows` config → `viewModel`. These modules are tested with Node's built-in test runner. `render.js` turns the view-model into two DOM views, a `<table>` for desktop and cards for mobile. One CSS media query at 767px decides which view is visible.

**Tech Stack:** HTML, CSS, vanilla JavaScript (ES modules), `node --test`, `python3 -m http.server` for local serving, GitHub Actions + GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-09-11-insurance-plan-comparison-design.md`

## Global Constraints

- Zero dependencies: no npm packages, no CDN scripts, no web fonts. `package.json` has no `dependencies`/`devDependencies`.
- ES modules everywhere (`"type": "module"`; `<script type="module">`).
- Node ≥ 20 for tests (local: Node 24; CI: Node 24).
- Currency is USD through `CURRENCY` in `js/data.js`. Money is always shown as the full number (`$5,000,000`, never `$5M`).
- UI copy is English, and the display strings must match spec §6 exactly.
- `-1` means unlimited (compared as `Infinity`, shown as `Unlimited`). `null` benefit means not included (`✗ Not included`, never best).
- Layout breakpoint: `max-width: 767px` shows cards, 768px and up shows the table.
- Pure modules (`data`, `format`, `compare`, `rows`, `viewModel`) must not touch the DOM. `render.js` must not compute anything; it only reads the view-model.
- Files live at the repo root of `papaya-test`, on branch `challenge01`. Do not touch `AI_Engineering_Challenges/` or `Logical_Questions/`. Do not push; the user creates the remote and pushes.
- Commit messages use conventional prefixes (`feat:`, `test:`, `docs:`, `ci:`, `style:`) and carry no attribution lines.

## File Map

| File | Responsibility | Task |
|---|---|---|
| `package.json` | module type, `test`/`start` scripts | 1 |
| `.gitignore` | ignore `_site/`, `.DS_Store` | 1 |
| `js/data.js` | `PLANS` (challenge JSON, verbatim), `CURRENCY`, `UNLIMITED` | 1 |
| `js/format.js` | `formatMoney`, `formatCount`, `formatPercent`, `formatDays` | 1 |
| `tests/format.test.js` | formatter tests | 1 |
| `js/compare.js` | `findBest`, `coveragePerDollar`, `pickRecommended` | 2 |
| `tests/compare.test.js` | comparison and recommendation tests | 2 |
| `js/rows.js` | `ROWS` config (one entry per comparison row) | 3 |
| `js/viewModel.js` | `buildViewModel`, `RECOMMENDATION_FORMULA` | 3 |
| `tests/viewModel.test.js` | every cell of spec §6 against real data | 3 |
| `index.html` | page shell | 4 |
| `js/render.js` | `renderTable`, `renderCards`, `renderNotes` | 4 |
| `js/main.js` | entry point wiring data → view-model → DOM | 4 |
| `css/styles.css` | tokens, table, cards, breakpoint | 5 |
| `.github/workflows/deploy.yml` | test + deploy to GitHub Pages | 6 |
| `README.md` | run/test/deploy, formula, assumptions, timeline, approach | 6 |

---

### Task 1: Project scaffold, plan data, and formatters

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `js/data.js`
- Create: `js/format.js`
- Test: `tests/format.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `js/data.js`: `export const CURRENCY: "USD"`, `export const UNLIMITED: -1`, `export const PLANS: Plan[]` (the challenge JSON).
  - `js/format.js`: `formatMoney(value: number): string`, `formatCount(value: number): string`, `formatPercent(value: number): string`, `formatDays(value: number): string`. None of them accept `null`; the caller handles `null`.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "insurance-plan-comparison",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "start": "python3 -m http.server 8000",
    "test": "node --test"
  }
}
```

- [ ] **Step 2: Create `.gitignore`**

```
_site/
.DS_Store
```

- [ ] **Step 3: Create `js/data.js` (challenge JSON verbatim, as a JS export)**

```js
export const CURRENCY = "USD";

/** Value used in the plan data to mean "no limit". */
export const UNLIMITED = -1;

export const PLANS = [
  {
    name: "Bronze",
    monthly_premium: 150,
    annual_limit: 500000,
    benefits: {
      outpatient: { limit_per_visit: 3000, visits_per_year: 30 },
      inpatient: { limit_per_day: 10000, days_per_year: 60 },
      dental: null,
      maternity: null,
    },
    copay_percentage: 20,
    waiting_period_days: 30,
    highlights: ["Basic coverage", "No dental or maternity"],
  },
  {
    name: "Silver",
    monthly_premium: 350,
    annual_limit: 1500000,
    benefits: {
      outpatient: { limit_per_visit: 5000, visits_per_year: 60 },
      inpatient: { limit_per_day: 25000, days_per_year: 120 },
      dental: { limit_per_year: 30000 },
      maternity: null,
    },
    copay_percentage: 10,
    waiting_period_days: 15,
    highlights: ["Includes dental", "Lower copay", "Higher limits"],
  },
  {
    name: "Gold",
    monthly_premium: 700,
    annual_limit: 5000000,
    benefits: {
      outpatient: { limit_per_visit: 10000, visits_per_year: -1 },
      inpatient: { limit_per_day: 50000, days_per_year: -1 },
      dental: { limit_per_year: 100000 },
      maternity: { limit_per_pregnancy: 200000 },
    },
    copay_percentage: 0,
    waiting_period_days: 0,
    highlights: ["Full coverage", "No copay", "No waiting period", "Unlimited visits"],
  },
];
```

Double-check every number against `AI_Engineering_Challenges/AI_Challenge_01.md`. The Task 3 tests also catch typos.

- [ ] **Step 4: Write the failing test `tests/format.test.js`**

```js
import assert from "node:assert/strict";
import { test } from "node:test";
import { formatCount, formatDays, formatMoney, formatPercent } from "../js/format.js";

test("formatMoney shows whole US dollars with thousands separators", () => {
  assert.equal(formatMoney(150), "$150");
  assert.equal(formatMoney(500000), "$500,000");
  assert.equal(formatMoney(5000000), "$5,000,000");
});

test("formatMoney rounds to whole dollars", () => {
  assert.equal(formatMoney(595.24), "$595");
});

test("formatMoney shows -1 as Unlimited", () => {
  assert.equal(formatMoney(-1), "Unlimited");
});

test("formatCount shows the number, or Unlimited for -1", () => {
  assert.equal(formatCount(30), "30");
  assert.equal(formatCount(-1), "Unlimited");
});

test("formatPercent appends a percent sign", () => {
  assert.equal(formatPercent(20), "20%");
  assert.equal(formatPercent(0), "0%");
});

test("formatDays pluralises and shows 0 as None", () => {
  assert.equal(formatDays(30), "30 days");
  assert.equal(formatDays(1), "1 day");
  assert.equal(formatDays(0), "None");
});
```

- [ ] **Step 5: Run the test to verify it fails**

Run: `node --test tests/format.test.js`
Expected: FAIL with `ERR_MODULE_NOT_FOUND` / `Cannot find module '.../js/format.js'`.

- [ ] **Step 6: Implement `js/format.js`**

```js
import { CURRENCY, UNLIMITED } from "./data.js";

const moneyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: CURRENCY,
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function formatMoney(value) {
  if (value === UNLIMITED) return "Unlimited";
  return moneyFormatter.format(value);
}

export function formatCount(value) {
  if (value === UNLIMITED) return "Unlimited";
  return String(value);
}

export function formatPercent(value) {
  return `${value}%`;
}

export function formatDays(value) {
  if (value === 0) return "None";
  return value === 1 ? "1 day" : `${value} days`;
}
```

`minimumFractionDigits: 0` is required. Without it, some engines throw a `RangeError` because the USD default minimum (2) is greater than the maximum (0).

- [ ] **Step 7: Run the test to verify it passes**

Run: `npm test`
Expected: `ℹ pass 6`, `ℹ fail 0`.

- [ ] **Step 8: Commit**

```bash
git add package.json .gitignore js/data.js js/format.js tests/format.test.js
git commit -m "feat: add plan data and value formatters"
```

---

### Task 2: Best-value and recommendation logic

**Files:**
- Create: `js/compare.js`
- Test: `tests/compare.test.js`

**Interfaces:**
- Consumes: `UNLIMITED`, `PLANS` from `js/data.js` (Task 1).
- Produces (`js/compare.js`):
  - `findBest(values: (number|null)[], direction: "higher"|"lower"): boolean[]`: one flag per value, true where the value is the best in its row. `-1` counts as `Infinity`, `null` never wins, ties all win, and if every plan has the same value nothing wins.
  - `coveragePerDollar(plan: Plan): number`: `annual_limit × (1 − copay_percentage/100) ÷ (monthly_premium × 12)`.
  - `pickRecommended(plans: Plan[]): Plan`: the plan object with the highest `coveragePerDollar`. Ties go to the lower `monthly_premium`.

- [ ] **Step 1: Write the failing test `tests/compare.test.js`**

```js
import assert from "node:assert/strict";
import { test } from "node:test";
import { coveragePerDollar, findBest, pickRecommended } from "../js/compare.js";
import { PLANS } from "../js/data.js";

const assertClose = (actual, expected) =>
  assert.ok(Math.abs(actual - expected) < 0.01, `expected ${actual} to be close to ${expected}`);

test("findBest picks the highest value when direction is higher", () => {
  assert.deepEqual(findBest([3000, 5000, 10000], "higher"), [false, false, true]);
});

test("findBest picks the lowest value when direction is lower", () => {
  assert.deepEqual(findBest([150, 350, 700], "lower"), [true, false, false]);
});

test("findBest treats -1 as unlimited, which beats any number", () => {
  assert.deepEqual(findBest([30, 60, -1], "higher"), [false, false, true]);
});

test("findBest never marks null (not included) as best", () => {
  assert.deepEqual(findBest([null, 30000, 100000], "higher"), [false, false, true]);
  assert.deepEqual(findBest([null, 10, 20], "lower"), [false, true, false]);
});

test("findBest marks the only included value as best", () => {
  assert.deepEqual(findBest([null, null, 200000], "higher"), [false, false, true]);
});

test("findBest marks every tied winner", () => {
  assert.deepEqual(findBest([10, 20, 20], "higher"), [false, true, true]);
});

test("findBest marks nothing when every plan has the same value", () => {
  assert.deepEqual(findBest([0, 0, 0], "lower"), [false, false, false]);
});

test("findBest marks nothing when every value is null", () => {
  assert.deepEqual(findBest([null, null, null], "higher"), [false, false, false]);
});

test("coveragePerDollar = annual limit × (1 − copay) ÷ yearly premium", () => {
  const [bronze, silver, gold] = PLANS;
  assertClose(coveragePerDollar(bronze), 222.22);
  assertClose(coveragePerDollar(silver), 321.43);
  assertClose(coveragePerDollar(gold), 595.24);
});

test("pickRecommended returns the plan with the best coverage per dollar", () => {
  assert.equal(pickRecommended(PLANS).name, "Gold");
});

test("pickRecommended breaks a tie with the lower monthly premium", () => {
  const pricey = { name: "Pricey", monthly_premium: 200, annual_limit: 240000, copay_percentage: 0 };
  const cheap = { name: "Cheap", monthly_premium: 100, annual_limit: 120000, copay_percentage: 0 };
  assert.equal(pickRecommended([pricey, cheap]).name, "Cheap");
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/compare.test.js`
Expected: FAIL with `Cannot find module '.../js/compare.js'`.

- [ ] **Step 3: Implement `js/compare.js`**

```js
import { UNLIMITED } from "./data.js";

function toComparable(value) {
  if (value === null || value === undefined) return null;
  return value === UNLIMITED ? Infinity : value;
}

/**
 * One boolean per value: true where the value is the best in its row.
 * null never wins; ties all win; if every plan has the same value, nothing wins.
 */
export function findBest(values, direction) {
  const comparable = values.map(toComparable);
  const present = comparable.filter((value) => value !== null);
  if (present.length === 0) return values.map(() => false);

  const best = direction === "lower" ? Math.min(...present) : Math.max(...present);
  const everyPlanTied = present.length === values.length && present.every((value) => value === best);
  if (everyPlanTied) return values.map(() => false);

  return comparable.map((value) => value === best);
}

/** Max payout after copay, per $1 of yearly premium. */
export function coveragePerDollar(plan) {
  const effectiveCoverage = plan.annual_limit * (1 - plan.copay_percentage / 100);
  const yearlyPremium = plan.monthly_premium * 12;
  return effectiveCoverage / yearlyPremium;
}

/** Highest coverage per dollar; ties go to the lower monthly premium. */
export function pickRecommended(plans) {
  return plans.reduce((best, plan) => {
    const diff = coveragePerDollar(plan) - coveragePerDollar(best);
    if (diff > 0) return plan;
    if (diff === 0 && plan.monthly_premium < best.monthly_premium) return plan;
    return best;
  });
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: `ℹ pass 17`, `ℹ fail 0` (6 format + 11 compare).

- [ ] **Step 5: Commit**

```bash
git add js/compare.js tests/compare.test.js
git commit -m "feat: add best-value and recommended-plan logic"
```

---

### Task 3: Row config and view-model

**Files:**
- Create: `js/rows.js`
- Create: `js/viewModel.js`
- Test: `tests/viewModel.test.js`

**Interfaces:**
- Consumes: `formatMoney`, `formatCount`, `formatPercent`, `formatDays` (Task 1); `findBest`, `coveragePerDollar`, `pickRecommended` (Task 2); `PLANS` (Task 1).
- Produces:
  - `js/rows.js`: `ROWS: Row[]`, where `Row = { id, group, label, hint?, getValue(plan) → number|null, direction: "higher"|"lower", format(value) → string, subtext?(plan) → string, isBenefit?: true }`.
  - `js/viewModel.js`:
    - `RECOMMENDATION_FORMULA: string`
    - `buildViewModel(plans, rows) → ViewModel`, where:
      ```
      ViewModel = {
        plans: { name, tier, isRecommended, highlights }[],
        groups: { title, rows: { id, label, hint: string|null, cells: Cell[] }[] }[],
        recommendation: { planName, formula },
      }
      Cell = { text: string, subtext: string|null, included: true|false|null, isBest: boolean }
      ```
    - `tier` is `plan.name.toLowerCase()` (`"bronze"`, etc.).
    - `cells` follow the order of `plans`.
    - Group order follows the first appearance of each group in `rows`.

- [ ] **Step 1: Write the failing test `tests/viewModel.test.js`**

```js
import assert from "node:assert/strict";
import { test } from "node:test";
import { PLANS } from "../js/data.js";
import { ROWS } from "../js/rows.js";
import { buildViewModel } from "../js/viewModel.js";

const vm = buildViewModel(PLANS, ROWS);
const allRows = vm.groups.flatMap((group) => group.rows);
const findRow = (id) => allRows.find((row) => row.id === id);

// Spec §6 — every cell, in Bronze / Silver / Gold order.
const EXPECTED_ROWS = [
  // id                     texts                                                    isBest                  included
  ["monthly_premium",      ["$150/mo", "$350/mo", "$700/mo"],                        [true, false, false],  [null, null, null]],
  ["copay",                ["20%", "10%", "0%"],                                     [false, false, true],  [null, null, null]],
  ["waiting_period",       ["30 days", "15 days", "None"],                           [false, false, true],  [null, null, null]],
  ["annual_limit",         ["$500,000", "$1,500,000", "$5,000,000"],                 [false, false, true],  [null, null, null]],
  ["outpatient_per_visit", ["$3,000", "$5,000", "$10,000"],                          [false, false, true],  [true, true, true]],
  ["outpatient_visits",    ["30", "60", "Unlimited"],                                [false, false, true],  [null, null, null]],
  ["inpatient_per_day",    ["$10,000", "$25,000", "$50,000"],                        [false, false, true],  [true, true, true]],
  ["inpatient_days",       ["60", "120", "Unlimited"],                               [false, false, true],  [null, null, null]],
  ["dental",               ["Not included", "$30,000/yr", "$100,000/yr"],            [false, false, true],  [false, true, true]],
  ["maternity",            ["Not included", "Not included", "$200,000/pregnancy"],   [false, false, true],  [false, false, true]],
  ["coverage_per_dollar",  ["$222", "$321", "$595"],                                 [false, false, true],  [null, null, null]],
];

for (const [id, texts, isBest, included] of EXPECTED_ROWS) {
  test(`row "${id}" renders the expected cells`, () => {
    const row = findRow(id);
    assert.ok(row, `row ${id} should exist`);
    assert.deepEqual(row.cells.map((cell) => cell.text), texts);
    assert.deepEqual(row.cells.map((cell) => cell.isBest), isBest);
    assert.deepEqual(row.cells.map((cell) => cell.included), included);
  });
}

test("groups and rows appear in spec order", () => {
  assert.deepEqual(vm.groups.map((group) => group.title), ["Cost", "Coverage", "Extra benefits", "Value"]);
  assert.deepEqual(allRows.map((row) => row.id), EXPECTED_ROWS.map(([id]) => id));
});

test("rows carry the spec labels and hints", () => {
  assert.deepEqual(allRows.map((row) => [row.label, row.hint]), [
    ["Monthly premium", null],
    ["Copay", "Share of each bill you pay"],
    ["Waiting period", "Days before coverage starts"],
    ["Annual limit", "Max paid per year, all benefits combined"],
    ["Outpatient: per visit", null],
    ["Outpatient: visits/year", null],
    ["Inpatient: per day", null],
    ["Inpatient: days/year", null],
    ["Dental", null],
    ["Maternity", null],
    ["Coverage per $1 premium", null],
  ]);
});

test("only the premium row has a subtext, showing the yearly premium", () => {
  assert.deepEqual(findRow("monthly_premium").cells.map((cell) => cell.subtext), ["$1,800/yr", "$4,200/yr", "$8,400/yr"]);
  const otherSubtexts = allRows.filter((row) => row.id !== "monthly_premium").flatMap((row) => row.cells.map((cell) => cell.subtext));
  assert.ok(otherSubtexts.every((subtext) => subtext === null));
});

test("plan headers carry name, tier, highlights and the recommended flag", () => {
  assert.deepEqual(vm.plans, [
    { name: "Bronze", tier: "bronze", isRecommended: false, highlights: ["Basic coverage", "No dental or maternity"] },
    { name: "Silver", tier: "silver", isRecommended: false, highlights: ["Includes dental", "Lower copay", "Higher limits"] },
    { name: "Gold", tier: "gold", isRecommended: true, highlights: ["Full coverage", "No copay", "No waiting period", "Unlimited visits"] },
  ]);
});

test("recommendation names Gold and the formula", () => {
  assert.deepEqual(vm.recommendation, {
    planName: "Gold",
    formula: "annual limit × (100% − copay) ÷ yearly premium",
  });
});

test("a null benefit makes every row that depends on it Not included", () => {
  const [bronze, silver] = PLANS;
  const noOutpatient = { ...bronze, benefits: { ...bronze.benefits, outpatient: null } };
  const rows = buildViewModel([noOutpatient, silver], ROWS).groups.flatMap((group) => group.rows);

  for (const id of ["outpatient_per_visit", "outpatient_visits"]) {
    const cell = rows.find((row) => row.id === id).cells[0];
    assert.deepEqual(cell, { text: "Not included", subtext: null, included: false, isBest: false });
  }
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/viewModel.test.js`
Expected: FAIL with `Cannot find module '.../js/rows.js'`.

- [ ] **Step 3: Implement `js/rows.js`**

```js
import { coveragePerDollar } from "./compare.js";
import { formatCount, formatDays, formatMoney, formatPercent } from "./format.js";

/**
 * One entry per comparison row, in display order.
 * getValue returns a number, or null when the plan does not include it.
 */
export const ROWS = [
  {
    id: "monthly_premium",
    group: "Cost",
    label: "Monthly premium",
    getValue: (plan) => plan.monthly_premium,
    direction: "lower",
    format: (value) => `${formatMoney(value)}/mo`,
    subtext: (plan) => `${formatMoney(plan.monthly_premium * 12)}/yr`,
  },
  {
    id: "copay",
    group: "Cost",
    label: "Copay",
    hint: "Share of each bill you pay",
    getValue: (plan) => plan.copay_percentage,
    direction: "lower",
    format: formatPercent,
  },
  {
    id: "waiting_period",
    group: "Cost",
    label: "Waiting period",
    hint: "Days before coverage starts",
    getValue: (plan) => plan.waiting_period_days,
    direction: "lower",
    format: formatDays,
  },
  {
    id: "annual_limit",
    group: "Coverage",
    label: "Annual limit",
    hint: "Max paid per year, all benefits combined",
    getValue: (plan) => plan.annual_limit,
    direction: "higher",
    format: formatMoney,
  },
  {
    id: "outpatient_per_visit",
    group: "Coverage",
    label: "Outpatient: per visit",
    getValue: (plan) => plan.benefits.outpatient?.limit_per_visit ?? null,
    direction: "higher",
    format: formatMoney,
    isBenefit: true,
  },
  {
    id: "outpatient_visits",
    group: "Coverage",
    label: "Outpatient: visits/year",
    getValue: (plan) => plan.benefits.outpatient?.visits_per_year ?? null,
    direction: "higher",
    format: formatCount,
  },
  {
    id: "inpatient_per_day",
    group: "Coverage",
    label: "Inpatient: per day",
    getValue: (plan) => plan.benefits.inpatient?.limit_per_day ?? null,
    direction: "higher",
    format: formatMoney,
    isBenefit: true,
  },
  {
    id: "inpatient_days",
    group: "Coverage",
    label: "Inpatient: days/year",
    getValue: (plan) => plan.benefits.inpatient?.days_per_year ?? null,
    direction: "higher",
    format: formatCount,
  },
  {
    id: "dental",
    group: "Extra benefits",
    label: "Dental",
    getValue: (plan) => plan.benefits.dental?.limit_per_year ?? null,
    direction: "higher",
    format: (value) => `${formatMoney(value)}/yr`,
    isBenefit: true,
  },
  {
    id: "maternity",
    group: "Extra benefits",
    label: "Maternity",
    getValue: (plan) => plan.benefits.maternity?.limit_per_pregnancy ?? null,
    direction: "higher",
    format: (value) => `${formatMoney(value)}/pregnancy`,
    isBenefit: true,
  },
  {
    id: "coverage_per_dollar",
    group: "Value",
    label: "Coverage per $1 premium",
    getValue: coveragePerDollar,
    direction: "higher",
    format: (value) => formatMoney(Math.round(value)),
  },
];
```

- [ ] **Step 4: Implement `js/viewModel.js`**

```js
import { findBest, pickRecommended } from "./compare.js";

export const RECOMMENDATION_FORMULA = "annual limit × (100% − copay) ÷ yearly premium";

function buildCells(row, plans) {
  const values = plans.map((plan) => row.getValue(plan));
  const bestFlags = findBest(values, row.direction);

  return plans.map((plan, index) => {
    const value = values[index];
    if (value === null) {
      return { text: "Not included", subtext: null, included: false, isBest: false };
    }
    return {
      text: row.format(value),
      subtext: row.subtext ? row.subtext(plan) : null,
      included: row.isBenefit ? true : null,
      isBest: bestFlags[index],
    };
  });
}

export function buildViewModel(plans, rows) {
  const recommended = pickRecommended(plans);
  const groupTitles = [...new Set(rows.map((row) => row.group))];

  return {
    plans: plans.map((plan) => ({
      name: plan.name,
      tier: plan.name.toLowerCase(),
      isRecommended: plan === recommended,
      highlights: plan.highlights,
    })),
    groups: groupTitles.map((title) => ({
      title,
      rows: rows
        .filter((row) => row.group === title)
        .map((row) => ({
          id: row.id,
          label: row.label,
          hint: row.hint ?? null,
          cells: buildCells(row, plans),
        })),
    })),
    recommendation: { planName: recommended.name, formula: RECOMMENDATION_FORMULA },
  };
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test`
Expected: `ℹ tests 34`, `ℹ pass 34`, `ℹ fail 0` (6 format + 11 compare + 17 viewModel).

- [ ] **Step 6: Commit**

```bash
git add js/rows.js js/viewModel.js tests/viewModel.test.js
git commit -m "feat: add comparison rows config and view-model"
```

---

### Task 4: Page shell and DOM rendering

**Files:**
- Create: `index.html`
- Create: `js/render.js`
- Create: `js/main.js`

**Interfaces:**
- Consumes: `PLANS` (Task 1), `ROWS` and `buildViewModel` (Task 3), and the `ViewModel` shape from Task 3.
- Produces (`js/render.js`), each returning one `HTMLElement`:
  - `renderTable(vm)` → `div.table-view > table.compare-table`
  - `renderCards(vm)` → `div.card-list > article.plan-card × N`
  - `renderNotes(vm)` → `div.notes`
- CSS class contract used by Task 5: `table-view`, `compare-table`, `corner`, `group-row`, `card-list`, `plan-card`, `card-group`, `card-group-title`, `plan-head`, `tier-bronze|silver|gold`, `plan-name`, `badge`, `tags`, `tag`, `row-label`, `row-hint`, `value`, `subtext`, `icon`, `icon-yes`, `icon-no`, `best-pill`, `cell`, `is-best`, `is-excluded`, `is-recommended`, `notes`, `legend`, `visually-hidden`, `page`, `page-header`, `subtitle`.

`render.js` is DOM-only, so it has no unit test. It is verified in a real browser in Step 5.

- [ ] **Step 1: Create `index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Compare Insurance Plans</title>
    <meta name="description" content="Compare Bronze, Silver and Gold insurance plans side by side." />
    <link rel="stylesheet" href="css/styles.css" />
    <script type="module" src="js/main.js"></script>
  </head>
  <body>
    <main class="page">
      <header class="page-header">
        <h1>Compare our plans</h1>
        <p class="subtitle">Find the coverage that fits you</p>
      </header>
      <div id="app"></div>
      <noscript>Please enable JavaScript to see the plan comparison.</noscript>
    </main>
  </body>
</html>
```

All paths are relative (no leading `/`), so the page works when GitHub Pages serves it under `/<repo-name>/`.

- [ ] **Step 2: Create `js/render.js`**

```js
/** Creates an element. props: className, text, or any attribute; falsy props and children are skipped. */
function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value === null || value === undefined || value === false) continue;
    if (key === "className") node.className = value;
    else if (key === "text") node.textContent = value;
    else node.setAttribute(key, value);
  }
  for (const child of [].concat(children)) {
    if (child === null || child === undefined || child === false) continue;
    node.append(child);
  }
  return node;
}

function icon(included) {
  if (included === true) return el("span", { className: "icon icon-yes", "aria-hidden": "true", text: "✓" });
  if (included === false) return el("span", { className: "icon icon-no", "aria-hidden": "true", text: "✗" });
  return null;
}

function bestPill() {
  return el("span", { className: "best-pill", text: "Best" });
}

function planHeader(plan, nameTag) {
  return el("div", { className: `plan-head tier-${plan.tier}` }, [
    plan.isRecommended && el("span", { className: "badge", text: "★ Recommended" }),
    el(nameTag, { className: "plan-name", text: plan.name }),
    el(
      "ul",
      { className: "tags", "aria-label": `${plan.name} highlights` },
      plan.highlights.map((highlight) => el("li", { className: "tag", text: highlight })),
    ),
  ]);
}

function rowLabel(row) {
  return [
    el("span", { className: "row-label", text: row.label }),
    row.hint && el("span", { className: "row-hint", text: row.hint }),
  ];
}

function cellContent(cell) {
  return [
    el("span", { className: "value" }, [icon(cell.included), cell.text]),
    cell.subtext && el("span", { className: "subtext", text: cell.subtext }),
    cell.isBest && bestPill(),
  ];
}

function cellClass(cell, plan) {
  return ["cell", cell.isBest && "is-best", cell.included === false && "is-excluded", plan.isRecommended && "is-recommended"]
    .filter(Boolean)
    .join(" ");
}

/** Desktop view: one semantic table, plans as columns. */
export function renderTable(vm) {
  const columnCount = vm.plans.length + 1;

  const head = el(
    "thead",
    {},
    el("tr", {}, [
      el("td", { className: "corner" }),
      ...vm.plans.map((plan) =>
        el("th", { scope: "col", className: plan.isRecommended ? "is-recommended" : null }, planHeader(plan, "span")),
      ),
    ]),
  );

  const bodies = vm.groups.map((group) =>
    el("tbody", {}, [
      el("tr", { className: "group-row" }, el("th", { scope: "rowgroup", colspan: String(columnCount), text: group.title })),
      ...group.rows.map((row) =>
        el("tr", {}, [
          el("th", { scope: "row" }, rowLabel(row)),
          ...row.cells.map((cell, index) => el("td", { className: cellClass(cell, vm.plans[index]) }, cellContent(cell))),
        ]),
      ),
    ]),
  );

  return el(
    "div",
    { className: "table-view" },
    el("table", { className: "compare-table" }, [
      el("caption", { className: "visually-hidden", text: "Insurance plan comparison" }),
      head,
      ...bodies,
    ]),
  );
}

/** Mobile view: one card per plan, stacked vertically. */
export function renderCards(vm) {
  return el(
    "div",
    { className: "card-list" },
    vm.plans.map((plan, planIndex) =>
      el("article", { className: `plan-card${plan.isRecommended ? " is-recommended" : ""}`, "aria-label": `${plan.name} plan` }, [
        planHeader(plan, "h2"),
        ...vm.groups.map((group) =>
          el("section", { className: "card-group" }, [
            el("h3", { className: "card-group-title", text: group.title }),
            el(
              "dl",
              {},
              group.rows.flatMap((row) => {
                const cell = row.cells[planIndex];
                return [el("dt", {}, rowLabel(row)), el("dd", { className: cellClass(cell, plan) }, cellContent(cell))];
              }),
            ),
          ]),
        ),
      ]),
    ),
  );
}

/** Legend and the explanation of the recommended plan. */
export function renderNotes(vm) {
  const { planName, formula } = vm.recommendation;
  return el("div", { className: "notes" }, [
    el("p", { className: "legend" }, [
      el("span", {}, [icon(true), " Included"]),
      el("span", {}, [icon(false), " Not included"]),
      el("span", {}, [bestPill(), " Best value in the row"]),
    ]),
    el("p", {}, [
      el("strong", { text: `Why ${planName} is recommended: ` }),
      `it pays out the most per $1 of premium. Coverage per $1 premium = ${formula}. ` +
        "This compares maximum payouts, not how much you are likely to use.",
    ]),
  ]);
}
```

- [ ] **Step 3: Create `js/main.js`**

```js
import { PLANS } from "./data.js";
import { renderCards, renderNotes, renderTable } from "./render.js";
import { ROWS } from "./rows.js";
import { buildViewModel } from "./viewModel.js";

const vm = buildViewModel(PLANS, ROWS);
document.getElementById("app").append(renderTable(vm), renderCards(vm), renderNotes(vm));
```

- [ ] **Step 4: Confirm the unit tests still pass**

Run: `npm test`
Expected: `ℹ pass 34`, `ℹ fail 0`.

- [ ] **Step 5: Verify in the browser (unstyled)**

Run `npm start` in the background. The `css/styles.css` 404 is expected until Task 5. Open `http://localhost:8000` and run in the page console:

```js
({
  tableCells: document.querySelectorAll(".compare-table tbody td").length,
  cards: document.querySelectorAll(".plan-card").length,
  goldTexts: [...document.querySelectorAll(".compare-table tbody tr:not(.group-row)")].map((tr) => tr.lastElementChild.querySelector(".value").textContent),
  recommendedHeaders: [...document.querySelectorAll(".badge")].map((badge) => badge.closest(".plan-head").querySelector(".plan-name").textContent),
})
```

Expected:
- `tableCells: 33`
- `cards: 3`
- `goldTexts: ["$700/mo","0%","None","$5,000,000","✓$10,000","Unlimited","✓$50,000","Unlimited","✓$100,000/yr","✓$200,000/pregnancy","$595"]`
- `recommendedHeaders: ["Gold","Gold"]` (one in the table, one in the cards)
- No errors in the console except the `styles.css` 404.

Stop the server afterwards.

- [ ] **Step 6: Commit**

```bash
git add index.html js/render.js js/main.js
git commit -m "feat: render comparison table, mobile cards and notes"
```

---

### Task 5: Styles: desktop table, mobile cards, breakpoint

**Files:**
- Create: `css/styles.css`

**Interfaces:**
- Consumes: the CSS class contract listed in Task 4.
- Produces: the finished visual design (spec §7). Tokens use the values in spec §7.5.

- [ ] **Step 1: Create `css/styles.css`**

```css
:root {
  --bg: #f7f8fa;
  --surface: #ffffff;
  --border: #e5e7eb;
  --radius: 12px;
  --shadow: 0 1px 3px rgba(17, 24, 39, 0.06), 0 1px 2px rgba(17, 24, 39, 0.04);
  --text: #111827;
  --muted: #6b7280;
  --primary: #1e3a8a;
  --primary-soft: #f5f8ff;
  --best-bg: #eef4ff;
  --included: #16a34a;
  --excluded: #6b7280;
  --tier-bronze: #b87333;
  --tier-silver: #8a94a6;
  --tier-gold: #c9a227;
}

*,
*::before,
*::after {
  box-sizing: border-box;
}

body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  font-size: 16px;
  line-height: 1.5;
}

.page {
  max-width: 1080px;
  margin: 0 auto;
  padding: 48px 24px 64px;
}

.page-header {
  margin-bottom: 32px;
  text-align: center;
}

.page-header h1 {
  margin: 0;
  color: var(--primary);
  font-size: 2rem;
}

.subtitle {
  margin: 8px 0 0;
  color: var(--muted);
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}

/* ---------- Plan header (table column head and card head) ---------- */

.plan-head {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 36px 12px 16px;
  border-top: 4px solid var(--tier-color);
}

.tier-bronze { --tier-color: var(--tier-bronze); }
.tier-silver { --tier-color: var(--tier-silver); }
.tier-gold { --tier-color: var(--tier-gold); }

.plan-name {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
}

/* Absolutely positioned so plan names line up whether or not a plan has the badge. */
.badge {
  position: absolute;
  top: 8px;
  left: 50%;
  transform: translateX(-50%);
  white-space: nowrap;
  padding: 2px 10px;
  border-radius: 999px;
  background: var(--primary);
  color: #ffffff;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.tag {
  padding: 2px 8px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--bg);
  color: var(--muted);
  font-size: 0.75rem;
}

/* ---------- Row labels and cell content (both views) ---------- */

.row-label {
  display: block;
  font-weight: 600;
}

.row-hint {
  display: block;
  color: var(--muted);
  font-size: 0.8125rem;
}

.value {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
}

.subtext {
  display: block;
  color: var(--muted);
  font-size: 0.8125rem;
}

.icon { font-weight: 700; }
.icon-yes { color: var(--included); }
.icon-no { color: var(--excluded); }

.is-excluded .value {
  color: var(--excluded);
  font-weight: 400;
}

.is-best { background: var(--best-bg); }

.best-pill {
  display: inline-block;
  padding: 0 8px;
  border: 1px solid var(--primary);
  border-radius: 999px;
  color: var(--primary);
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

/* ---------- Desktop table ---------- */

.table-view {
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  box-shadow: var(--shadow);
}

.compare-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

.compare-table th,
.compare-table td {
  padding: 14px 16px;
  border-bottom: 1px solid var(--border);
}

.compare-table .corner { width: 28%; }

.compare-table thead th {
  padding: 0;
  vertical-align: top;
  font-weight: inherit;
}

.compare-table th[scope="row"] {
  font-weight: inherit;
  text-align: left;
}

.compare-table td { text-align: center; }

.compare-table td .best-pill {
  display: block;
  width: max-content;
  margin: 4px auto 0;
}

.compare-table .group-row th {
  padding: 8px 16px;
  background: var(--bg);
  color: var(--muted);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-align: left;
  text-transform: uppercase;
}

.compare-table .is-recommended {
  background: var(--primary-soft);
  box-shadow: inset 2px 0 0 var(--primary), inset -2px 0 0 var(--primary);
}

.compare-table .is-recommended.is-best { background: var(--best-bg); }

.compare-table tbody:last-child tr:last-child > * { border-bottom: 0; }

/* ---------- Mobile cards ---------- */

.card-list { display: none; }

.plan-card {
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  box-shadow: var(--shadow);
}

.plan-card.is-recommended { border: 2px solid var(--primary); }

.plan-card .plan-head { border-bottom: 1px solid var(--border); }

.card-group { padding: 0 16px; }

.card-group-title {
  margin: 0;
  padding: 12px 0 4px;
  color: var(--muted);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.card-group dl {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  margin: 0;
}

.card-group dt,
.card-group dd {
  padding: 10px 0;
  border-bottom: 1px solid var(--border);
}

.card-group dd {
  margin: 0;
  padding-left: 12px;
  text-align: right;
}

.card-group dd.is-best { padding-right: 8px; }

.card-group dd .best-pill { margin-top: 4px; }

.card-group:last-child dl > :nth-last-child(-n + 2) { border-bottom: 0; }

/* ---------- Notes ---------- */

.notes {
  margin-top: 24px;
  color: var(--muted);
  font-size: 0.875rem;
}

.legend {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 20px;
}

/* ---------- Mobile breakpoint ---------- */

@media (max-width: 767px) {
  .page { padding: 32px 16px 48px; }
  .page-header h1 { font-size: 1.5rem; }
  .table-view { display: none; }
  .card-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
}
```

- [ ] **Step 2: Verify desktop (1280px) in the browser**

Run `npm start` in the background and open `http://localhost:8000` at a 1280px-wide viewport. Take a screenshot and check:
- Title "Compare our plans" is centered. The table has 3 plan columns with bronze, silver, and gold top stripes.
- Gold has the `★ Recommended` badge, a navy left/right column border, and a tinted background.
- Group rows COST / COVERAGE / EXTRA BENEFITS / VALUE are visible.
- `BEST` pills: Bronze on Monthly premium, Gold on every other row.
- Dental Bronze and Maternity Bronze/Silver show a grey `✗ Not included`.

Then run in the console:

```js
[...document.querySelectorAll(".compare-table .plan-head")].map((head) => [
  head.querySelector(".plan-name").textContent,
  Math.round(head.getBoundingClientRect().top),
  Math.round(head.querySelector(".plan-name").getBoundingClientRect().top),
])
```

Expected: all three entries have the same stripe top and the same name top. That confirms the badge doesn't push Gold's header out of line.

- [ ] **Step 3: Verify the breakpoint and mobile (375px)**

At widths 768, 767 and 375, reload and run:

```js
({
  vw: innerWidth,
  table: getComputedStyle(document.querySelector(".table-view")).display,
  cards: getComputedStyle(document.querySelector(".card-list")).display,
  overflowX: document.documentElement.scrollWidth > innerWidth,
})
```

Expected:
- 768 → `table: "block"`, `cards: "none"`, `overflowX: false`
- 767 → `table: "none"`, `cards: "flex"`
- 375 → `table: "none"`, `cards: "flex"`, `overflowX: false`

At 375px, take a screenshot and check: 3 cards stacked Bronze → Silver → Gold; each row laid out as `label …… value`; Gold card has a navy 2px border and the `★ Recommended` badge.

Stop the server afterwards.

- [ ] **Step 4: Commit**

```bash
git add css/styles.css
git commit -m "style: add comparison table and mobile card styles"
```

---

### Task 6: GitHub Pages deployment and README

**Files:**
- Create: `.github/workflows/deploy.yml`
- Create: `README.md`

**Interfaces:**
- Consumes: `npm test` (Tasks 1–3), and the site files `index.html`, `css/`, `js/` (Tasks 4–5).
- Produces: a CI workflow that runs the tests and then publishes only the site files, plus the README for reviewers.

- [ ] **Step 1: Create `.github/workflows/deploy.yml`**

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [master]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 24

      - name: Run tests
        run: npm test

      - name: Collect site files
        run: |
          mkdir _site
          cp -r index.html css js _site/

      - uses: actions/configure-pages@v5

      - uses: actions/upload-pages-artifact@v3
        with:
          path: _site

      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: Dry-run the "Collect site files" step locally**

Run:

```bash
mkdir _site && cp -r index.html css js _site/ && find _site -type f | sort && rm -rf _site
```

Expected output (exactly these files, so no tests, docs, or markdown get published):

```
_site/css/styles.css
_site/index.html
_site/js/compare.js
_site/js/data.js
_site/js/format.js
_site/js/main.js
_site/js/render.js
_site/js/rows.js
_site/js/viewModel.js
```

- [ ] **Step 3: Create `README.md`**

````markdown
# Insurance Plan Comparison

A single page that compares the Bronze, Silver and Gold insurance plans side by side. It highlights the best value in each row and recommends the plan with the best value for money.

- **Live URL:** _add after the first GitHub Pages deploy_
- **Challenge:** [`AI_Engineering_Challenges/AI_Challenge_01.md`](AI_Engineering_Challenges/AI_Challenge_01.md)
- **Design spec:** [`docs/superpowers/specs/2026-09-11-insurance-plan-comparison-design.md`](docs/superpowers/specs/2026-09-11-insurance-plan-comparison-design.md)

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
js/data.js          plan data (verbatim from the challenge), currency
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
- Best value: lowest wins for premium, copay, and waiting period. Highest wins for every limit and count, and unlimited beats any number. A benefit that is not included never wins. Ties highlight every tied plan. If all plans are equal, nothing is highlighted.

## Deploy (GitHub Pages)

`.github/workflows/deploy.yml` runs the tests, then publishes only `index.html`, `css/` and `js/` on every push to `master`, or when run manually.

One-time setup after pushing: **Settings → Pages → Build and deployment → Source: GitHub Actions**.

## Timeline

| Step | Estimate |
|---|---|
| Requirements clarification + design | ~30 min |
| Setup + data, formatters, comparison logic with tests | ~30 min |
| Rows config + view-model with tests | ~20 min |
| HTML + rendering | ~20 min |
| CSS desktop + mobile | ~40 min |
| Visual QA + fixes | ~20 min |
| Deploy workflow + README | ~15 min |
| **Total** | **~2h 55m** |

## Approach

Built with Claude Code:

1. **Clarify before coding.** I went through the open questions one at a time: stack, currency, the value-for-money formula (three formulas compared on the real data), mobile layout, and hosting. The decisions are recorded in the design spec.
2. **Decompose by responsibility.** Data → formatting → comparison rules → row config → view-model → rendering → styles. Each layer has one job and a small interface.
3. **Test the logic first (TDD).** The expected value of every cell is written down in the spec and asserted in `tests/viewModel.test.js`, which covers the "no missing or incorrect values" criterion directly.
4. **Verify visually.** Checked in a real browser at 1280px, 768px, 767px and 375px.
````

- [ ] **Step 4: Run the full test suite one last time**

Run: `npm test`
Expected: `ℹ pass 34`, `ℹ fail 0`.

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/deploy.yml README.md
git commit -m "ci: deploy to GitHub Pages; docs: add README"
```

---

## After the plan (user actions, not part of execution)

1. Create a GitHub repository and add it as `origin`.
2. Merge `challenge01` into `master` (the workflow deploys from `master`), then push.
3. In the repository: Settings → Pages → Source: **GitHub Actions**.
4. Paste the live URL into the README's "Live URL" line.
