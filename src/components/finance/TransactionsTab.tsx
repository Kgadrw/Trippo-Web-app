import { useCallback, useEffect, useMemo, useState } from "react";
import { financeApi } from "@/lib/api";
import { useTranslation } from "@/hooks/useTranslation";
import { cn } from "@/lib/utils";
import { ArrowDown, ArrowUp, Paperclip } from "lucide-react";
import { openReceiptInNewTab } from "@/lib/financeUpload";
import { filterByPageSearch } from "@/lib/pageSearch";
import { usePageSearch } from "@/hooks/usePageSearch";
import {
  FINANCE_TD_CLASS,
  FINANCE_TH_CLASS,
  FinanceTableCheckbox,
  FinanceTableLoading,
  FinanceTableShell,
  formatFinanceTableDate,
  FinanceDocumentRefCell,
} from "@/components/finance/financeTable";

interface Transaction {
  id: string;
  type: "income" | "expense" | "payroll" | "deposit";
  title: string;
  amount: number;
  date: string;
  meta?: string;
  status?: string;
  paymentMethod?: string;
  receiptUrl?: string;
  receiptFileName?: string;
}

function transactionRowId(tx: Transaction) {
  return `${tx.type}-${tx.id}`;
}

function transactionRefPrefix(type: Transaction["type"]) {
  switch (type) {
    case "income":
      return "income";
    case "expense":
      return "expense";
    case "payroll":
      return "payroll";
    case "deposit":
      return "deposit";
  }
}

function sortTransactionsByDateDesc(list: Transaction[]) {
  return [...list].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
}

export function TransactionsTab() {
  const { t } = useTranslation();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const loadTransactions = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;
    try {
      if (silent) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }
      const res = await financeApi.getTransactions({ limit: 200 });
      if (Array.isArray(res.data)) {
        setTransactions(res.data);
      }
    } catch {
      // keep last known
    } finally {
      if (silent) {
        setIsRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadTransactions();
  }, [loadTransactions]);

  useEffect(() => {
    const onRefresh = () => void loadTransactions({ silent: true });
    window.addEventListener("finance-should-refresh", onRefresh);
    return () => {
      window.removeEventListener("finance-should-refresh", onRefresh);
    };
  }, [loadTransactions]);

  const sortedTransactions = useMemo(
    () => sortTransactionsByDateDesc(transactions),
    [transactions],
  );
  const { query: pageSearchQuery } = usePageSearch();
  const visibleTransactions = useMemo(
    () =>
      filterByPageSearch(sortedTransactions, pageSearchQuery, (tx) => [
        tx.title,
        tx.meta,
        tx.type,
        tx.amount,
        tx.status,
      ]),
    [sortedTransactions, pageSearchQuery],
  );

  const allSelected =
    visibleTransactions.length > 0 &&
    visibleTransactions.every((tx) => selectedIds.has(transactionRowId(tx)));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(visibleTransactions.map((tx) => transactionRowId(tx))));
  };

  const toggleSelectRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const typeLabel = (type: Transaction["type"]) => {
    switch (type) {
      case "income":
        return t("transactionTypeIncome");
      case "expense":
        return t("transactionTypeExpense");
      case "payroll":
        return t("transactionTypePayroll");
      case "deposit":
        return t("transactionTypeDeposit");
    }
  };

  const renderTable = () => {
    if (loading) {
      return <FinanceTableLoading />;
    }

    if (visibleTransactions.length === 0) {
      return (
        <div className="p-12 text-center text-muted-foreground">
          <p className="font-medium">{t("noTransactionsYet")}</p>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse">
          <thead>
            <tr>
              <th className={cn(FINANCE_TH_CLASS, "w-10 pl-4")}>
                <FinanceTableCheckbox
                  checked={allSelected}
                  onCheckedChange={toggleSelectAll}
                  ariaLabel="Select all"
                />
              </th>
              <th className={FINANCE_TH_CLASS}>{t("date")}</th>
              <th className={FINANCE_TH_CLASS}>{t("typeLabel")}</th>
              <th className={FINANCE_TH_CLASS}>{`${t("transactions")} #`}</th>
              <th className={FINANCE_TH_CLASS}>{t("incomeTitle")}</th>
              <th className={cn(FINANCE_TH_CLASS, "hidden md:table-cell")}>{t("details")}</th>
              <th className={cn(FINANCE_TH_CLASS, "text-right")}>{t("amount")}</th>
              <th className={cn(FINANCE_TH_CLASS, "w-10 pr-4")} />
            </tr>
          </thead>
          <tbody className="bg-white">
            {visibleTransactions.map((tx, index) => {
              const rowId = transactionRowId(tx);
              const isSelected = selectedIds.has(rowId);
              const isIncome = tx.type === "income";
              const isExpense = tx.type === "expense";
              const isDeposit = tx.type === "deposit";
              const amountColor = isIncome
                ? "text-emerald-600"
                : isExpense
                  ? "text-rose-600"
                  : isDeposit
                    ? "text-sky-600"
                    : "text-violet-600";
              const metaText = [tx.meta, tx.status === "pending" ? t("pending") : ""]
                .filter(Boolean)
                .join(" · ");

              return (
                <tr
                  key={rowId}
                  className={cn(
                    "transition-colors hover:bg-gray-50/80",
                    isSelected && "bg-blue-50/40",
                  )}
                >
                  <td className={cn(FINANCE_TD_CLASS, "pl-4")}>
                    <FinanceTableCheckbox
                      checked={isSelected}
                      onCheckedChange={() => toggleSelectRow(rowId)}
                      ariaLabel={`Select ${tx.title}`}
                    />
                  </td>
                  <td className={cn(FINANCE_TD_CLASS, "text-gray-700 tabular-nums")}>
                    {formatFinanceTableDate(tx.date)}
                  </td>
                  <td className={cn(FINANCE_TD_CLASS, "text-gray-600")}>{typeLabel(tx.type)}</td>
                  <td className={FINANCE_TD_CLASS}>
                    <FinanceDocumentRefCell
                      entry={tx}
                      fallbackPrefix={transactionRefPrefix(tx.type)}
                      id={tx.id}
                      index={index}
                      readOnly={!tx.receiptUrl}
                    />
                  </td>
                  <td className={cn(FINANCE_TD_CLASS, "font-semibold text-gray-900 max-w-[180px] truncate")}>
                    {tx.title}
                  </td>
                  <td className={cn(FINANCE_TD_CLASS, "hidden md:table-cell text-gray-600 max-w-[200px] truncate")}>
                    {metaText || "—"}
                  </td>
                  <td className={cn(FINANCE_TD_CLASS, "text-right font-medium tabular-nums", amountColor)}>
                    <span className="inline-flex items-center justify-end gap-1">
                      {isIncome || isDeposit ? (
                        <ArrowUp size={14} className="shrink-0" aria-hidden />
                      ) : (
                        <ArrowDown size={14} className="shrink-0" aria-hidden />
                      )}
                      {Number(tx.amount).toLocaleString()} Rwf
                    </span>
                  </td>
                  <td className={cn(FINANCE_TD_CLASS, "pr-4 text-right")}>
                    {tx.receiptUrl ? (
                      <button
                        type="button"
                        className="p-1 text-gray-400 hover:text-gray-600"
                        onClick={() => void openReceiptInNewTab(tx.receiptUrl!).catch(() => undefined)}
                        aria-label={t("viewReceipt")}
                      >
                        <Paperclip size={15} />
                      </button>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <FinanceTableShell
      title={t("transactions")}
      onAdd={() => {}}
      addLabel={t("add")}
      showAdd={false}
      onRefresh={() => void loadTransactions({ silent: true })}
      isRefreshing={isRefreshing}
    >
      {renderTable()}
    </FinanceTableShell>
  );
}
