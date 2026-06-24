import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslation } from "@/hooks/useTranslation";
import { useToast } from "@/hooks/use-toast";
import { financeApi } from "@/lib/api";
import { formatCurrency } from "@/lib/currency";
import {
  expenseTextClass,
  incomeTextClass,
  INCOME_COLOR,
  EXPENSE_COLOR,
  REVENUE_COLOR,
  netTextClass,
} from "@/lib/reportColors";
import { exportFinancialStatementPdf } from "@/lib/reportPdf";
import { Download, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  FINANCE_TD_CLASS,
  FINANCE_TH_CLASS,
  FinanceTableShell,
} from "@/components/finance/financeTable";
import { HelpTip } from "@/components/ui/help-tip";
import { ReportChartCard } from "@/components/reports/ReportChartCard";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type StatementTab = "profitLoss" | "balanceSheet" | "cashFlow";

function monthStartIso() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
}

function todayIso() {
  return new Date().toISOString().split("T")[0];
}

function AmountCell({ amount, type }: { amount: number; type: "income" | "expense" | "net" }) {
  const className =
    type === "income" ? incomeTextClass : type === "expense" ? expenseTextClass : netTextClass(amount);
  return <span className={cn(FINANCE_TD_CLASS, "text-right block", className)}>{formatCurrency(amount)}</span>;
}

export function FinancialStatementsTab() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<StatementTab>("profitLoss");
  const [startDate, setStartDate] = useState(monthStartIso());
  const [endDate, setEndDate] = useState(todayIso());
  const [asOfDate, setAsOfDate] = useState(todayIso());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [profitLoss, setProfitLoss] = useState<any>(null);
  const [balanceSheet, setBalanceSheet] = useState<any>(null);
  const [cashFlow, setCashFlow] = useState<any>(null);

  const loadStatement = async (downloadPdf = false) => {
    setLoading(true);
    setError("");
    try {
      if (activeTab === "profitLoss") {
        const res = await financeApi.getProfitLoss({ startDate, endDate });
        const data = res.data ?? null;
        setProfitLoss(data);
        if (downloadPdf && data) {
          exportFinancialStatementPdf("profitLoss", data, { startDate, endDate });
        }
      } else if (activeTab === "balanceSheet") {
        const res = await financeApi.getBalanceSheet({ asOfDate });
        const data = res.data ?? null;
        setBalanceSheet(data);
        if (downloadPdf && data) {
          exportFinancialStatementPdf("balanceSheet", data, { asOfDate });
        }
      } else {
        const res = await financeApi.getCashFlow({ startDate, endDate });
        const data = res.data ?? null;
        setCashFlow(data);
        if (downloadPdf && data) {
          exportFinancialStatementPdf("cashFlow", data, { startDate, endDate });
        }
      }

      if (downloadPdf) {
        toast({
          title: t("exportComplete"),
          description: t("downloadPdf"),
        });
      }
    } catch {
      setError(t("loadStatementsFailed"));
      if (downloadPdf) {
        toast({
          title: t("exportFailed"),
          description: t("pleaseTryAgain"),
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatement(false);
  }, [activeTab]);

  const profitLossChart = useMemo(() => {
    if (!profitLoss) return [];
    return [
      { name: t("totalRevenue"), value: profitLoss.revenue || 0, fill: INCOME_COLOR },
      { name: t("totalExpenses"), value: profitLoss.totalExpenses || 0, fill: EXPENSE_COLOR },
      {
        name: t("netProfit"),
        value: Math.abs(profitLoss.netProfit || 0),
        fill: (profitLoss.netProfit || 0) >= 0 ? INCOME_COLOR : EXPENSE_COLOR,
      },
    ];
  }, [profitLoss, t]);

  const cashFlowChart = useMemo(() => {
    if (!cashFlow) return [];
    return [
      { name: t("operatingCashIn"), value: cashFlow.operating?.cashIn || 0, fill: INCOME_COLOR },
      { name: t("operatingCashOut"), value: cashFlow.operating?.cashOut || 0, fill: EXPENSE_COLOR },
      { name: t("financingDeposits"), value: cashFlow.financing?.deposits || 0, fill: REVENUE_COLOR },
    ];
  }, [cashFlow, t]);

  const balanceChart = useMemo(() => {
    if (!balanceSheet) return [];
    return [
      { name: t("totalAssets"), value: balanceSheet.assets?.total || 0, fill: REVENUE_COLOR },
      { name: t("totalLiabilities"), value: balanceSheet.liabilities?.total || 0, fill: EXPENSE_COLOR },
      { name: t("equity"), value: balanceSheet.equity || 0, fill: INCOME_COLOR },
    ];
  }, [balanceSheet, t]);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-1.5">
          <h1 className="text-lg font-semibold text-gray-800">{t("financialStatements")}</h1>
          <HelpTip text={t("helpFinancialStatements")} />
        </div>
        <p className="text-sm text-muted-foreground">{t("financialStatementsHint")}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["profitLoss", "balanceSheet", "cashFlow"] as StatementTab[]).map((tab) => (
          <Button
            key={tab}
            variant={activeTab === tab ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab(tab)}
          >
            {t(tab)}
          </Button>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-4 p-1">
        {activeTab === "balanceSheet" ? (
          <div className="space-y-1">
            <Label>{t("asOfDate")}</Label>
            <Input type="date" value={asOfDate} onChange={(e) => setAsOfDate(e.target.value)} className="w-44" />
          </div>
        ) : (
          <>
            <div className="space-y-1">
              <Label>{t("startDate")}</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-44" />
            </div>
            <div className="space-y-1">
              <Label>{t("endDate")}</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-44" />
            </div>
          </>
        )}
        <Button onClick={() => loadStatement(true)} disabled={loading} className="gap-1.5">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {t("generateReport")}
        </Button>
        <Button variant="outline" size="sm" disabled={loading} onClick={() => loadStatement(false)}>
          {t("refresh")}
        </Button>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {activeTab === "profitLoss" && profitLoss ? (
        <div className="space-y-6">
          <ReportChartCard title={t("profitLoss")} subtitle={`${startDate} – ${endDate}`}>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={profitLossChart} margin={{ top: 8, right: 8, left: 0, bottom: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#6b7280" }} />
                <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend iconType="circle" iconSize={8} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          </ReportChartCard>

          <FinanceTableShell>
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className={FINANCE_TH_CLASS}>{t("profitLoss")}</th>
                  <th className={cn(FINANCE_TH_CLASS, "text-right")}>{t("amount")}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className={cn(FINANCE_TD_CLASS, "font-semibold text-gray-800")} colSpan={2}>
                    {t("revenue")}
                  </td>
                </tr>
                {(profitLoss.revenueLines || []).map((line: any) => (
                  <tr key={line.label}>
                    <td className={FINANCE_TD_CLASS}>{line.label}</td>
                    <td><AmountCell amount={line.amount} type="income" /></td>
                  </tr>
                ))}
                <tr>
                  <td className={cn(FINANCE_TD_CLASS, "font-semibold text-gray-800")}>{t("totalRevenue")}</td>
                  <td><AmountCell amount={profitLoss.revenue} type="income" /></td>
                </tr>
                <tr>
                  <td className={cn(FINANCE_TD_CLASS, "font-semibold text-gray-800")} colSpan={2}>
                    {t("expenses")}
                  </td>
                </tr>
                {(profitLoss.expenseLines || []).map((line: any) => (
                  <tr key={line.label}>
                    <td className={FINANCE_TD_CLASS}>{line.label}</td>
                    <td><AmountCell amount={line.amount} type="expense" /></td>
                  </tr>
                ))}
                <tr>
                  <td className={FINANCE_TD_CLASS}>{t("payroll")}</td>
                  <td><AmountCell amount={profitLoss.payroll} type="expense" /></td>
                </tr>
                <tr>
                  <td className={cn(FINANCE_TD_CLASS, "font-semibold text-gray-800")}>{t("totalExpenses")}</td>
                  <td><AmountCell amount={profitLoss.totalExpenses} type="expense" /></td>
                </tr>
                <tr>
                  <td className={cn(FINANCE_TD_CLASS, "font-semibold text-gray-800")}>{t("netProfit")}</td>
                  <td><AmountCell amount={profitLoss.netProfit} type="net" /></td>
                </tr>
              </tbody>
            </table>
          </FinanceTableShell>
        </div>
      ) : null}

      {activeTab === "balanceSheet" && balanceSheet ? (
        <div className="space-y-6">
          <ReportChartCard title={t("balanceSheet")} subtitle={asOfDate}>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={balanceChart} margin={{ top: 8, right: 8, left: 0, bottom: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#6b7280" }} />
                <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          </ReportChartCard>

          <div className="grid gap-6 md:grid-cols-2">
            <FinanceTableShell>
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className={FINANCE_TH_CLASS} colSpan={2}>{t("assets")}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className={FINANCE_TD_CLASS}>{t("cashAndBank")}</td>
                    <td><AmountCell amount={balanceSheet.assets?.cashAndBank} type="income" /></td>
                  </tr>
                  <tr>
                    <td className={FINANCE_TD_CLASS}>{t("accountsReceivable")}</td>
                    <td><AmountCell amount={balanceSheet.assets?.accountsReceivable} type="income" /></td>
                  </tr>
                  <tr>
                    <td className={FINANCE_TD_CLASS}>{t("inventoryValue")}</td>
                    <td><AmountCell amount={balanceSheet.assets?.inventoryValue} type="income" /></td>
                  </tr>
                  <tr>
                    <td className={cn(FINANCE_TD_CLASS, "font-semibold text-gray-800")}>{t("totalAssets")}</td>
                    <td><AmountCell amount={balanceSheet.assets?.total} type="income" /></td>
                  </tr>
                </tbody>
              </table>
            </FinanceTableShell>
            <FinanceTableShell>
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className={FINANCE_TH_CLASS} colSpan={2}>{t("liabilitiesAndEquity")}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className={FINANCE_TD_CLASS}>{t("accountsPayable")}</td>
                    <td><AmountCell amount={balanceSheet.liabilities?.accountsPayable} type="expense" /></td>
                  </tr>
                  <tr>
                    <td className={FINANCE_TD_CLASS}>{t("loanLiabilities")}</td>
                    <td><AmountCell amount={balanceSheet.liabilities?.loanLiabilities} type="expense" /></td>
                  </tr>
                  <tr>
                    <td className={cn(FINANCE_TD_CLASS, "font-semibold text-gray-800")}>{t("totalLiabilities")}</td>
                    <td><AmountCell amount={balanceSheet.liabilities?.total} type="expense" /></td>
                  </tr>
                  <tr>
                    <td className={cn(FINANCE_TD_CLASS, "font-semibold text-gray-800")}>{t("equity")}</td>
                    <td><AmountCell amount={balanceSheet.equity} type="income" /></td>
                  </tr>
                </tbody>
              </table>
            </FinanceTableShell>
          </div>
        </div>
      ) : null}

      {activeTab === "cashFlow" && cashFlow ? (
        <div className="space-y-6">
          <ReportChartCard title={t("cashFlow")} subtitle={`${startDate} – ${endDate}`}>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={cashFlowChart} margin={{ top: 8, right: 8, left: 0, bottom: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#6b7280" }} />
                <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend iconType="circle" iconSize={8} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          </ReportChartCard>

          <FinanceTableShell>
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className={FINANCE_TH_CLASS}>{t("cashFlow")}</th>
                  <th className={cn(FINANCE_TH_CLASS, "text-right")}>{t("amount")}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className={FINANCE_TD_CLASS}>{t("operatingCashIn")}</td>
                  <td><AmountCell amount={cashFlow.operating?.cashIn} type="income" /></td>
                </tr>
                <tr>
                  <td className={FINANCE_TD_CLASS}>{t("operatingCashOut")}</td>
                  <td><AmountCell amount={cashFlow.operating?.cashOut} type="expense" /></td>
                </tr>
                <tr>
                  <td className={FINANCE_TD_CLASS}>{t("netOperatingCash")}</td>
                  <td><AmountCell amount={cashFlow.operating?.net} type="net" /></td>
                </tr>
                <tr>
                  <td className={FINANCE_TD_CLASS}>{t("financingDeposits")}</td>
                  <td><AmountCell amount={cashFlow.financing?.deposits} type="income" /></td>
                </tr>
                <tr>
                  <td className={cn(FINANCE_TD_CLASS, "font-semibold text-gray-800")}>{t("netChangeInCash")}</td>
                  <td><AmountCell amount={cashFlow.netChangeInCash} type="net" /></td>
                </tr>
              </tbody>
            </table>
          </FinanceTableShell>
        </div>
      ) : null}
    </div>
  );
}
