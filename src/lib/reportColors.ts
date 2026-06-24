/** Shared income / expense / revenue colors for reports UI and PDF exports. */
export const INCOME_COLOR = "#22c55e";
export const EXPENSE_COLOR = "#ef4444";
export const REVENUE_COLOR = "#2563eb";
export const PROFIT_COLOR = "#10b981";
export const NEUTRAL_COLOR = "#64748b";

export const INCOME_RGB: [number, number, number] = [34, 197, 94];
export const EXPENSE_RGB: [number, number, number] = [239, 68, 68];
export const REVENUE_RGB: [number, number, number] = [37, 99, 235];
export const PROFIT_RGB: [number, number, number] = [16, 185, 129];

export const incomeTextClass = "text-emerald-600 font-semibold tabular-nums";
export const expenseTextClass = "text-red-600 font-semibold tabular-nums";
export const revenueTextClass = "text-blue-600 font-semibold tabular-nums";

export function netTextClass(value: number) {
  return value >= 0 ? incomeTextClass : expenseTextClass;
}

export function formatReportMoney(amount: number) {
  return `${Math.round(amount).toLocaleString()} Rwf`;
}
