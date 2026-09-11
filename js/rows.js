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
    format: (value) => `${formatMoney(value)} per pregnancy`, // spaces let it wrap in narrow columns
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
