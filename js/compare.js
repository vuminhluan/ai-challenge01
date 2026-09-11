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
