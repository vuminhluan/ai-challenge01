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
