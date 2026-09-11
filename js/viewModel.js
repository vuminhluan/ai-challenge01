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

export function buildViewModel(plans, rows, taglines = {}) {
  const recommended = pickRecommended(plans);
  const groupTitles = [...new Set(rows.map((row) => row.group))];

  return {
    plans: plans.map((plan) => ({
      name: plan.name,
      tier: plan.name.toLowerCase(),
      isRecommended: plan === recommended,
      tagline: taglines[plan.name] ?? null,
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
