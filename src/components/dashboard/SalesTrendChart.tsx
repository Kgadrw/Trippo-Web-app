import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { periodToggleClass } from "@/lib/fieldStyles";
import { useTranslation } from "@/hooks/useTranslation";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface Sale {
  date: string | Date;
  timestamp?: string;
  revenue: number;
}

interface Expense {
  date: string | Date;
  amount: number;
}

type ChartPeriod = "week" | "month" | "year";

interface SalesTrendChartProps {
  sales?: Sale[];
  expenses?: Expense[];
  className?: string;
}

const REVENUE_BLUE = "#2563eb";
const EXPENSE_RED = "#ef4444";

function startOfLocalDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfLocalDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function getSaleTimeMs(sale: Sale): number | null {
  if (sale.timestamp) {
    const t = new Date(sale.timestamp).getTime();
    if (!Number.isNaN(t)) return t;
  }
  if (typeof sale.date === "string") {
    const raw = sale.date.includes("T") ? sale.date : `${sale.date}T12:00:00`;
    const t = new Date(raw).getTime();
    if (!Number.isNaN(t)) return t;
  }
  if (sale.date != null) {
    const t = new Date(sale.date as string | number).getTime();
    if (!Number.isNaN(t)) return t;
  }
  return null;
}

function getExpenseTimeMs(expense: Expense): number | null {
  if (!expense?.date) return null;
  const d = expense.date;
  if (typeof d === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
      const t = new Date(`${d}T12:00:00`).getTime();
      return Number.isNaN(t) ? null : t;
    }
    const t = new Date(d).getTime();
    if (!Number.isNaN(t)) return t;
  }
  const t = new Date(d as string | number).getTime();
  return Number.isNaN(t) ? null : t;
}

function sumRevenueInRange(sales: Sale[], startMs: number, endMs: number): number {
  return sales
    .filter((sale) => {
      const t = getSaleTimeMs(sale);
      return t !== null && t >= startMs && t <= endMs;
    })
    .reduce((sum, sale) => sum + (Number(sale.revenue) || 0), 0);
}

function sumExpensesInRange(expenses: Expense[], startMs: number, endMs: number): number {
  return expenses
    .filter((expense) => {
      const t = getExpenseTimeMs(expense);
      return t !== null && t >= startMs && t <= endMs;
    })
    .reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0);
}

function getLocaleTag(language: string): string {
  if (language === "fr") return "fr-FR";
  if (language === "rw") return "rw-RW";
  return "en-US";
}

export function SalesTrendChart({ sales = [], expenses = [], className }: SalesTrendChartProps) {
  const { t, language } = useTranslation();
  const [period, setPeriod] = useState<ChartPeriod>("week");

  const dayLabels = useMemo(
    () => [
      t("daySun"),
      t("dayMon"),
      t("dayTue"),
      t("dayWed"),
      t("dayThu"),
      t("dayFri"),
      t("daySat"),
    ],
    [t],
  );

  const localeTag = getLocaleTag(language);

  const chartData = useMemo(() => {
    const today = startOfLocalDay(new Date());

    if (period === "week") {
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date(today);
        date.setDate(date.getDate() - (6 - i));
        return date;
      });

      return last7Days.map((date) => {
        const startMs = startOfLocalDay(date).getTime();
        const endMs = endOfLocalDay(date).getTime();
        return {
          label: dayLabels[date.getDay()],
          sales: sumRevenueInRange(sales, startMs, endMs),
          expenses: sumExpensesInRange(expenses, startMs, endMs),
        };
      });
    }

    if (period === "month") {
      const year = today.getFullYear();
      const month = today.getMonth();
      const endDay = today.getDate();

      return Array.from({ length: endDay }, (_, i) => {
        const day = i + 1;
        const date = new Date(year, month, day);
        const startMs = startOfLocalDay(date).getTime();
        const endMs = endOfLocalDay(date).getTime();
        return {
          label: String(day),
          sales: sumRevenueInRange(sales, startMs, endMs),
          expenses: sumExpensesInRange(expenses, startMs, endMs),
        };
      });
    }

    const year = today.getFullYear();
    return Array.from({ length: 12 }, (_, monthIndex) => {
      const monthStart = new Date(year, monthIndex, 1);
      const isCurrentMonth =
        year === today.getFullYear() && monthIndex === today.getMonth();
      const monthEnd = isCurrentMonth
        ? endOfLocalDay(today)
        : endOfLocalDay(new Date(year, monthIndex + 1, 0));

      const label = monthStart.toLocaleString(localeTag, { month: "short" });

      const startMs = startOfLocalDay(monthStart).getTime();
      const endMs = monthEnd.getTime();

      return {
        label,
        sales: sumRevenueInRange(sales, startMs, endMs),
        expenses: sumExpensesInRange(expenses, startMs, endMs),
      };
    });
  }, [sales, expenses, dayLabels, period, localeTag]);

  const periodToggleClassName = periodToggleClass;

  return (
    <div className={cn("kpi-card", className)}>
      <div className="flex items-start justify-between gap-3 mb-6">
        <h3 className="section-title text-gray-600">{t("salesTrend")}</h3>
        <ToggleGroup
          type="single"
          value={period}
          onValueChange={(value) => value && setPeriod(value as ChartPeriod)}
          className="shrink-0"
          variant="default"
          size="sm"
        >
          <ToggleGroupItem value="week" className={periodToggleClassName}>
            {t("periodWeek")}
          </ToggleGroupItem>
          <ToggleGroupItem value="month" className={periodToggleClassName}>
            {t("periodMonth")}
          </ToggleGroupItem>
          <ToggleGroupItem value="year" className={periodToggleClassName}>
            {t("periodYear")}
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 4, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" strokeOpacity={0.5} vertical={false} />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#475569", fontSize: 12, fontWeight: 500 }}
              interval={period === "month" ? "preserveStartEnd" : 0}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#475569", fontSize: 12, fontWeight: 500 }}
              tickFormatter={(value) => `rwf ${(value / 1000).toFixed(1)}k`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#ffffff",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
              }}
              labelStyle={{ color: "#475569", fontWeight: 600 }}
              formatter={(value: number, name: string) => {
                const label = name === "sales" ? t("chartSalesLabel") : t("expenses");
                return [`rwf ${value.toLocaleString()}`, label];
              }}
            />
            <Legend
              verticalAlign="bottom"
              height={32}
              iconType="circle"
              iconSize={8}
              formatter={(value) => (
                <span className="text-xs text-gray-600">{value}</span>
              )}
            />
            <Bar
              dataKey="sales"
              name={t("chartSalesLabel")}
              fill={REVENUE_BLUE}
              radius={[6, 6, 0, 0]}
            />
            <Bar
              dataKey="expenses"
              name={t("expenses")}
              fill={EXPENSE_RED}
              radius={[6, 6, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
