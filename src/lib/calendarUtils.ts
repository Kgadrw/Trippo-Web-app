const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export type CalendarViewMode = "day" | "week" | "month" | "year";

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

export function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function toDateInputValue(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function toTimeInputValue(date: Date) {
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

export function combineDateAndTime(dateStr: string, timeStr: string) {
  const [y, mo, d] = dateStr.split("-").map(Number);
  const [h, mi] = (timeStr || "09:00").split(":").map(Number);
  return new Date(y, mo - 1, d, h, mi, 0, 0);
}

export function getMonthGrid(year: number, month: number) {
  const firstOfMonth = new Date(year, month, 1);
  const startOffset = firstOfMonth.getDay();
  const gridStart = new Date(year, month, 1 - startOffset);

  const cells: Date[] = [];
  for (let i = 0; i < 42; i += 1) {
    const cell = new Date(gridStart);
    cell.setDate(gridStart.getDate() + i);
    cells.push(cell);
  }
  return cells;
}

export function getMonthLabel(year: number, month: number) {
  return new Date(year, month, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

export function getWeekdayLabels() {
  return WEEKDAY_LABELS;
}

export function eventOccursOnDay(eventStart: string | Date, day: Date) {
  const start = new Date(eventStart);
  return isSameDay(start, day);
}

export function formatEventTime(event: { startDate: string; endDate?: string; allDay?: boolean }) {
  if (event.allDay) return "All day";
  const start = new Date(event.startDate);
  const startText = start.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  if (!event.endDate) return startText;
  const end = new Date(event.endDate);
  const endText = end.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  return `${startText} – ${endText}`;
}

export function getMonthRange(year: number, month: number) {
  const start = new Date(year, month, 1);
  start.setDate(start.getDate() - start.getDay());
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 41);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

export function getWeekStart(date: Date) {
  const d = startOfDay(date);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

export function getWeekDays(anchor: Date) {
  const start = getWeekStart(anchor);
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    return day;
  });
}

export function getWeekRange(anchor: Date) {
  const start = getWeekStart(anchor);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export function getDayRange(date: Date) {
  return { start: startOfDay(date), end: endOfDay(date) };
}

export function getYearRange(year: number) {
  return {
    start: new Date(year, 0, 1, 0, 0, 0, 0),
    end: new Date(year, 11, 31, 23, 59, 59, 999),
  };
}

export function getViewRange(
  mode: CalendarViewMode,
  selectedDay: Date,
  viewYear: number,
  viewMonth: number,
) {
  switch (mode) {
    case "day":
      return getDayRange(selectedDay);
    case "week":
      return getWeekRange(selectedDay);
    case "year":
      return getYearRange(viewYear);
    case "month":
    default:
      return getMonthRange(viewYear, viewMonth);
  }
}

export function getWeekLabel(anchor: Date) {
  const days = getWeekDays(anchor);
  const first = days[0];
  const last = days[6];
  const sameMonth = first.getMonth() === last.getMonth();
  const sameYear = first.getFullYear() === last.getFullYear();

  if (sameMonth && sameYear) {
    return `${first.toLocaleDateString(undefined, { month: "long" })} ${first.getDate()} – ${last.getDate()}, ${first.getFullYear()}`;
  }
  if (sameYear) {
    return `${first.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${last.toLocaleDateString(undefined, { month: "short", day: "numeric" })}, ${first.getFullYear()}`;
  }
  return `${first.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })} – ${last.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
}

export function getDayLabel(date: Date) {
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function getYearLabel(year: number) {
  return String(year);
}

export function getViewTitle(
  mode: CalendarViewMode,
  selectedDay: Date,
  viewYear: number,
  viewMonth: number,
) {
  switch (mode) {
    case "day":
      return getDayLabel(selectedDay);
    case "week":
      return getWeekLabel(selectedDay);
    case "year":
      return getYearLabel(viewYear);
    case "month":
    default:
      return getMonthLabel(viewYear, viewMonth);
  }
}

export function shiftViewDate(
  mode: CalendarViewMode,
  selectedDay: Date,
  viewYear: number,
  viewMonth: number,
  direction: -1 | 1,
) {
  if (mode === "day") {
    const next = new Date(selectedDay);
    next.setDate(next.getDate() + direction);
    return { selectedDay: startOfDay(next), viewYear: next.getFullYear(), viewMonth: next.getMonth() };
  }
  if (mode === "week") {
    const next = new Date(selectedDay);
    next.setDate(next.getDate() + direction * 7);
    return { selectedDay: startOfDay(next), viewYear: next.getFullYear(), viewMonth: next.getMonth() };
  }
  if (mode === "year") {
    const year = viewYear + direction;
    return {
      selectedDay: startOfDay(new Date(year, selectedDay.getMonth(), selectedDay.getDate())),
      viewYear: year,
      viewMonth: selectedDay.getMonth(),
    };
  }
  // month
  let month = viewMonth + direction;
  let year = viewYear;
  if (month < 0) {
    month = 11;
    year -= 1;
  } else if (month > 11) {
    month = 0;
    year += 1;
  }
  const day = Math.min(selectedDay.getDate(), new Date(year, month + 1, 0).getDate());
  return {
    selectedDay: startOfDay(new Date(year, month, day)),
    viewYear: year,
    viewMonth: month,
  };
}

export function getYearMonthGrid(year: number, month: number) {
  const firstOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = firstOfMonth.getDay();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startOffset; i += 1) cells.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) {
    cells.push(new Date(year, month, d));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}
