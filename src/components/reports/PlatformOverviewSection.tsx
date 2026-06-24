import {
  Banknote,
  TrendingUp,
  Wallet,
  Receipt,
  FileText,
  Package,
  AlertTriangle,
  PiggyBank,
} from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import { formatCurrency } from "@/lib/currency";
import { cn } from "@/lib/utils";
import {
  EXPENSE_COLOR,
  INCOME_COLOR,
  REVENUE_COLOR,
  expenseTextClass,
  incomeTextClass,
  netTextClass,
} from "@/lib/reportColors";
import { ReportChartCard } from "@/components/reports/ReportChartCard";
import { ReportEmptyIllustration } from "@/components/reports/ReportEmptyIllustration";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
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

const PIE_COLORS = ["#2563eb", "#22c55e", "#f97316", "#a855f7", "#eab308", "#ef4444"];

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  tone = "default",
}: {
  icon: typeof Banknote;
  label: string;
  value: string;
  sub?: string;
  tone?: "default" | "positive" | "negative" | "warning";
}) {
  const toneClass =
    tone === "positive"
      ? "text-emerald-700"
      : tone === "negative"
        ? "text-red-600"
        : tone === "warning"
          ? "text-amber-600"
          : "text-gray-900";

  return (
    <div className="p-1">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center text-gray-500">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className={`mt-1 text-lg font-semibold tabular-nums ${toneClass}`}>{value}</p>
          {sub ? <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p> : null}
        </div>
      </div>
    </div>
  );
}

export function PlatformOverviewSection({
  stats,
  reportTypeLabel,
  reportPeriodLabel,
}: PlatformOverviewSectionProps) {
  const { t } = useTranslation();

  const inflowOutflow = useMemo(() => {
    const inflows = stats.salesRevenue + stats.income + stats.invoicesPaid + stats.bankDeposits;
    const outflows = stats.expenses + stats.payroll + stats.billsPaid + stats.taxesPaid;
    return { inflows, outflows };
  }, [stats]);

  const flowPieData = useMemo(
    () =>
      [
        { name: t("sales"), value: stats.salesRevenue, fill: "#2563eb" },
        { name: t("income"), value: stats.income, fill: "#22c55e" },
        { name: t("expenses"), value: stats.expenses, fill: "#ef4444" },
        { name: t("payroll"), value: stats.payroll, fill: "#f97316" },
        { name: t("bills"), value: stats.billsPaid, fill: "#a855f7" },
        { name: t("taxes"), value: stats.taxesPaid, fill: "#eab308" },
      ].filter((row) => row.value > 0),
    [stats, t],
  );

  const barChartData = useMemo(
    () =>
      [
        { name: t("sales"), value: stats.salesRevenue },
        { name: t("expenses"), value: stats.expenses },
        { name: t("income"), value: stats.income },
        { name: t("payroll"), value: stats.payroll },
        { name: t("bills"), value: stats.billsPaid },
        { name: t("taxes"), value: stats.taxesPaid },
      ].filter((row) => row.value > 0),
    [stats, t],
  );

  const cashFlowTrend = useMemo(
    () => [
      { label: t("sales"), in: stats.salesRevenue + stats.income, out: 0 },
      { label: t("expenses"), in: 0, out: stats.expenses },
      { label: t("payroll"), in: 0, out: stats.payroll },
      { label: t("bills"), in: 0, out: stats.billsPaid },
      { label: t("taxes"), in: 0, out: stats.taxesPaid },
    ],
    [stats, t],
  );

  const hasData = flowPieData.length > 0;

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
          <p className={cn("mt-1 text-lg font-semibold tabular-nums", netTextClass(inflowOutflow.inflows - inflowOutflow.outflows))}>
            {formatCurrency(inflowOutflow.inflows - inflowOutflow.outflows)}
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={TrendingUp}
          label={t("sales")}
          value={formatCurrency(stats.salesRevenue)}
          sub={`${t("profit")}: ${formatCurrency(stats.salesProfit)}`}
          tone="positive"
        />
        <KpiCard
          icon={Banknote}
          label={t("expenses")}
          value={formatCurrency(stats.expenses)}
          sub={`${t("net")}: ${formatCurrency(stats.netFromSales)}`}
          tone={stats.netFromSales >= 0 ? "positive" : "negative"}
        />
        <KpiCard icon={Wallet} label={t("totalIncome")} value={formatCurrency(stats.income)} tone="positive" />
        <KpiCard icon={Receipt} label={t("payroll")} value={formatCurrency(stats.payroll)} />
        <KpiCard
          icon={FileText}
          label={t("bills")}
          value={formatCurrency(stats.billsPaid)}
          sub={`${t("outstanding")}: ${formatCurrency(stats.billsOutstanding)}`}
        />
        <KpiCard
          icon={FileText}
          label={t("taxes")}
          value={formatCurrency(stats.taxesPaid)}
          sub={`${t("outstandingTaxes")}: ${formatCurrency(stats.taxesOutstanding)}`}
        />
        <KpiCard
          icon={FileText}
          label={t("invoices")}
          value={formatCurrency(stats.invoicesPaid)}
          sub={`${t("accountsReceivable")}: ${formatCurrency(stats.invoicesOutstanding)}`}
        />
        <KpiCard icon={PiggyBank} label={t("bankDeposits")} value={formatCurrency(stats.bankDeposits)} />
        <KpiCard
          icon={Wallet}
          label={t("loans")}
          value={formatCurrency(stats.loanBalance)}
          sub={`${stats.activeLoans} ${t("active")}`}
        />
        <KpiCard
          icon={Package}
          label={t("products")}
          value={String(stats.productCount)}
          sub={`${t("inventoryValue")}: ${formatCurrency(stats.inventoryValue)}`}
        />
        <KpiCard
          icon={AlertTriangle}
          label={t("lowStock")}
          value={String(stats.lowStockCount)}
          tone={stats.lowStockCount > 0 ? "warning" : "default"}
        />
      </div>

      {hasData ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <ReportChartCard title={t("platformSummary")} subtitle={t("revenueMix")}>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={flowPieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={2}
                >
                  {flowPieData.map((entry, index) => (
                    <Cell key={entry.name} fill={entry.fill || PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend verticalAlign="bottom" height={36} iconType="circle" iconSize={8} />
              </PieChart>
            </ResponsiveContainer>
          </ReportChartCard>

          <ReportChartCard title={t("salesTrend")} subtitle={reportPeriodLabel}>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={barChartData} margin={{ top: 8, right: 8, left: 0, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#6b7280" }} angle={-25} textAnchor="end" height={48} />
                <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Bar dataKey="value" fill="#2563eb" radius={[6, 6, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          </ReportChartCard>
        </div>
      ) : (
        <ReportEmptyIllustration title={t("noDataForPeriod")} description={t("platformReportsSubtitle")} variant="finance" />
      )}

      {hasData ? (
        <ReportChartCard title={t("income") + " & " + t("expenses")} subtitle={reportPeriodLabel}>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={cashFlowTrend} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="inflowGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22c55e" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#22c55e" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="outflowGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#6b7280" }} />
              <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))} />
              <Tooltip formatter={(value: number, name: string) => [formatCurrency(value), name === "in" ? t("income") : t("expenses")]} />
              <Legend iconType="circle" iconSize={8} />
              <Area type="monotone" dataKey="in" name={t("income")} stroke="#22c55e" fill="url(#inflowGrad)" strokeWidth={2} />
              <Area type="monotone" dataKey="out" name={t("expenses")} stroke="#ef4444" fill="url(#outflowGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </ReportChartCard>
      ) : null}
    </div>
  );
}
