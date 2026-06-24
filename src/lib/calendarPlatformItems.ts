import { CalendarEventRecord, getEventColor, normalizeEventType } from "@/lib/calendarEventTypes";
import { eventOccursOnDay } from "@/lib/calendarUtils";

export type PlatformCalendarSource =
  | "event"
  | "automation"
  | "sale"
  | "income"
  | "expense"
  | "bill"
  | "tax"
  | "invoice"
  | "payroll"
  | "deposit";

export interface CalendarDisplayItem {
  id: string;
  source: PlatformCalendarSource;
  title: string;
  date: string;
  amount?: number;
  color: string;
  subtitle?: string;
  link?: string;
  editable: boolean;
  calendarEvent?: CalendarEventRecord;
}

export const PLATFORM_SOURCE_COLORS: Record<PlatformCalendarSource, string> = {
  event: "#ea580c",
  automation: "#6366f1",
  sale: "#059669",
  income: "#16a34a",
  expense: "#dc2626",
  bill: "#d97706",
  tax: "#9333ea",
  invoice: "#2563eb",
  payroll: "#db2777",
  deposit: "#0891b2",
};

export const PLATFORM_SOURCE_LABEL_KEYS: Record<PlatformCalendarSource, string> = {
  event: "calSourceEvent",
  automation: "calAutomationItem",
  sale: "calSourceSale",
  income: "calSourceIncome",
  expense: "calSourceExpense",
  bill: "calSourceBill",
  tax: "calSourceTax",
  invoice: "calSourceInvoice",
  payroll: "calSourcePayroll",
  deposit: "calSourceDeposit",
};

export interface PlatformRawData {
  sales: Record<string, unknown>[];
  incomes: Record<string, unknown>[];
  expenses: Record<string, unknown>[];
  bills: Record<string, unknown>[];
  taxes: Record<string, unknown>[];
  invoices: Record<string, unknown>[];
  payrolls: Record<string, unknown>[];
  deposits: Record<string, unknown>[];
}

function rowId(row: Record<string, unknown>, prefix: string) {
  return `${prefix}-${String(row._id ?? row.id ?? Math.random())}`;
}

function pickDate(row: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value) return value;
  }
  return "";
}

function pickAmount(row: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = Number(row[key]);
    if (!Number.isNaN(value) && value !== 0) return value;
  }
  return undefined;
}

export function buildPlatformCalendarItems(data: PlatformRawData): CalendarDisplayItem[] {
  const items: CalendarDisplayItem[] = [];

  for (const sale of data.sales) {
    const date = pickDate(sale, "date", "timestamp");
    if (!date) continue;
    items.push({
      id: rowId(sale, "sale"),
      source: "sale",
      title: String(sale.product || sale.serviceName || "Sale"),
      date,
      amount: pickAmount(sale, "revenue", "amount"),
      color: PLATFORM_SOURCE_COLORS.sale,
      link: "/sales",
      editable: false,
    });
  }

  for (const income of data.incomes) {
    const date = pickDate(income, "date");
    if (!date) continue;
    items.push({
      id: rowId(income, "income"),
      source: "income",
      title: String(income.title || income.source || "Income"),
      date,
      amount: pickAmount(income, "amount"),
      color: PLATFORM_SOURCE_COLORS.income,
      link: "/finance/income",
      editable: false,
    });
  }

  for (const expense of data.expenses) {
    const date = pickDate(expense, "date");
    if (!date) continue;
    items.push({
      id: rowId(expense, "expense"),
      source: "expense",
      title: String(expense.title || expense.category || "Expense"),
      date,
      amount: pickAmount(expense, "amount"),
      color: PLATFORM_SOURCE_COLORS.expense,
      link: "/finance/expenditure",
      editable: false,
    });
  }

  for (const bill of data.bills) {
    const date = pickDate(bill, "dueDate", "paidAt");
    if (!date) continue;
    items.push({
      id: rowId(bill, "bill"),
      source: "bill",
      title: String(bill.title || bill.vendor || "Bill"),
      date,
      amount: pickAmount(bill, "amount"),
      color: PLATFORM_SOURCE_COLORS.bill,
      subtitle: String(bill.status || "pending"),
      link: "/finance/bills",
      editable: false,
    });
  }

  for (const tax of data.taxes) {
    const date = pickDate(tax, "dueDate", "paidAt");
    if (!date) continue;
    items.push({
      id: rowId(tax, "tax"),
      source: "tax",
      title: String(tax.title || tax.type || "Tax"),
      date,
      amount: pickAmount(tax, "amount"),
      color: PLATFORM_SOURCE_COLORS.tax,
      subtitle: String(tax.status || "pending"),
      link: "/finance/taxes",
      editable: false,
    });
  }

  for (const invoice of data.invoices) {
    const date = pickDate(invoice, "dueDate", "issueDate", "paidAt");
    if (!date) continue;
    items.push({
      id: rowId(invoice, "invoice"),
      source: "invoice",
      title: String(invoice.title || invoice.invoiceNumber || invoice.clientName || "Invoice"),
      date,
      amount: pickAmount(invoice, "amount", "total"),
      color: PLATFORM_SOURCE_COLORS.invoice,
      subtitle: String(invoice.status || "draft"),
      link: "/finance/invoices",
      editable: false,
    });
  }

  for (const payroll of data.payrolls) {
    const date = pickDate(payroll, "paymentDate", "date");
    if (!date) continue;
    items.push({
      id: rowId(payroll, "payroll"),
      source: "payroll",
      title: String(payroll.title || payroll.employeeName || payroll.name || "Payroll"),
      date,
      amount: pickAmount(payroll, "amount"),
      color: PLATFORM_SOURCE_COLORS.payroll,
      subtitle: String(payroll.status || "pending"),
      link: "/finance/payroll",
      editable: false,
    });
  }

  for (const deposit of data.deposits) {
    const date = pickDate(deposit, "date", "depositDate");
    if (!date) continue;
    items.push({
      id: rowId(deposit, "deposit"),
      source: "deposit",
      title: String(deposit.title || deposit.bankName || deposit.accountName || "Bank deposit"),
      date,
      amount: pickAmount(deposit, "amount"),
      color: PLATFORM_SOURCE_COLORS.deposit,
      link: "/finance/deposits",
      editable: false,
    });
  }

  return items;
}

export function buildCalendarEventItems(events: CalendarEventRecord[]): CalendarDisplayItem[] {
  return events.map((event) => ({
    id: rowId(event as unknown as Record<string, unknown>, "event"),
    source: "event" as const,
    title: event.title,
    date: event.startDate,
    color: getEventColor(event),
    subtitle: normalizeEventType(event.eventType),
    editable: true,
    calendarEvent: event,
  }));
}

export function buildAutomationItems(
  schedules: { _id?: string; title: string; dueDate: string; status?: string; automationType?: string }[],
): CalendarDisplayItem[] {
  return schedules
    .filter((s) => s.status === "pending")
    .map((schedule) => ({
      id: rowId(schedule as unknown as Record<string, unknown>, "automation"),
      source: "automation" as const,
      title: schedule.title,
      date: schedule.dueDate,
      color: PLATFORM_SOURCE_COLORS.automation,
      subtitle: schedule.automationType || "custom",
      link: "/schedules",
      editable: false,
    }));
}

export function itemsForDay(items: CalendarDisplayItem[], day: Date) {
  return items.filter((item) => eventOccursOnDay(item.date, day));
}

export function formatCalendarAmount(amount?: number) {
  if (amount == null) return "";
  return `Rwf ${Math.round(amount).toLocaleString()}`;
}

export type CalendarFilterValue = "all" | string;

export function buildFilteredDisplayItems(
  typeFilter: CalendarFilterValue,
  events: CalendarEventRecord[],
  platformItems: CalendarDisplayItem[],
  automationItems: CalendarDisplayItem[],
): CalendarDisplayItem[] {
  if (typeFilter === "all") {
    return [
      ...buildCalendarEventItems(events),
      ...automationItems,
      ...platformItems,
    ];
  }

  return buildCalendarEventItems(events).filter(
    (item) => item.calendarEvent && normalizeEventType(item.calendarEvent.eventType) === typeFilter,
  );
}
