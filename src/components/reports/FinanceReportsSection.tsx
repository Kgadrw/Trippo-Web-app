import { useMemo } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import { formatCurrency, CurrencyAmount } from "@/lib/currency";
import { DesktopDataTable, MobileDataList, MobileListCard } from "@/components/ui/mobile-list-card";
import { expenseTextClass, incomeTextClass } from "@/lib/reportColors";
import { cn } from "@/lib/utils";
import { ReportChartCard } from "@/components/reports/ReportChartCard";
import { ReportEmptyIllustration } from "@/components/reports/ReportEmptyIllustration";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const PIE_COLORS = ["#2563eb", "#22c55e", "#f97316", "#a855f7", "#eab308", "#ef4444", "#06b6d4"];

type FinanceRow = {
  id: string;
  title: string;
  date: string;
  amount: number;
  status?: string;
  extra?: string;
};

type FinanceBlockProps = {
  title: string;
  rows: FinanceRow[];
  emptyHint: string;
  totalLabel: string;
  amountTone?: "income" | "expense";
};

function FinanceBlock({ title, rows, emptyHint, totalLabel, amountTone = "expense" }: FinanceBlockProps) {
  const total = rows.reduce((sum, row) => sum + (row.amount || 0), 0);
  const amountClass = amountTone === "income" ? incomeTextClass : expenseTextClass;

  return (
    <div className="space-y-6 pb-3">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          <p className="text-xs text-muted-foreground">
            {totalLabel}: <span className="font-semibold text-gray-800"><CurrencyAmount amount={total} codeFirst /></span>
          </p>
        </div>
        <span className="text-xs text-muted-foreground">{rows.length} {rows.length === 1 ? "entry" : "entries"}</span>
      </div>

      {rows.length > 0 ? (
        <>
          <DesktopDataTable>
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Title</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">Amount</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td className="px-6 py-3 text-sm text-gray-900">
                      <div>{row.title}</div>
                      {row.extra ? <div className="text-xs text-muted-foreground">{row.extra}</div> : null}
                    </td>
                    <td className="whitespace-nowrap px-6 py-3 text-sm text-gray-700">{row.date}</td>
                    <td className="px-6 py-3 text-sm capitalize text-gray-600">{row.status || "—"}</td>
                    <td className="whitespace-nowrap px-6 py-3 text-right text-sm tabular-nums">
                      <span className={amountClass}>{formatCurrency(row.amount)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </DesktopDataTable>
            <MobileDataList>
              {rows.map((row, index) => (
                <MobileListCard key={row.id} index={index}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-900">{row.title}</p>
                      <p className="text-xs text-muted-foreground">{row.date}{row.status ? ` · ${row.status}` : ""}</p>
                    </div>
                    <span className={cn("shrink-0 text-sm tabular-nums", amountClass)}>
                      {formatCurrency(row.amount)}
                    </span>
                  </div>
                </MobileListCard>
              ))}
            </MobileDataList>
          </>
        ) : (
          <p className="pb-2 text-sm text-muted-foreground">{emptyHint}</p>
        )}
    </div>
  );
}

type FinanceReportsSectionProps = {
  incomes: FinanceRow[];
  payrolls: FinanceRow[];
  bills: FinanceRow[];
  taxes: FinanceRow[];
  invoices: FinanceRow[];
  bankDeposits: FinanceRow[];
  loans: FinanceRow[];
  reportPeriodLabel: string;
};

export function FinanceReportsSection({
  incomes,
  payrolls,
  bills,
  taxes,
  invoices,
  bankDeposits,
  loans,
  reportPeriodLabel,
}: FinanceReportsSectionProps) {
  const { t } = useTranslation();

  const blocks = useMemo(
    () => [
      { key: "income", title: t("income"), rows: incomes, empty: t("noIncomeFound"), color: "#22c55e" },
      { key: "payroll", title: t("payroll"), rows: payrolls, empty: t("payrollEmptyHint"), color: "#f97316" },
      { key: "bills", title: t("bills"), rows: bills, empty: t("billsEmptyHint"), color: "#a855f7" },
      { key: "taxes", title: t("taxes"), rows: taxes, empty: t("taxesEmptyHint"), color: "#eab308" },
      { key: "invoices", title: t("invoices"), rows: invoices, empty: t("invoicesEmptyHint"), color: "#2563eb" },
      { key: "deposits", title: t("bankDeposits"), rows: bankDeposits, empty: t("noDataForPeriod"), color: "#06b6d4" },
      { key: "loans", title: t("loans"), rows: loans, empty: t("noDataForPeriod"), color: "#64748b" },
    ],
    [t, incomes, payrolls, bills, taxes, invoices, bankDeposits, loans],
  );

  const summaryChart = useMemo(
    () =>
      blocks
        .map((b) => ({
          name: b.title,
          value: b.rows.reduce((sum, r) => sum + (r.amount || 0), 0),
          fill: b.color,
        }))
        .filter((r) => r.value > 0),
    [blocks],
  );

  const hasData = summaryChart.length > 0;

  return (
    <div className="space-y-6">
      {hasData ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <ReportChartCard title={t("finance")} subtitle={t("platformSummary")}>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={summaryChart} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={2}>
                  {summaryChart.map((entry, index) => (
                    <Cell key={entry.name} fill={entry.fill || PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend verticalAlign="bottom" height={36} iconType="circle" iconSize={8} />
              </PieChart>
            </ResponsiveContainer>
          </ReportChartCard>

          <ReportChartCard title={t("total")} subtitle={reportPeriodLabel}>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={summaryChart} margin={{ top: 8, right: 8, left: 0, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#6b7280" }} angle={-30} textAnchor="end" height={52} />
                <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </ReportChartCard>
        </div>
      ) : (
        <ReportEmptyIllustration title={t("noDataForPeriod")} variant="finance" />
      )}

      {blocks.map((block) => (
        <FinanceBlock
          key={block.key}
          title={block.title}
          rows={block.rows}
          emptyHint={block.empty}
          totalLabel={t("total")}
          amountTone={block.key === "income" || block.key === "deposits" ? "income" : "expense"}
        />
      ))}
    </div>
  );
}

export type { FinanceRow };
