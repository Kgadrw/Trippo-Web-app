import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks/useTranslation";
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

export type SalesExpensesPeriodPoint = {
  label: string;
  sales: number;
  expenses: number;
};

type SalesExpensesPeriodChartProps = {
  data: SalesExpensesPeriodPoint[];
  className?: string;
  /** When set, thin out x-axis labels for dense daily data */
  labelInterval?: number | "preserveStartEnd";
};

const REVENUE_BLUE = "#2563eb";
const EXPENSE_RED = "#ef4444";

export function SalesExpensesPeriodChart({
  data,
  className,
  labelInterval = 0,
}: SalesExpensesPeriodChartProps) {
  const { t } = useTranslation();

  const chartData = useMemo(
    () =>
      data.map((row) => ({
        label: row.label,
        sales: Math.max(0, Number(row.sales) || 0),
        expenses: Math.max(0, Number(row.expenses) || 0),
      })),
    [data],
  );

  if (chartData.length === 0) {
    return null;
  }

  return (
    <div className={cn("w-full", className)}>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 4, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" strokeOpacity={0.5} vertical={false} />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#475569", fontSize: 11, fontWeight: 500 }}
              interval={labelInterval}
              angle={chartData.length > 10 ? -35 : 0}
              textAnchor={chartData.length > 10 ? "end" : "middle"}
              height={chartData.length > 10 ? 56 : 30}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#475569", fontSize: 12, fontWeight: 500 }}
              tickFormatter={(value) => `Rwf ${(value / 1000).toFixed(1)}k`}
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
                const label = name === "sales" ? t("revenue") : t("expenses");
                return [`Rwf ${value.toLocaleString()}`, label];
              }}
            />
            <Legend
              verticalAlign="bottom"
              height={32}
              iconType="circle"
              iconSize={8}
              formatter={(value) => <span className="text-xs text-gray-600">{value}</span>}
            />
            <Bar dataKey="sales" name={t("revenue")} fill={REVENUE_BLUE} radius={[6, 6, 0, 0]} />
            <Bar dataKey="expenses" name={t("expenses")} fill={EXPENSE_RED} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
