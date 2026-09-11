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
