export type BudgetPeriod = "monthly" | "quarterly" | "yearly" | "custom";
export type ViewPeriod = "monthly" | "quarterly" | "yearly";

export function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function computeBudgetPeriodBounds(
  depositDate: string,
  budgetPeriod: BudgetPeriod,
  customStart?: string,
  customEnd?: string,
) {
  const base = startOfDay(new Date(`${depositDate}T00:00:00`));
  const year = base.getFullYear();
  const month = base.getMonth();

  if (budgetPeriod === "custom") {
    const periodStart = customStart ? startOfDay(new Date(`${customStart}T00:00:00`)) : base;
    const periodEnd = customEnd ? endOfDay(new Date(`${customEnd}T00:00:00`)) : endOfDay(base);
    return { periodStart, periodEnd };
  }

  if (budgetPeriod === "quarterly") {
    const quarter = Math.floor(month / 3);
    const periodStart = new Date(year, quarter * 3, 1);
    const periodEnd = endOfDay(new Date(year, quarter * 3 + 3, 0));
    return { periodStart, periodEnd };
  }

  if (budgetPeriod === "yearly") {
    const periodStart = new Date(year, 0, 1);
    const periodEnd = endOfDay(new Date(year, 11, 31));
    return { periodStart, periodEnd };
  }

  const periodStart = new Date(year, month, 1);
  const periodEnd = endOfDay(new Date(year, month + 1, 0));
  return { periodStart, periodEnd };
}

export function getViewPeriodBounds(viewPeriod: ViewPeriod, referenceDate = new Date()) {
  const ref = startOfDay(referenceDate);
  const year = ref.getFullYear();
  const month = ref.getMonth();

  if (viewPeriod === "quarterly") {
    const quarter = Math.floor(month / 3);
    const periodStart = new Date(year, quarter * 3, 1);
    const periodEnd = endOfDay(new Date(year, quarter * 3 + 3, 0));
    return { periodStart, periodEnd };
  }

  if (viewPeriod === "yearly") {
    const periodStart = new Date(year, 0, 1);
    const periodEnd = endOfDay(new Date(year, 11, 31));
    return { periodStart, periodEnd };
  }

  const periodStart = new Date(year, month, 1);
  const periodEnd = endOfDay(new Date(year, month + 1, 0));
  return { periodStart, periodEnd };
}

export function periodsOverlap(startA: Date, endA: Date, startB: Date, endB: Date) {
  return startA <= endB && endA >= startB;
}

export function formatPeriodLabel(start: Date, end: Date) {
  const sameMonth =
    start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth();
  if (sameMonth) {
    return start.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
  }
  const sameYear = start.getFullYear() === end.getFullYear();
  if (sameYear) {
    return `${start.toLocaleDateString("en-GB", { month: "short" })} – ${end.toLocaleDateString("en-GB", { month: "short", year: "numeric" })}`;
  }
  return `${start.toLocaleDateString("en-GB", { month: "short", year: "numeric" })} – ${end.toLocaleDateString("en-GB", { month: "short", year: "numeric" })}`;
}
