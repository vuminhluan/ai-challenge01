import assert from "node:assert/strict";
import { test } from "node:test";
import { PLANS, TAGLINES } from "../js/data.js";
import { ROWS } from "../js/rows.js";
import { buildViewModel } from "../js/viewModel.js";

const vm = buildViewModel(PLANS, ROWS, TAGLINES);
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
  ["maternity",            ["Not included", "Not included", "$200,000 per pregnancy"], [false, false, true], [false, false, true]],
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

test("plan headers carry name, tier, tagline and the recommended flag", () => {
  assert.deepEqual(vm.plans, [
    { name: "Bronze", tier: "bronze", isRecommended: false, tagline: "Essential cover at the lowest monthly price." },
    { name: "Silver", tier: "silver", isRecommended: false, tagline: "Adds dental and halves your copay, at half the price of Gold." },
    { name: "Gold", tier: "gold", isRecommended: true, tagline: "Complete cover with no copay, no waiting and unlimited visits." },
  ]);
});

test("a plan without a tagline gets tagline null", () => {
  const plans = buildViewModel(PLANS, ROWS, {}).plans;
  assert.ok(plans.every((plan) => plan.tagline === null));
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
