import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, Plus, ArrowUp, ArrowDown, AlertTriangle } from "lucide-react";
import { financeApi } from "@/lib/api";
import { CurrencyAmount } from "@/lib/currency";
import { DashboardHelpTip } from "@/components/dashboard/DashboardHelpTip";
import { useTranslation } from "@/hooks/useTranslation";
import { Button } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";
import {
  buildMoneyOutBreakdown,
  buildPayablesSummary,
  buildReceivablesSummary,
  buildPeriodCashFlowChart,
  buildPeriodIncomeExpense,
  getDashboardPeriodRange,
  sumMoneyIn,
  sumMoneyOut,
  type CashFlowBreakdownLine,
  type CashFlowInputs,
  type DashboardPeriod,
} from "@/lib/dashboardCashFlow";

type IncomeRow = { date: string; amount: number; title?: string };
type ExpenseRow = { date: string; amount: number; category?: string };
type BillRow = {
  dueDate: string;
  amount: number;
  status?: string;
  category?: string;
  title?: string;
  paidAt?: string;
};
type PayrollRow = { paymentDate: string; amount: number; status?: string };
type TaxRow = { dueDate: string; amount: number; status?: string; title?: string; paidAt?: string };
type InvoiceRow = {
  dueDate: string;
  amount: number;
  status?: string;
  title?: string;
  paidAt?: string;
};
type SaleRow = { date: string; timestamp?: string; revenue: number };
type BankDepositRow = { depositDate: string; amount: number };
type LoanRow = {
  principalAmount: number;
  startDate: string;
  remainingBalance?: number;
  status?: string;
  nextDueDate?: string;
  payments?: Array<{ paymentDate: string; amount: number }>;
};

type TransactionRow = {
  id: string;
  type: "income" | "expense" | "payroll" | "deposit";
  title: string;
  amount: number;
  date: string;
};

type DashboardOverviewProps = {
  incomes?: IncomeRow[];
  expenses?: ExpenseRow[];
  bills?: BillRow[];
  payrolls?: PayrollRow[];
  taxes?: TaxRow[];
  invoices?: InvoiceRow[];
  bankDeposits?: BankDepositRow[];
  loans?: LoanRow[];
  sales?: SaleRow[];
  loading?: boolean;
};

function parseMs(dateStr: string): number | null {
  if (!dateStr) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const t = new Date(`${dateStr}T12:00:00`).getTime();
    return Number.isNaN(t) ? null : t;
  }
  const t = new Date(dateStr).getTime();
  return Number.isNaN(t) ? null : t;
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function formatRwf(amount: number) {
  return `Rwf ${Math.round(amount).toLocaleString()}`;
}

function formatRwfCompact(amount: number) {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}K`;
  return String(Math.round(amount));
}

const PIE_COLORS = ["#22c55e", "#f97316", "#3b82f6", "#eab308", "#a855f7", "#38bdf8", "#94a3b8"];

function inPeriod(dateStr: string, startMs: number, endMs: number) {
  const t = parseMs(dateStr);
  return t !== null && t >= startMs && t <= endMs;
}

function formatTableDate(dateStr: string) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function PeriodFilter({
  value,
  onChange,
  labels,
}: {
  value: DashboardPeriod;
  onChange: (v: DashboardPeriod) => void;
  labels: { day: string; month: string; year: string };
}) {
  return (
    <div className="inline-flex border border-gray-200">
      {(["day", "month", "year"] as const).map((option, index) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={cn(
            "px-3 py-1.5 text-xs font-medium",
            index > 0 && "border-l border-gray-200",
            value === option
              ? "bg-gray-100 text-gray-900"
              : "bg-white text-gray-500 hover:text-gray-700",
          )}
        >
          {labels[option]}
        </button>
      ))}
    </div>
  );
}

function SummaryCard({
  title,
  totalLabel,
  total,
  current,
  overdue,
  onNew,
  helpText,
  currentLabel = "Current",
  overdueLabel = "Overdue",
  breakdown = [],
}: {
  title: string;
  totalLabel: string;
  total: number;
  current: number;
  overdue: number;
  onNew: () => void;
  helpText: string;
  currentLabel?: string;
  overdueLabel?: string;
  breakdown?: CashFlowBreakdownLine[];
}) {
  const totalSafe = Math.max(total, 0);
  const currentPct = totalSafe > 0 ? (current / totalSafe) * 100 : 0;
  const overduePct = totalSafe > 0 ? (overdue / totalSafe) * 100 : 0;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
          <DashboardHelpTip text={helpText} />
        </div>
        <Button
          size="sm"
          className="h-8 gap-1 rounded-none bg-primary px-3 text-xs text-white hover:bg-sky-500"
          onClick={onNew}
        >
          <Plus size={14} />
          New
        </Button>
      </div>

      <p className="text-sm text-gray-600">
        {totalLabel}{" "}
        <span className="font-semibold text-gray-900">
          <CurrencyAmount amount={total} codeFirst />
        </span>
      </p>

      {breakdown.length > 0 ? (
        <ul className="mt-3 space-y-1.5 border-b border-gray-100 pb-3">
          {breakdown.map((line) => (
            <li key={line.key} className="flex items-center justify-between gap-2 text-xs text-gray-600">
              <span>{line.label}</span>
              <span className="shrink-0 font-medium tabular-nums text-gray-900">
                <CurrencyAmount amount={line.amount} codeFirst />
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-3 flex h-2 w-full overflow-hidden rounded-full bg-gray-100">
        {currentPct > 0 ? (
          <div className="h-full bg-sky-400" style={{ width: `${currentPct}%` }} />
        ) : null}
        {overduePct > 0 ? (
          <div className="h-full bg-amber-500" style={{ width: `${overduePct}%` }} />
        ) : null}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 border-t border-gray-100 pt-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-sky-500">{currentLabel}</p>
          <p className="mt-1 text-sm font-semibold text-gray-900">
            <CurrencyAmount amount={current} codeFirst />
          </p>
        </div>
        <div>
          <div className="flex items-center gap-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-500">{overdueLabel}</p>
            <ChevronDown size={12} className="text-amber-500" />
          </div>
          <p className="mt-1 text-sm font-semibold text-gray-900">
            <CurrencyAmount amount={overdue} codeFirst />
          </p>
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  sublabel,
  valueClassName,
  onClick,
}: {
  label: string;
  value: number;
  sublabel?: string;
  valueClassName?: string;
  onClick?: () => void;
}) {
  const inner = (
    <>
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className={cn("text-xl font-bold tabular-nums mt-1", valueClassName || "text-gray-900")}>
        <CurrencyAmount amount={value} codeFirst />
      </p>
      {sublabel ? <p className="text-xs text-gray-500 mt-0.5">{sublabel}</p> : null}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="border border-gray-200 bg-white px-4 py-3 text-left hover:bg-gray-50/80 transition-colors"
      >
        {inner}
      </button>
    );
  }

  return <div className="border border-gray-200 bg-white px-4 py-3">{inner}</div>;
}

function breakdownLabel(
  key: string,
  fallback: string,
  t: (key: string) => string,
  basis: "cash" | "accrual",
) {
  const labels: Record<string, string> = {
    income: t("income"),
    sales: t("sales"),
    invoices: basis === "cash" ? "Invoices paid" : "Invoices",
    deposits: t("bankDeposits"),
    loans: t("loans"),
    expenditure: t("expenditure"),
    payroll: t("payroll"),
    bills: basis === "cash" ? "Bills paid" : "Bills due",
    taxes: basis === "cash" ? "Taxes paid" : "Taxes due",
    loanRepayments: "Loan repayments",
  };
  return labels[key] || fallback;
}

export function DashboardOverview({
  incomes = [],
  expenses = [],
  bills = [],
  payrolls = [],
  taxes = [],
  invoices = [],
  bankDeposits = [],
  loans = [],
  sales = [],
  loading = false,
}: DashboardOverviewProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [period, setPeriod] = useState<DashboardPeriod>("month");
  const [basis, setBasis] = useState<"cash" | "accrual">("cash");
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(true);

  const loadTransactions = useCallback(async () => {
    try {
      const res = await financeApi.getTransactions({ limit: 8 });
      if (Array.isArray(res.data)) {
        setTransactions(res.data as TransactionRow[]);
      }
    } catch {
      // keep last known
    } finally {
      setTransactionsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTransactions();
  }, [loadTransactions]);

  useEffect(() => {
    const onRefresh = () => void loadTransactions();
    window.addEventListener("finance-should-refresh", onRefresh);
    window.addEventListener("incomes-should-refresh", onRefresh);
    window.addEventListener("expenses-should-refresh", onRefresh);
    window.addEventListener("payrolls-should-refresh", onRefresh);
    window.addEventListener("bank-deposits-should-refresh", onRefresh);
    return () => {
      window.removeEventListener("finance-should-refresh", onRefresh);
      window.removeEventListener("incomes-should-refresh", onRefresh);
      window.removeEventListener("expenses-should-refresh", onRefresh);
      window.removeEventListener("payrolls-should-refresh", onRefresh);
      window.removeEventListener("bank-deposits-should-refresh", onRefresh);
    };
  }, [loadTransactions]);

  const cashFlowInputs = useMemo<CashFlowInputs>(
    () => ({
      incomes,
      expenses,
      payrolls,
      bills,
      taxes,
      invoices,
      bankDeposits,
      loans,
      sales,
    }),
    [incomes, expenses, payrolls, bills, taxes, invoices, bankDeposits, loans, sales],
  );

  const periodRange = useMemo(() => getDashboardPeriodRange(period), [period]);

  const periodMetrics = useMemo(() => {
    const { startMs, endMs } = periodRange;
    const revenue = sumMoneyIn(cashFlowInputs, startMs, endMs);
    const expensesOut = sumMoneyOut(cashFlowInputs, startMs, endMs, "cash");
    return { revenue, expensesOut, profit: revenue - expensesOut };
  }, [cashFlowInputs, periodRange]);

  const kpiLabels = useMemo(() => {
    if (period === "day") {
      return {
        revenue: "Revenue Today",
        expenses: "Expenses Today",
        profit: "Profit Today",
      };
    }
    if (period === "year") {
      return {
        revenue: "Revenue This Year",
        expenses: "Expenses This Year",
        profit: "Profit This Year",
      };
    }
    return {
      revenue: "Revenue This Month",
      expenses: "Expenses This Month",
      profit: "Profit This Month",
    };
  }, [period]);

  const taxDue = useMemo(() => {
    const today = startOfDay(new Date()).getTime();
    const pending = taxes.filter((tx) => (tx.status || "pending") === "pending");
    const outstanding = pending.reduce((s, tx) => s + (Number(tx.amount) || 0), 0);
    const overdue = pending.filter((tx) => {
      const due = parseMs(tx.dueDate);
      return due !== null && due < today;
    });
    const overdueAmount = overdue.reduce((s, tx) => s + (Number(tx.amount) || 0), 0);
    const dueSoon = pending.filter((tx) => {
      const due = parseMs(tx.dueDate);
      if (due === null || due < today) return false;
      const limit = new Date();
      limit.setDate(limit.getDate() + 30);
      return due <= limit.getTime();
    });
    return {
      outstanding,
      overdueAmount,
      overdueCount: overdue.length,
      dueSoonCount: dueSoon.length,
    };
  }, [taxes]);

  const upcomingBills = useMemo(() => {
    const today = startOfDay(new Date()).getTime();
    const limit = new Date();
    limit.setDate(limit.getDate() + 30);
    const limitMs = limit.getTime();

    return bills
      .filter((b) => (b.status || "pending") === "pending")
      .filter((b) => {
        const due = parseMs(b.dueDate);
        return due !== null && due >= today && due <= limitMs;
      })
      .sort((a, b) => (parseMs(a.dueDate) || 0) - (parseMs(b.dueDate) || 0))
      .slice(0, 6);
  }, [bills]);

  const balanceInputs = useMemo(
    () => ({ invoices, bills, payrolls, taxes, loans }),
    [invoices, bills, payrolls, taxes, loans],
  );

  const receivables = useMemo(
    () => buildReceivablesSummary(balanceInputs),
    [balanceInputs],
  );

  const payables = useMemo(
    () => buildPayablesSummary(balanceInputs),
    [balanceInputs],
  );

  const cashFlow = useMemo(() => {
    return buildPeriodCashFlowChart(cashFlowInputs, period);
  }, [cashFlowInputs, period]);

  const incomeExpense = useMemo(() => {
    return buildPeriodIncomeExpense(cashFlowInputs, period, basis);
  }, [cashFlowInputs, period, basis]);

  const topExpenses = useMemo(() => {
    const { startMs, endMs } = periodRange;
    const totals = new Map<string, number>();

    const add = (category: string, amount: number) => {
      if (amount <= 0) return;
      totals.set(category, (totals.get(category) || 0) + amount);
    };

    for (const row of expenses) {
      if (!inPeriod(row.date, startMs, endMs)) continue;
      const key = (row.category || "general").trim() || "general";
      const label = key.charAt(0).toUpperCase() + key.slice(1);
      add(label, Number(row.amount) || 0);
    }

    for (const line of buildMoneyOutBreakdown(cashFlowInputs, startMs, endMs, "cash")) {
      if (line.key === "expenditure") continue;
      add(line.label, line.amount);
    }

    const grandTotal = [...totals.values()].reduce((s, v) => s + v, 0);
    if (grandTotal === 0) return { slices: [], grandTotal: 0 };

    const sorted = [...totals.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const top = sorted.slice(0, 5);
    const others = sorted.slice(5).reduce((s, r) => s + r.value, 0);
    const slices = others > 0 ? [...top, { name: "Others", value: others }] : top;

    return {
      grandTotal,
      slices: slices.map((row, index) => ({
        ...row,
        color: PIE_COLORS[index % PIE_COLORS.length],
        percent: grandTotal > 0 ? (row.value / grandTotal) * 100 : 0,
      })),
    };
  }, [expenses, cashFlowInputs, periodRange]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 animate-pulse bg-gray-100" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="h-44 animate-pulse rounded-lg bg-gray-100" />
          <div className="h-44 animate-pulse rounded-lg bg-gray-100" />
        </div>
        <div className="h-80 animate-pulse rounded-lg bg-gray-100" />
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="h-96 animate-pulse rounded-lg bg-gray-100" />
          <div className="h-96 animate-pulse rounded-lg bg-gray-100" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <p className="text-xs font-medium text-gray-500">{periodRange.periodLabel}</p>
            <DashboardHelpTip text={t("dashHelpMonthlyKpis")} />
          </div>
          <PeriodFilter
            value={period}
            onChange={setPeriod}
            labels={{
              day: t("periodToday"),
              month: t("periodMonth"),
              year: t("periodYear"),
            }}
          />
        </div>
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label={kpiLabels.revenue}
            value={periodMetrics.revenue}
            sublabel="All money in"
            valueClassName="text-emerald-700"
            onClick={() => navigate("/finance/transactions")}
          />
          <KpiCard
            label={kpiLabels.expenses}
            value={periodMetrics.expensesOut}
            sublabel="All money out"
            valueClassName="text-rose-600"
            onClick={() => navigate("/finance/transactions")}
          />
          <KpiCard
            label={kpiLabels.profit}
            value={periodMetrics.profit}
            sublabel="Revenue minus expenses"
            valueClassName={periodMetrics.profit >= 0 ? "text-sky-700" : "text-red-600"}
          />
          <KpiCard
            label="Tax Due"
            value={taxDue.outstanding}
            sublabel={
              taxDue.overdueCount > 0
                ? `${taxDue.overdueCount} overdue · ${taxDue.dueSoonCount} due soon`
                : `${taxDue.dueSoonCount} due within 30 days`
            }
            valueClassName={taxDue.overdueCount > 0 ? "text-red-600" : "text-amber-700"}
            onClick={() => navigate("/finance/taxes")}
          />
        </div>
      </div>

      {taxDue.overdueCount > 0 ? (
        <div className="flex items-start gap-3 border border-red-200 bg-red-50 px-4 py-3 text-sm">
          <AlertTriangle className="h-5 w-5 shrink-0 text-red-600 mt-0.5" />
          <div className="min-w-0">
            <p className="font-medium text-red-800">
              {taxDue.overdueCount} overdue tax {taxDue.overdueCount === 1 ? "obligation" : "obligations"}
            </p>
            <p className="text-red-700 mt-0.5">
              <CurrencyAmount amount={taxDue.overdueAmount} codeFirst /> past due —{" "}
              <button
                type="button"
                className="underline font-medium hover:text-red-900"
                onClick={() => navigate("/finance/taxes")}
              >
                Review taxes
              </button>
            </p>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <SummaryCard
          title="Receivables"
          helpText={t("dashHelpReceivables")}
          totalLabel="Total outstanding"
          total={receivables.total}
          current={receivables.current}
          overdue={receivables.overdue}
          currentLabel="Not yet due"
          overdueLabel="Overdue"
          breakdown={receivables.breakdown}
          onNew={() => navigate("/finance/invoices")}
        />
        <SummaryCard
          title="Total Payables"
          helpText={t("dashHelpPayables")}
          totalLabel="Total outstanding"
          total={payables.total}
          current={payables.current}
          overdue={payables.overdue}
          currentLabel="Not yet due"
          overdueLabel="Overdue"
          breakdown={payables.breakdown}
          onNew={() => navigate("/finance/bills")}
        />
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-semibold text-gray-800">Cash Flow</h3>
            <DashboardHelpTip text={t("dashHelpCashFlow")} />
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_220px]">
          <div className="h-64 min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cashFlow.monthly} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="incomeFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#16a34a" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="expenseFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "#64748b", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fill: "#64748b", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    formatRwf(value),
                    name === "incoming" ? "Income" : "Expenses",
                  ]}
                  contentStyle={{
                    borderRadius: 0,
                    border: "1px solid #e5e7eb",
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="incoming"
                  name="incoming"
                  stroke="#16a34a"
                  strokeWidth={2}
                  fill="url(#incomeFill)"
                  dot={{ r: 3, fill: "#16a34a", strokeWidth: 0 }}
                />
                <Area
                  type="monotone"
                  dataKey="outgoing"
                  name="outgoing"
                  stroke="#ef4444"
                  strokeWidth={2}
                  fill="url(#expenseFill)"
                  dot={{ r: 3, fill: "#ef4444", strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-4 border-t border-gray-100 pt-4 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
            <div>
              <p className="text-xs text-gray-500">Cash as on {cashFlow.startLabel}</p>
              <p className="text-sm font-semibold text-gray-900">
                <CurrencyAmount amount={cashFlow.openingCash} codeFirst />
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-emerald-600">Incoming</p>
              <p className="text-sm font-semibold text-emerald-600">
                <CurrencyAmount amount={cashFlow.incoming} codeFirst codeClassName="text-emerald-600/70" /> +
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-rose-500">Outgoing</p>
              <p className="text-sm font-semibold text-rose-500">
                <CurrencyAmount amount={cashFlow.outgoing} codeFirst codeClassName="text-rose-500/70" /> -
              </p>
            </div>
            <div className={cn("border-t border-gray-100 pt-4")}>
              <p className="text-xs text-gray-500">Cash as on {cashFlow.endLabel}</p>
              <p className="text-sm font-semibold text-gray-900">
                <CurrencyAmount amount={cashFlow.closingCash} codeFirst />
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-semibold text-gray-800">Income and Expense</h3>
              <DashboardHelpTip text={t("dashHelpIncomeExpense")} />
            </div>
          </div>

          <div className="mb-4 flex justify-end">
            <div className="inline-flex border border-gray-200">
              <button
                type="button"
                onClick={() => setBasis("accrual")}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium",
                  basis === "accrual"
                    ? "bg-gray-100 text-gray-900"
                    : "bg-white text-gray-500 hover:text-gray-700",
                )}
              >
                Accrual
              </button>
              <button
                type="button"
                onClick={() => setBasis("cash")}
                className={cn(
                  "border-l border-gray-200 px-3 py-1.5 text-xs font-medium",
                  basis === "cash"
                    ? "bg-gray-100 text-gray-900"
                    : "bg-white text-gray-500 hover:text-gray-700",
                )}
              >
                Cash
              </button>
            </div>
          </div>

          <div className="h-56 min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={incomeExpense.monthly} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "#64748b", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  interval={0}
                  angle={-35}
                  textAnchor="end"
                  height={50}
                />
                <YAxis
                  tick={{ fill: "#64748b", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => formatRwfCompact(v)}
                />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    formatRwf(value),
                    name === "income" ? "Income" : "Expense",
                  ]}
                  contentStyle={{
                    borderRadius: 0,
                    border: "1px solid #e5e7eb",
                    fontSize: 12,
                  }}
                />
                <Legend
                  verticalAlign="bottom"
                  height={28}
                  formatter={(value) => (value === "income" ? "Income" : "Expense")}
                />
                <Bar dataKey="income" name="income" fill="#22c55e" radius={0} maxBarSize={28} />
                <Bar dataKey="expense" name="expense" fill="#f97316" radius={0} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4 border-t border-gray-100 pt-4">
            <div>
              <p className="text-xs font-medium text-emerald-600">Total Revenue</p>
              <p className="mt-1 text-lg font-semibold text-gray-900">
                <CurrencyAmount amount={incomeExpense.totalIncome} codeFirst />
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-orange-500">Total Expenses</p>
              <p className="mt-1 text-lg font-semibold text-gray-900">
                <CurrencyAmount amount={incomeExpense.totalExpense} codeFirst />
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-4 border-t border-gray-100 pt-4 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                Money in
              </p>
              {incomeExpense.incomeBreakdown.length === 0 ? (
                <p className="text-xs text-gray-400">No income recorded for this period</p>
              ) : (
                <ul className="space-y-1.5">
                  {incomeExpense.incomeBreakdown.map((line) => (
                    <li
                      key={line.key}
                      className="flex items-center justify-between gap-2 text-xs text-gray-600"
                    >
                      <span>{breakdownLabel(line.key, line.label, t, basis)}</span>
                      <span className="shrink-0 font-medium tabular-nums text-gray-900">
                        <CurrencyAmount amount={line.amount} codeFirst />
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-orange-600">
                Money out
              </p>
              {incomeExpense.expenseBreakdown.length === 0 ? (
                <p className="text-xs text-gray-400">No expenses recorded for this period</p>
              ) : (
                <ul className="space-y-1.5">
                  {incomeExpense.expenseBreakdown.map((line) => (
                    <li
                      key={line.key}
                      className="flex items-center justify-between gap-2 text-xs text-gray-600"
                    >
                      <span>{breakdownLabel(line.key, line.label, t, basis)}</span>
                      <span className="shrink-0 font-medium tabular-nums text-gray-900">
                        <CurrencyAmount amount={line.amount} codeFirst />
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <p className="mt-3 text-[11px] text-gray-400">
            * Includes sales, income, invoices, bank deposits, loans, expenditure, payroll, bills, and taxes.
          </p>
        </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-semibold text-gray-800">Top Expenses</h3>
            <DashboardHelpTip text={t("dashHelpTopExpenses")} />
          </div>
        </div>

        {topExpenses.slices.length === 0 ? (
          <div className="flex h-64 items-center justify-center text-sm text-gray-400">
            No expense data for this period
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-[1fr_1fr] lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="h-56 min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={topExpenses.slices}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius="85%"
                    stroke="none"
                  >
                    {topExpenses.slices.map((slice) => (
                      <Cell key={slice.name} fill={slice.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => formatRwf(value)}
                    contentStyle={{
                      borderRadius: 0,
                      border: "1px solid #e5e7eb",
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2.5 self-center">
              {topExpenses.slices.map((slice) => (
                <div key={slice.name} className="flex items-center justify-between gap-2 text-sm">
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: slice.color }}
                    />
                    <span className="truncate text-gray-700">{slice.name}</span>
                  </div>
                  <span className="shrink-0 tabular-nums text-gray-500">
                    {slice.percent.toFixed(2)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-semibold text-gray-800">Upcoming Bills</h3>
              <DashboardHelpTip text={t("dashHelpUpcomingBills")} />
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-primary"
              onClick={() => navigate("/finance/bills")}
            >
              View all
            </Button>
          </div>
          {upcomingBills.length === 0 ? (
            <p className="text-sm text-gray-400 py-6 text-center">No bills due in the next 30 days</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {upcomingBills.map((bill, idx) => (
                <li key={`${bill.dueDate}-${idx}`} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">{bill.title || "Bill"}</p>
                    <p className="text-xs text-gray-500">Due {formatTableDate(bill.dueDate)}</p>
                  </div>
                  <span className="shrink-0 font-semibold tabular-nums text-amber-700">
                    <CurrencyAmount amount={Number(bill.amount) || 0} codeFirst codeClassName="text-amber-700/70" />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-semibold text-gray-800">Recent Transactions</h3>
              <DashboardHelpTip text={t("dashHelpRecentTransactions")} />
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-primary"
              onClick={() => navigate("/finance/transactions")}
            >
              View all
            </Button>
          </div>
          {transactionsLoading ? (
            <div className="space-y-2 py-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-10 animate-pulse bg-gray-100" />
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <p className="text-sm text-gray-400 py-6 text-center">No transactions yet</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {transactions.map((tx) => {
                const isIncome = tx.type === "income" || tx.type === "deposit";
                const typeLabel =
                  tx.type === "income"
                    ? "Income"
                    : tx.type === "expense"
                      ? "Expense"
                      : tx.type === "payroll"
                        ? "Payroll"
                        : "Deposit";
                return (
                  <li key={`${tx.type}-${tx.id}`} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 truncate">{tx.title}</p>
                      <p className="text-xs text-gray-500">
                        {typeLabel} · {formatTableDate(tx.date)}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 inline-flex items-center gap-0.5 font-semibold tabular-nums",
                        isIncome ? "text-emerald-600" : "text-rose-600",
                      )}
                    >
                      {isIncome ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                      <CurrencyAmount
                        amount={Math.round(Number(tx.amount) || 0)}
                        codeClassName={isIncome ? "text-emerald-600/70" : "text-rose-600/70"}
                      />
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
