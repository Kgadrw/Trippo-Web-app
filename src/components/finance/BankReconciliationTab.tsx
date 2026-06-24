import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "@/hooks/useTranslation";
import { accountApi } from "@/lib/api";
import { formatCurrency, CurrencyAmount } from "@/lib/currency";
import { Loader2, CheckCircle2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { filterSelectClass } from "@/lib/fieldStyles";
import {
  FINANCE_TD_CLASS,
  FINANCE_TH_CLASS,
  FinanceTableLoading,
  FinanceTableShell,
} from "@/components/finance/financeTable";
import { HelpTip } from "@/components/ui/help-tip";

type ReconciliationEntry = {
  id: string;
  type: "income" | "expense" | "transfer" | "payroll";
  date: string;
  description: string;
  amount: number;
  direction: "in" | "out";
  reconciled: boolean;
};

function monthStartIso() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
}

function todayIso() {
  return new Date().toISOString().split("T")[0];
}

export function BankReconciliationTab() {
  const { t } = useTranslation();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [accountId, setAccountId] = useState("");
  const [startDate, setStartDate] = useState(monthStartIso());
  const [endDate, setEndDate] = useState(todayIso());
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [togglingId, setTogglingId] = useState("");

  useEffect(() => {
    accountApi.getAll().then((res) => {
      const list = Array.isArray(res.data) ? res.data : [];
      setAccounts(list);
      if (!accountId && list.length > 0) {
        const defaultAccount = list.find((a: any) => a.isDefault) || list[0];
        setAccountId(String(defaultAccount._id ?? defaultAccount.id ?? ""));
      }
    });
  }, []);

  const loadReconciliation = async () => {
    if (!accountId) return;
    setLoading(true);
    try {
      const res = await accountApi.getReconciliation(accountId, { startDate, endDate });
      setData(res.data ?? null);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (accountId) loadReconciliation();
  }, [accountId]);

  const toggleEntry = async (entry: ReconciliationEntry) => {
    if (entry.type === "payroll") return;
    setTogglingId(entry.id);
    try {
      await accountApi.toggleReconciliation({
        type: entry.type,
        id: entry.id,
        reconciled: !entry.reconciled,
      });
      await loadReconciliation();
    } finally {
      setTogglingId("");
    }
  };

  const entries: ReconciliationEntry[] = data?.entries || [];

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-1.5">
          <h1 className="text-lg font-semibold text-gray-800">{t("bankReconciliation")}</h1>
          <HelpTip text={t("helpBankReconciliation")} />
        </div>
        <p className="text-sm text-gray-500">{t("bankReconciliationHint")}</p>
      </div>

      <div className="flex flex-wrap items-end gap-4 rounded-lg border p-4">
        <div className="space-y-1 min-w-[200px]">
          <Label>{t("selectAccount")}</Label>
          <Select value={accountId || "none"} onValueChange={setAccountId}>
            <SelectTrigger className={cn(filterSelectClass, "min-w-[200px]")}>
              <SelectValue placeholder={t("selectAccount")} />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((account) => {
                const id = String(account._id ?? account.id ?? "");
                return (
                  <SelectItem key={id} value={id}>
                    {account.name}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>{t("startDate")}</Label>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-44 rounded-none"
          />
        </div>
        <div className="space-y-1">
          <Label>{t("endDate")}</Label>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-44 rounded-none"
          />
        </div>
        <Button onClick={loadReconciliation} disabled={loading || !accountId}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("refresh")}
        </Button>
      </div>

      {data ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{t("openingBalance")}</p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-gray-800"><CurrencyAmount amount={data.openingBalance} codeFirst /></p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{t("closingBalance")}</p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-gray-800"><CurrencyAmount amount={data.closingBalance} codeFirst /></p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{t("reconciledCount")}</p>
            <p className="mt-1 text-lg font-semibold text-gray-800">{data.reconciledCount}</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{t("unreconciledCount")}</p>
            <p className="mt-1 text-lg font-semibold text-gray-800">{data.unreconciledCount}</p>
          </div>
        </div>
      ) : null}

      {loading ? (
        <FinanceTableLoading />
      ) : (
        <FinanceTableShell>
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className={FINANCE_TH_CLASS}>{t("date")}</th>
                <th className={FINANCE_TH_CLASS}>{t("description")}</th>
                <th className={FINANCE_TH_CLASS}>{t("transactionType")}</th>
                <th className={cn(FINANCE_TH_CLASS, "text-right")}>{t("amount")}</th>
                <th className={FINANCE_TH_CLASS}>{t("reconciled")}</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr>
                  <td className={FINANCE_TD_CLASS} colSpan={5}>
                    {t("noReconciliationEntries")}
                  </td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <tr key={`${entry.type}-${entry.id}`}>
                    <td className={FINANCE_TD_CLASS}>{new Date(entry.date).toLocaleDateString()}</td>
                    <td className={FINANCE_TD_CLASS}>{entry.description}</td>
                    <td className={FINANCE_TD_CLASS}>{entry.type}</td>
                    <td className={cn(FINANCE_TD_CLASS, "text-right")}>
                      {entry.direction === "out" ? "-" : "+"}
                      {formatCurrency(entry.amount)}
                    </td>
                    <td className={FINANCE_TD_CLASS}>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={togglingId === entry.id || entry.type === "payroll"}
                        onClick={() => toggleEntry(entry)}
                      >
                        {entry.reconciled ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <Circle className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </FinanceTableShell>
      )}
    </div>
  );
}
