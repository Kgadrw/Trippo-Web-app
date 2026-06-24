import { useMemo } from "react";
import {
  TrendingUp,
  Banknote,
  Receipt,
  Trophy,
  ShoppingBag,
  Users,
  ArrowUpRight,
  ArrowDownLeft,
} from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { formatCurrency, CurrencyAmount } from "@/lib/currency";
import {
  EXPENSE_COLOR,
  INCOME_COLOR,
  expenseTextClass,
  incomeTextClass,
  netTextClass,
} from "@/lib/reportColors";
import { periodToggleClass } from "@/lib/fieldStyles";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { SalesExpensesPeriodChart } from "@/components/dashboard/SalesExpensesPeriodChart";
import { SalesExpenseGauge } from "@/components/dashboard/SalesExpenseGauge";
import { DesktopDataTable, MobileDataList, MobileListCard } from "@/components/ui/mobile-list-card";
import { ReportChartCard } from "@/components/reports/ReportChartCard";
import { ReportEmptyIllustration } from "@/components/reports/ReportEmptyIllustration";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const PIE_COLORS = ["#2563eb", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#06b6d4"];

type SalesExpensesPeriodRow = {
  key: string;
  label: string;
  salesRevenue: number;
  salesProfit: number;
  expenses: number;
};

type SalesByProductRow = {
  product: string;
  quantity: number;
  revenue: number;
  profit: number;
};

type WorkerRow = {
  barber: string;
  services: number;
  revenue: number;
  topServices: string[];
};

type ProfitExpensesRow = {
  period: string;
  profit: number;
  expenses: number;
};

type RevenueMix = {
  products: number;
  services: number;
};

export type SalesRevenueReportsSectionProps = {
  reportType: string;
  reportTypeLabel: string;
  reportPeriodLabel: string;
  barberPeriod: "today" | "week" | "month" | "year";
  onBarberPeriodChange: (v: "today" | "week" | "month" | "year") => void;
  totalRevenue: number;
  totalProfit: number;
  totalExpenses: number;
  netProfit: number;
  totalQuantity: number;
  transactionCount: number;
  bestSelling: { product: string; quantity: number };
  revenueMix: RevenueMix;
  gaugeStats: { salesCount: number; salesTotal: number; expensesTotal: number };
  salesExpensesChartData: { label: string; sales: number; expenses: number }[];
  salesExpensesByPeriod: SalesExpensesPeriodRow[];
  salesExpensesPeriodTotals: { revenue: number; expenses: number; net: number };
  profitExpensesChartData: ProfitExpensesRow[];
  salesByProduct: SalesByProductRow[];
  workerBreakdown: WorkerRow[];
  revenueTrendData: { label: string; revenue: number; profit: number }[];
};

function StatTile({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: typeof TrendingUp;
  label: string;
  value: string;
  sub?: string;
  accent: "blue" | "green" | "red" | "violet" | "amber";
}) {
  const accentMap = {
    blue: incomeTextClass,
    green: incomeTextClass,
    red: expenseTextClass,
    violet: "text-violet-700 font-semibold tabular-nums",
    amber: "text-amber-700 font-semibold tabular-nums",
  };

  return (
    <div className="p-1">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className={cn("mt-1 text-xl font-bold tabular-nums sm:text-2xl", accentMap[accent])}>{value}</p>
          {sub ? <p className="mt-1 text-[11px] text-muted-foreground">{sub}</p> : null}
        </div>
        <Icon className="h-4 w-4 shrink-0 text-gray-400" />
      </div>
    </div>
  );
}

export function SalesRevenueReportsSection({
  reportType,
  reportTypeLabel,
  reportPeriodLabel,
  barberPeriod,
  onBarberPeriodChange,
  totalRevenue,
  totalProfit,
  totalExpenses,
  netProfit,
  totalQuantity,
  transactionCount,
  bestSelling,
  revenueMix,
  gaugeStats,
  salesExpensesChartData,
  salesExpensesByPeriod,
  salesExpensesPeriodTotals,
  profitExpensesChartData,
  salesByProduct,
  workerBreakdown,
  revenueTrendData,
}: SalesRevenueReportsSectionProps) {
  const { t } = useTranslation();

  const mixChartData = useMemo(() => {
    const rows = [
      { name: t("products"), value: revenueMix.products, fill: "#2563eb" },
      { name: t("services"), value: revenueMix.services, fill: "#8b5cf6" },
    ].filter((r) => r.value > 0);
    return rows;
  }, [revenueMix, t]);

  const topProductsChart = useMemo(
    () =>
      salesByProduct.slice(0, 6).map((row) => ({
        name: row.product.length > 18 ? `${row.product.slice(0, 18)}…` : row.product,
        revenue: row.revenue,
        quantity: row.quantity,
      })),
    [salesByProduct],
  );

  const workerChartData = useMemo(
    () =>
      workerBreakdown.slice(0, 6).map((row) => ({
        name: row.barber.length > 14 ? `${row.barber.slice(0, 14)}…` : row.barber,
        revenue: row.revenue,
        services: row.services,
      })),
    [workerBreakdown],
  );

  const hasSalesData = totalRevenue > 0 || transactionCount > 0;

  return (
    <div className="space-y-6">
      {/* KPI tiles */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <StatTile
          icon={TrendingUp}
          label={t("revenue")}
          value={formatCurrency(totalRevenue)}
          sub={`${transactionCount} ${t("transactions")}`}
          accent="green"
        />
        <StatTile
          icon={Banknote}
          label={t("profit")}
          value={formatCurrency(totalProfit)}
          accent="green"
        />
        <StatTile
          icon={Receipt}
          label={t("expenses")}
          value={formatCurrency(totalExpenses)}
          accent="red"
        />
        <StatTile
          icon={TrendingUp}
          label={t("net")}
          value={formatCurrency(netProfit)}
          sub={netProfit >= 0 ? t("positiveBalance") : t("negativeBalance")}
          accent={netProfit >= 0 ? "green" : "red"}
        />
        <StatTile
          icon={ShoppingBag}
          label={t("quantity")}
          value={totalQuantity.toLocaleString()}
          accent="violet"
        />
        <StatTile
          icon={Trophy}
          label={t("topProducts")}
          value={bestSelling.product.length > 16 ? `${bestSelling.product.slice(0, 16)}…` : bestSelling.product}
          sub={`${bestSelling.quantity} ${t("sold")}`}
          accent="amber"
        />
      </div>

      {!hasSalesData ? (
        <ReportEmptyIllustration title={t("noSalesData")} description={t("salesPerformanceEmptyHint")} />
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <ReportChartCard title={t("salesExpenseBalance")} subtitle={t("salesAndExpenses")}>
              <SalesExpenseGauge
                salesCount={gaugeStats.salesCount}
                salesTotal={gaugeStats.salesTotal}
                expensesTotal={gaugeStats.expensesTotal}
                className="min-h-[280px]"
              />
            </ReportChartCard>

            <ReportChartCard title={t("revenueMix")} subtitle={t("products") + " vs " + t("services")}>
              {mixChartData.length > 0 ? (
                <div className="flex flex-col items-center gap-4 sm:flex-row">
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={mixChartData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={52}
                        outerRadius={82}
                        paddingAngle={3}
                      >
                        {mixChartData.map((entry, index) => (
                          <Cell key={entry.name} fill={entry.fill || PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" iconSize={8} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="grid w-full gap-2 sm:max-w-[160px]">
                    {mixChartData.map((row) => (
                      <div key={row.name} className="px-1 py-1">
                        <p className="text-[11px] text-muted-foreground">{row.name}</p>
                        <p className="text-sm font-semibold tabular-nums"><CurrencyAmount amount={row.value} codeFirst /></p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <ReportEmptyIllustration title={t("noSalesData")} className="py-8" />
              )}
            </ReportChartCard>
          </div>

          <ReportChartCard
            title={t("revenueTrend")}
            subtitle={`${reportTypeLabel} · ${reportPeriodLabel}`}
          >
            {revenueTrendData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={revenueTrendData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2563eb" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#2563eb" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: "#6b7280" }}
                    interval={revenueTrendData.length > 12 ? Math.floor(revenueTrendData.length / 8) : 0}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#6b7280" }}
                    tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))}
                  />
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      formatCurrency(value),
                      name === "revenue" ? t("revenue") : t("profit"),
                    ]}
                  />
                  <Legend iconType="circle" iconSize={8} />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    name={t("revenue")}
                    stroke={INCOME_COLOR}
                    fill="url(#revenueGradient)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="profit"
                    name={t("profit")}
                    stroke={INCOME_COLOR}
                    fill="url(#profitGradient)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <ReportEmptyIllustration title={t("noSalesData")} className="py-8" />
            )}
          </ReportChartCard>

          {salesExpensesChartData.length > 0 ? (
            <ReportChartCard title={t("salesExpensesSummary")} subtitle={`${t("revenue")} vs ${t("expenses")}`}>
              <SalesExpensesPeriodChart
                data={salesExpensesChartData}
                labelInterval={
                  reportType === "daily"
                    ? Math.max(0, Math.floor(salesExpensesChartData.length / 12) - 1)
                    : 0
                }
              />
            </ReportChartCard>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-2">
            <ReportChartCard title={t("topProducts")} subtitle={t("revenue")}>
              {topProductsChart.length > 0 ? (
                <ResponsiveContainer width="100%" height={Math.max(220, topProductsChart.length * 42)}>
                  <BarChart data={topProductsChart} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                    <XAxis type="number" tick={{ fontSize: 10, fill: "#6b7280" }} />
                    <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 10, fill: "#374151" }} />
                    <Tooltip formatter={(value: number) => [formatCurrency(value), t("revenue")]} />
                    <Bar dataKey="revenue" fill="#2563eb" radius={[0, 6, 6, 0]} maxBarSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <ReportEmptyIllustration title={t("noServicesFound")} className="py-6" />
              )}
            </ReportChartCard>

            <ReportChartCard
              title={t("workers")}
              subtitle={t("servicePerformance")}
              action={
                <ToggleGroup
                  type="single"
                  value={barberPeriod}
                  onValueChange={(v) => v && onBarberPeriodChange(v as typeof barberPeriod)}
                  className="flex flex-wrap gap-1"
                  variant="default"
                  size="sm"
                >
                  <ToggleGroupItem value="today" className={periodToggleClass}>
                    {t("periodToday")}
                  </ToggleGroupItem>
                  <ToggleGroupItem value="week" className={periodToggleClass}>
                    {t("periodWeek")}
                  </ToggleGroupItem>
                  <ToggleGroupItem value="month" className={periodToggleClass}>
                    {t("periodMonth")}
                  </ToggleGroupItem>
                  <ToggleGroupItem value="year" className={periodToggleClass}>
                    {t("periodYear")}
                  </ToggleGroupItem>
                </ToggleGroup>
              }
            >
              {workerChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={Math.max(220, workerChartData.length * 42)}>
                  <BarChart data={workerChartData} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                    <XAxis type="number" tick={{ fontSize: 10, fill: "#6b7280" }} />
                    <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 10, fill: "#374151" }} />
                    <Tooltip formatter={(value: number) => [formatCurrency(value), t("revenue")]} />
                    <Bar dataKey="revenue" fill="#8b5cf6" radius={[0, 6, 6, 0]} maxBarSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <ReportEmptyIllustration title={t("noWorkersFound")} className="py-6" />
              )}
            </ReportChartCard>
          </div>

          {profitExpensesChartData.length > 0 ? (
            <ReportChartCard title={t("profitExpensesChart")} subtitle={`${t("profit")} · ${t("expenses")}`}>
              <ResponsiveContainer width="100%" height={320}>
                <ComposedChart data={profitExpensesChartData} margin={{ top: 8, right: 12, left: 4, bottom: 48 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="period"
                    tick={{ fontSize: 10, fill: "#6b7280" }}
                    angle={-35}
                    textAnchor="end"
                    height={56}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#6b7280" }}
                    tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))}
                  />
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      formatCurrency(value),
                      name === "profit" ? t("profit") : t("expenses"),
                    ]}
                  />
                  <Legend iconType="circle" iconSize={8} />
                  <Bar dataKey="profit" name={t("profit")} fill={INCOME_COLOR} radius={[4, 4, 0, 0]} maxBarSize={40} />
                  <Bar dataKey="expenses" name={t("expenses")} fill={EXPENSE_COLOR} radius={[4, 4, 0, 0]} maxBarSize={40} />
                </ComposedChart>
              </ResponsiveContainer>
            </ReportChartCard>
          ) : null}

          {/* Detail tables */}
          {salesExpensesByPeriod.length > 0 ? (
            <ReportChartCard title={t("salesExpensesSummary")} subtitle={t("period") + " " + t("details")}>
              <DesktopDataTable>
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">{t("period")}</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">{t("revenue")}</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">{t("expenses")}</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">{t("net")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salesExpensesByPeriod.map((row) => {
                      const net = (row.salesProfit || 0) - (row.expenses || 0);
                      return (
                        <tr key={row.key}>
                          <td className="px-6 py-3 text-sm text-gray-900">{row.label}</td>
                      <td className={cn("px-6 py-3 text-sm tabular-nums", incomeTextClass)}>
                        {row.salesRevenue.toLocaleString()} Rwf
                      </td>
                      <td className={cn("px-6 py-3 text-sm tabular-nums", expenseTextClass)}>
                        {row.expenses.toLocaleString()} Rwf
                      </td>
                      <td className={cn("px-6 py-3 text-sm tabular-nums", netTextClass(net))}>
                            {net >= 0 ? "+" : ""}
                            {net.toLocaleString()} Rwf
                          </td>
                        </tr>
                      );
                    })}
                    <tr>
                      <td className="px-6 py-3 text-sm font-semibold">{t("total")}</td>
                      <td className="px-6 py-3 text-sm font-semibold tabular-nums">
                        {salesExpensesPeriodTotals.revenue.toLocaleString()} Rwf
                      </td>
                      <td className="px-6 py-3 text-sm font-semibold tabular-nums text-red-600">
                        {salesExpensesPeriodTotals.expenses.toLocaleString()} Rwf
                      </td>
                      <td
                        className={cn(
                          "px-6 py-3 text-sm font-semibold tabular-nums",
                          salesExpensesPeriodTotals.net >= 0 ? "text-emerald-700" : "text-red-700",
                        )}
                      >
                        {salesExpensesPeriodTotals.net >= 0 ? "+" : ""}
                        {salesExpensesPeriodTotals.net.toLocaleString()} Rwf
                      </td>
                    </tr>
                  </tbody>
                </table>
              </DesktopDataTable>
              <MobileDataList className="mt-4 lg:hidden">
                {salesExpensesByPeriod.map((row, index) => {
                  const net = (row.salesProfit || 0) - (row.expenses || 0);
                  return (
                    <MobileListCard key={row.key} index={index}>
                      <p className="text-sm font-semibold text-gray-900">{row.label}</p>
                      <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <span className="block text-gray-500">{t("revenue")}</span>
                          <span className="font-medium tabular-nums">{row.salesRevenue.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="block text-gray-500">{t("expenses")}</span>
                          <span className="font-medium tabular-nums text-red-600">{row.expenses.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="block text-gray-500">{t("net")}</span>
                          <span className={cn("font-semibold tabular-nums", net >= 0 ? "text-emerald-700" : "text-red-700")}>
                            {net >= 0 ? "+" : ""}
                            {net.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </MobileListCard>
                  );
                })}
              </MobileDataList>
            </ReportChartCard>
          ) : null}

          {workerBreakdown.length > 0 ? (
            <ReportChartCard title={t("workers")} subtitle={t("topServices")}>
              <DesktopDataTable>
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                        <span className="inline-flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" />
                          {t("worker")}
                        </span>
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">{t("services")}</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">{t("topServices")}</th>
                      <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">{t("revenue")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workerBreakdown.map((row) => (
                      <tr key={row.barber}>
                        <td className="px-6 py-3 text-sm text-gray-900">{row.barber}</td>
                        <td className="px-6 py-3 text-sm tabular-nums text-gray-700">
                          <span className="inline-flex items-center gap-1">
                            {row.services > 0 ? (
                              <ArrowUpRight size={14} className="text-emerald-600" />
                            ) : (
                              <ArrowDownLeft size={14} className="text-red-600" />
                            )}
                            {row.services}
                          </span>
                        </td>
                        <td className="max-w-xs px-6 py-3 text-sm text-gray-700">
                          {row.topServices.length > 0 ? row.topServices.join(", ") : "—"}
                        </td>
                        <td className="px-6 py-3 text-right text-sm font-semibold tabular-nums text-gray-800">
                          {row.revenue.toLocaleString()} Rwf
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </DesktopDataTable>
            </ReportChartCard>
          ) : null}
        </>
      )}
    </div>
  );
}
