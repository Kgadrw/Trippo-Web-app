export function getReportPeriodRange(type: string): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  if (type === "daily") {
    return { start, end };
  }

  if (type === "weekly") {
    start.setDate(start.getDate() - start.getDay());
    return { start, end };
  }

  if (type === "monthly") {
    start.setDate(1);
    return { start, end };
  }

  if (type === "yearly") {
    start.setMonth(0, 1);
    return { start, end };
  }

  return { start, end };
}

export function isInReportPeriod(ms: number, type: string): boolean {
  const { start, end } = getReportPeriodRange(type);
  return ms >= start.getTime() && ms <= end.getTime();
}

export function getReportDateRangeLabel(type: string): string {
  const { start, end } = getReportPeriodRange(type);
  if (type === "daily") {
    return start.toLocaleDateString();
  }
  if (type === "weekly") {
    return `${start.toLocaleDateString()} – ${end.toLocaleDateString()}`;
  }
  if (type === "monthly") {
    return start.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  }
  if (type === "yearly") {
    return String(start.getFullYear());
  }
  return start.toLocaleDateString();
}

export function parseDateMs(dateStr: string | undefined | null): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  const ms = d.getTime();
  return Number.isNaN(ms) ? null : ms;
}

export function filterByReportPeriod<T>(
  items: T[],
  type: string,
  getMs: (item: T) => number | null,
): T[] {
  return items.filter((item) => {
    const ms = getMs(item);
    return ms !== null && isInReportPeriod(ms, type);
  });
}
