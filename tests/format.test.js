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
