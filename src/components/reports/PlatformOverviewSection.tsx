import { useMemo } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import { formatCurrency } from "@/lib/currency";
import { cn } from "@/lib/utils";
import {
  expenseTextClass,
  incomeTextClass,
  netTextClass,
} from "@/lib/reportColors";
import { ReportChartCard } from "@/components/reports/ReportChartCard";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type PlatformStats = {
  salesRevenue: number;
  salesProfit: number;
  expenses: number;
  netFromSales: number;
  income: number;
  payroll: number;
  billsPaid: number;
  billsOutstanding: number;
  taxesPaid: number;
  taxesOutstanding: number;
  invoicesPaid: number;
  invoicesOutstanding: number;
  bankDeposits: number;
  loanBalance: number;
  activeLoans: number;
  productCount: number;
  lowStockCount: number;
  inventoryValue: number;
};

type PlatformOverviewSectionProps = {
  stats: PlatformStats;
  reportTypeLabel: string;
  reportPeriodLabel: string;
};

type OverviewBar = {
  key: string;
  name: string;
  value: number;
  detail?: string;
  fill: string;
};

const BAR_COLORS = [
  "#2563eb",
  "#ef4444",
  "#22c55e",
  "#f97316",
  "#a855f7",
  "#eab308",
  "#0ea5e9",
  "#14b8a6",
  "#64748b",
  "#8b5cf6",
  "#f59e0b",
  "#dc2626",
];

function formatAxis(value: number) {
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(0)}k`;
  return String(Math.round(value));
}

export function PlatformOverviewSection({
  stats,
  reportTypeLabel: _reportTypeLabel,
  reportPeriodLabel,
}: PlatformOverviewSectionProps) {
  const { t } = useTranslation();

  const inflowOutflow = useMemo(() => {
    const inflows = stats.salesRevenue + stats.income + stats.invoicesPaid + stats.bankDeposits;
    const outflows = stats.expenses + stats.payroll + stats.billsPaid + stats.taxesPaid;
    return { inflows, outflows, net: inflows - outflows };
  }, [stats]);

  const chartData = useMemo<OverviewBar[]>(
    () => [
      {
        key: "sales",
        name: t("sales"),
        value: stats.salesRevenue,
        detail: `${t("profit")}: ${formatCurrency(stats.salesProfit)}`,
        fill: BAR_COLORS[0],
      },
      {
        key: "expenses",
        name: t("expenses"),
        value: stats.expenses,
        detail: `${t("net")}: ${formatCurrency(stats.netFromSales)}`,
        fill: BAR_COLORS[1],
      },
      {
        key: "income",
        name: t("totalIncome"),
        value: stats.income,
        fill: BAR_COLORS[2],
      },
      {
        key: "payroll",
        name: t("payroll"),
        value: stats.payroll,
        fill: BAR_COLORS[3],
      },
      {
        key: "bills",
        name: t("bills"),
        value: stats.billsPaid,
        detail: `${t("outstanding")}: ${formatCurrency(stats.billsOutstanding)}`,
        fill: BAR_COLORS[4],
      },
      {
        key: "taxes",
        name: t("taxes"),
        value: stats.taxesPaid,
        detail: `${t("outstandingTaxes")}: ${formatCurrency(stats.taxesOutstanding)}`,
        fill: BAR_COLORS[5],
      },
      {
        key: "invoices",
        name: t("invoices"),
        value: stats.invoicesPaid,
        detail: `${t("accountsReceivable")}: ${formatCurrency(stats.invoicesOutstanding)}`,
        fill: BAR_COLORS[6],
      },
      {
        key: "deposits",
        name: t("bankDeposits"),
        value: stats.bankDeposits,
        fill: BAR_COLORS[7],
      },
      {
        key: "loans",
        name: t("loans"),
        value: stats.loanBalance,
        detail: `${stats.activeLoans} ${t("active")}`,
        fill: BAR_COLORS[8],
      },
      {
        key: "inventory",
        name: t("products"),
        value: stats.inventoryValue,
        detail: `${stats.productCount} · ${t("inventoryValue")} · ${t("lowStock")}: ${stats.lowStockCount}`,
        fill: BAR_COLORS[9],
      },
    ],
    [stats, t],
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <p className="text-xs text-muted-foreground">{t("revenue")}</p>
          <p className={cn("mt-1 text-lg font-semibold tabular-nums", incomeTextClass)}>
            {formatCurrency(inflowOutflow.inflows)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{t("expenses")}</p>
          <p className={cn("mt-1 text-lg font-semibold tabular-nums", expenseTextClass)}>
            {formatCurrency(inflowOutflow.outflows)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{t("net")}</p>
          <p className={cn("mt-1 text-lg font-semibold tabular-nums", netTextClass(inflowOutflow.net))}>
            {formatCurrency(inflowOutflow.net)}
          </p>
        </div>
      </div>

      <ReportChartCard title={t("platformSummary")} subtitle={reportPeriodLabel}>
        <ResponsiveContainer width="100%" height={360}>
          <BarChart
            data={chartData}
            margin={{ top: 12, right: 12, left: 4, bottom: 56 }}
            barCategoryGap="18%"
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
            <XAxis
              dataKey="name"
              interval={0}
              angle={-35}
              textAnchor="end"
              height={64}
              tick={{ fontSize: 10, fill: "#6b7280" }}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#6b7280" }}
              tickFormatter={formatAxis}
            />
            <Tooltip
              formatter={(value: number, _name: string, item) => {
                const detail = (item?.payload as OverviewBar | undefined)?.detail;
                return [
                  detail ? `${formatCurrency(value)} · ${detail}` : formatCurrency(value),
                  t("amount"),
                ];
              }}
              contentStyle={{
                borderRadius: 0,
                border: "1px solid #e5e7eb",
                fontSize: 12,
              }}
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={48}>
              {chartData.map((row) => (
                <Cell key={row.key} fill={row.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ReportChartCard>
    </div>
  );
}
