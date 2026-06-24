import { useEffect, useMemo, useState } from "react";
import { useApi } from "@/hooks/useApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";
import { Plus, Loader2, MoreVertical, Pencil, Trash2, Paperclip, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { filterSelectClass } from "@/lib/fieldStyles";
import { formatCurrency } from "@/lib/currency";
import {
  BudgetPeriod,
  ViewPeriod,
  computeBudgetPeriodBounds,
  formatPeriodLabel,
  getViewPeriodBounds,
  periodsOverlap,
  startOfDay,
  endOfDay,
} from "@/lib/budgetPeriod";
import { ReceiptUploadField } from "@/components/finance/ReceiptUploadField";
import { uploadReceipt, openReceiptInNewTab } from "@/lib/financeUpload";
import { filterByPageSearch } from "@/lib/pageSearch";
import { usePageSearch } from "@/hooks/usePageSearch";
import {
  FINANCE_TH_CLASS,
  FINANCE_TD_CLASS,
  formatFinanceTableDate,
  FinanceDocumentRefCell,
  FinanceTableCheckbox,
  FinanceTableLoading,
  FinanceTableShell,
} from "@/components/finance/financeTable";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { useDeleteConfirm } from "@/hooks/useDeleteConfirm";

export interface BankDepositEntry {
  id?: number;
  _id?: string;
  title: string;
  amount: number;
  depositDate: string;
  budgetPeriod?: BudgetPeriod;
  periodStart?: string;
  periodEnd?: string;
  bankAccountName?: string;
  bankAccountNumber?: string;
  referenceNumber?: string;
  note?: string;
  receiptUrl?: string;
  receiptFileName?: string;
}

interface ExpenseLike {
  amount: number;
  date: string;
}

interface PayrollLike {
  amount: number;
  paymentDate: string;
  status?: string;
}

function depositId(e: BankDepositEntry): string {
  return String(e._id ?? e.id ?? "");
}

function buildDepositDate(dateValue: string) {
  const now = new Date();
  const savedDate = new Date((dateValue || new Date().toISOString().split("T")[0]) + "T00:00:00");
  savedDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
  return savedDate.toISOString();
}

function sortDeposits(list: BankDepositEntry[]) {
  return [...list].sort(
    (a, b) => new Date(b.depositDate).getTime() - new Date(a.depositDate).getTime(),
  );
}

function viewPeriodLabel(period: ViewPeriod, t: (key: string) => string) {
  const map: Record<ViewPeriod, string> = {
    monthly: t("budgetPeriodMonthly"),
    quarterly: t("budgetPeriodQuarterly"),
    yearly: t("budgetPeriodYearly"),
  };
  return map[period];
}

function budgetPeriodLabel(period: string | undefined, t: (key: string) => string) {
  const map: Record<string, string> = {
    monthly: t("budgetPeriodMonthly"),
    quarterly: t("budgetPeriodQuarterly"),
    yearly: t("budgetPeriodYearly"),
    custom: t("budgetPeriodCustom"),
  };
  return map[period || "monthly"] || period || "—";
}

export function BankDepositsTab() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const { items: deposits, isLoading, add, update, remove, refresh } = useApi<BankDepositEntry>({
    endpoint: "bankDeposits",
    defaultValue: [],
  });
  const { items: expenses } = useApi<ExpenseLike>({ endpoint: "expenses", defaultValue: [] });
  const { items: payrolls } = useApi<PayrollLike>({ endpoint: "payrolls", defaultValue: [] });

  useEffect(() => {
    const onRefresh = () => void refresh(true);
    window.addEventListener("expenses-should-refresh", onRefresh);
    window.addEventListener("payrolls-should-refresh", onRefresh);
    return () => {
      window.removeEventListener("expenses-should-refresh", onRefresh);
      window.removeEventListener("payrolls-should-refresh", onRefresh);
    };
  }, [refresh]);

  const [viewPeriod, setViewPeriod] = useState<ViewPeriod>("monthly");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [depositDate, setDepositDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [budgetPeriod, setBudgetPeriod] = useState<BudgetPeriod>("monthly");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [bankAccountName, setBankAccountName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [note, setNote] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [existingReceiptUrl, setExistingReceiptUrl] = useState<string | undefined>();
  const [existingReceiptName, setExistingReceiptName] = useState<string | undefined>();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<BankDepositEntry | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const {
    target: deleteTarget,
    open: deleteOpen,
    isDeleting: isDeleteDeleting,
    setIsDeleting: setIsDeleteDeleting,
    requestDelete,
    takeTarget,
    handleOpenChange: handleDeleteOpenChange,
  } = useDeleteConfirm<BankDepositEntry>();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const sortedDeposits = useMemo(() => sortDeposits(deposits), [deposits]);
  const { query: pageSearchQuery } = usePageSearch();
  const visibleDeposits = useMemo(
    () =>
      filterByPageSearch(sortedDeposits, pageSearchQuery, (entry) => [
        entry.title,
        entry.bankAccountName,
        entry.referenceNumber,
        entry.note,
      ]),
    [sortedDeposits, pageSearchQuery],
  );

  const viewBounds = useMemo(() => getViewPeriodBounds(viewPeriod), [viewPeriod]);

  const metrics = useMemo(() => {
    const overlapping = sortedDeposits.filter((row) => {
      const start = startOfDay(new Date(row.periodStart || row.depositDate));
      const end = endOfDay(new Date(row.periodEnd || row.depositDate));
      return periodsOverlap(start, end, viewBounds.periodStart, viewBounds.periodEnd);
    });

    const totalDeposited = overlapping.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);

    const totalExpenses = expenses
      .filter((row) => {
        const d = new Date(row.date);
        return d >= viewBounds.periodStart && d <= viewBounds.periodEnd;
      })
      .reduce((sum, row) => sum + (Number(row.amount) || 0), 0);

    const totalPayroll = payrolls
      .filter((row) => {
        if ((row.status || "pending") !== "paid") return false;
        const d = new Date(row.paymentDate);
        return d >= viewBounds.periodStart && d <= viewBounds.periodEnd;
      })
      .reduce((sum, row) => sum + (Number(row.amount) || 0), 0);

    const totalUsed = totalExpenses + totalPayroll;
    const availableBalance = totalDeposited - totalUsed;

    return {
      totalDeposited,
      totalUsed,
      totalExpenses,
      totalPayroll,
      availableBalance,
      depositCount: overlapping.length,
      periodLabel: formatPeriodLabel(viewBounds.periodStart, viewBounds.periodEnd),
    };
  }, [sortedDeposits, expenses, payrolls, viewBounds]);

  const allSelected =
    visibleDeposits.length > 0 && visibleDeposits.every((e) => selectedIds.has(depositId(e)));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(visibleDeposits.map((e) => depositId(e))));
  };

  const toggleSelectRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      } finally {
      setIsRefreshing(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setAmount("");
    setDepositDate(new Date().toISOString().split("T")[0]);
    setBudgetPeriod("monthly");
    setPeriodStart("");
    setPeriodEnd("");
    setBankAccountName("");
    setBankAccountNumber("");
    setReferenceNumber("");
    setNote("");
    setReceiptFile(null);
    setExistingReceiptUrl(undefined);
    setExistingReceiptName(undefined);
    setEditing(null);
  };

  const openCreate = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (entry: BankDepositEntry) => {
    setEditing(entry);
    setTitle(entry.title || "");
    setAmount(String(entry.amount ?? ""));
    setDepositDate(String(entry.depositDate || "").slice(0, 10) || new Date().toISOString().split("T")[0]);
    setBudgetPeriod((entry.budgetPeriod as BudgetPeriod) || "monthly");
    setPeriodStart(String(entry.periodStart || "").slice(0, 10));
    setPeriodEnd(String(entry.periodEnd || "").slice(0, 10));
    setBankAccountName(entry.bankAccountName || "");
    setBankAccountNumber(entry.bankAccountNumber || "");
    setReferenceNumber(entry.referenceNumber || "");
    setNote(entry.note || "");
    setReceiptFile(null);
    setExistingReceiptUrl(entry.receiptUrl);
    setExistingReceiptName(entry.receiptFileName);
    setOpen(true);
  };

  const buildPayload = async () => {
    let receiptPayload: { receiptUrl?: string; receiptFileName?: string } = {};
    if (receiptFile) {
      receiptPayload = await uploadReceipt(receiptFile);
    } else if (existingReceiptUrl) {
      receiptPayload = {
        receiptUrl: existingReceiptUrl,
        receiptFileName: existingReceiptName,
      };
    }

    const bounds = computeBudgetPeriodBounds(
      depositDate,
      budgetPeriod,
      periodStart || undefined,
      periodEnd || undefined,
    );

    return {
      title: title.trim(),
      amount: Number(amount),
      depositDate: buildDepositDate(depositDate),
      budgetPeriod,
      periodStart: bounds.periodStart.toISOString(),
      periodEnd: bounds.periodEnd.toISOString(),
      bankAccountName: bankAccountName.trim() || undefined,
      bankAccountNumber: bankAccountNumber.trim() || undefined,
      referenceNumber: referenceNumber.trim() || undefined,
      note: note.trim() || undefined,
      ...receiptPayload,
    };
  };

  const handleSave = async () => {
    if (!title.trim() || !amount || Number(amount) < 0) {
      toast({
        title: t("saveFailed"),
        description: t("depositNameAmountRequired"),
        variant: "destructive",
      });
      return;
    }

    if (budgetPeriod === "custom" && (!periodStart || !periodEnd)) {
      toast({
        title: t("saveFailed"),
        description: t("depositCustomPeriodRequired"),
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const payload = await buildPayload();
      if (editing) {
        await update({ ...editing, ...payload } as BankDepositEntry);
        toast({ title: t("depositUpdated"), description: t("depositUpdatedDesc") });
      } else {
        await add(payload as BankDepositEntry);
        toast({ title: t("depositRecorded"), description: t("depositRecordedDesc") });
      }
      window.dispatchEvent(new CustomEvent("finance-should-refresh"));
      resetForm();
      setOpen(false);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t("saveDepositFailed");
      toast({ title: t("saveFailed"), description: message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    const item = takeTarget();
    if (!item) return;
    const id = depositId(item);
    setIsDeleteDeleting(true);
    setDeletingId(id);
    try {
      await remove(item);
      toast({ title: t("deleted"), description: t("depositRemovedDesc") });
      window.dispatchEvent(new CustomEvent("finance-should-refresh"));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t("deleteDepositFailed");
      toast({ title: t("error"), description: message, variant: "destructive" });
    } finally {
      setDeletingId(null);
      setIsDeleteDeleting(false);
    }
  };

  const renderTable = () => {
    if (isLoading) {
      return <FinanceTableLoading />;
    }

    if (visibleDeposits.length === 0) {
      return (
        <div className="p-12 text-center text-muted-foreground">
          <p className="font-medium">{t("noDepositsYet")}</p>
          <p className="text-sm mt-1">{t("depositsEmptyHint")}</p>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1000px] border-collapse">
          <thead>
            <tr>
              <th className={cn(FINANCE_TH_CLASS, "w-10 pl-4")}>
                <FinanceTableCheckbox
                  checked={allSelected}
                  onCheckedChange={toggleSelectAll}
                  ariaLabel="Select all"
                />
              </th>
              <th className={FINANCE_TH_CLASS}>{t("depositDate")}</th>
              <th className={FINANCE_TH_CLASS}>{`${t("bankDeposits")} #`}</th>
              <th className={FINANCE_TH_CLASS}>{t("depositTitle")}</th>
              <th className={cn(FINANCE_TH_CLASS, "hidden md:table-cell")}>{t("budgetPeriod")}</th>
              <th className={cn(FINANCE_TH_CLASS, "hidden lg:table-cell")}>{t("budgetCovers")}</th>
              <th className={cn(FINANCE_TH_CLASS, "hidden sm:table-cell")}>{t("bankAccount")}</th>
              <th className={cn(FINANCE_TH_CLASS, "text-right")}>{t("amount")}</th>
              <th className={cn(FINANCE_TH_CLASS, "w-10 pr-4")} />
            </tr>
          </thead>
          <tbody className="bg-white">
            {visibleDeposits.map((entry, index) => {
              const id = depositId(entry);
              const periodStartDate = entry.periodStart ? new Date(entry.periodStart) : new Date(entry.depositDate);
              const periodEndDate = entry.periodEnd ? new Date(entry.periodEnd) : periodStartDate;
              return (
                <tr key={id} className="border-t border-gray-100 hover:bg-gray-50/80">
                  <td className={cn(FINANCE_TD_CLASS, "pl-4")}>
                    <FinanceTableCheckbox
                      checked={selectedIds.has(id)}
                      onCheckedChange={() => toggleSelectRow(id)}
                      ariaLabel={`Select ${entry.title}`}
                    />
                  </td>
                  <td className={FINANCE_TD_CLASS}>{formatFinanceTableDate(entry.depositDate)}</td>
                  <td className={FINANCE_TD_CLASS}>
                    <FinanceDocumentRefCell
                      entry={entry}
                      fallbackPrefix="DEP-"
                      id={id}
                      index={index}
                      onEdit={() => {
                        if (entry.receiptUrl) openReceiptInNewTab(entry.receiptUrl);
                      }}
                    />
                  </td>
                  <td className={cn(FINANCE_TD_CLASS, "font-medium max-w-[180px] truncate")}>
                    {entry.title}
                  </td>
                  <td className={cn(FINANCE_TD_CLASS, "hidden md:table-cell text-gray-600")}>
                    {budgetPeriodLabel(entry.budgetPeriod, t)}
                  </td>
                  <td className={cn(FINANCE_TD_CLASS, "hidden lg:table-cell text-gray-600")}>
                    {formatPeriodLabel(periodStartDate, periodEndDate)}
                  </td>
                  <td className={cn(FINANCE_TD_CLASS, "hidden sm:table-cell text-gray-600 max-w-[140px] truncate")}>
                    {entry.bankAccountName || "—"}
                  </td>
                  <td className={cn(FINANCE_TD_CLASS, "text-right font-semibold tabular-nums text-sky-700")}>
                    {formatCurrency(Number(entry.amount) || 0)}
                  </td>
                  <td className={cn(FINANCE_TD_CLASS, "pr-4")}>
                    <div className="flex justify-end">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical size={16} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {entry.receiptUrl ? (
                            <DropdownMenuItem onClick={() => openReceiptInNewTab(entry.receiptUrl!)}>
                              <Paperclip className="mr-2 h-4 w-4" />
                              {t("viewReceipt")}
                            </DropdownMenuItem>
                          ) : null}
                          <DropdownMenuItem onClick={() => openEdit(entry)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            {t("edit")}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => requestDelete(entry)}
                            disabled={deletingId === id}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            {t("delete")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const isYearlyView = viewPeriod === "yearly";
  const summaryCardClass = isYearlyView
    ? "px-0 py-2"
    : "border border-gray-200 bg-white px-4 py-3";

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="text-sm text-gray-600">{t("viewBudgetFor")}</span>
        <Select value={viewPeriod} onValueChange={(v) => setViewPeriod(v as ViewPeriod)}>
          {isYearlyView ? (
            <SelectTrigger
              className={cn(
                "h-auto w-auto gap-1 border-0 bg-transparent p-0 shadow-none",
                "text-[15px] font-semibold text-gray-800 hover:text-gray-900",
                "focus:ring-0 focus:ring-offset-0",
                "[&>svg.opacity-50]:hidden",
              )}
            >
              <span>{viewPeriodLabel(viewPeriod, t)}</span>
              <ChevronDown size={16} strokeWidth={2.5} className="shrink-0 text-primary" />
            </SelectTrigger>
          ) : (
            <SelectTrigger className={filterSelectClass}>
              <SelectValue />
            </SelectTrigger>
          )}
          <SelectContent>
            <SelectItem value="monthly">{t("budgetPeriodMonthly")}</SelectItem>
            <SelectItem value="quarterly">{t("budgetPeriodQuarterly")}</SelectItem>
            <SelectItem value="yearly">{t("budgetPeriodYearly")}</SelectItem>
          </SelectContent>
        </Select>
        <span
          className={cn(
            "text-sm text-gray-500",
            isYearlyView && "font-medium text-gray-700",
          )}
        >
          {metrics.periodLabel}
        </span>
      </div>

      <div className="mb-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className={summaryCardClass}>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{t("totalDeposited")}</p>
          <p className="text-xl font-bold text-sky-700 tabular-nums mt-1">
            {metrics.totalDeposited.toLocaleString()}{" "}
            <span className="currency-code text-sm text-gray-500">Rwf</span>
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {metrics.depositCount} {t("activeDeposits")}
          </p>
        </div>
        <div className={summaryCardClass}>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{t("usedBalance")}</p>
          <p className="text-xl font-bold text-red-600 tabular-nums mt-1">
            {metrics.totalUsed.toLocaleString()}{" "}
            <span className="currency-code text-sm text-gray-500">Rwf</span>
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {t("expenditure")} + {t("payroll")}
          </p>
        </div>
        <div className={summaryCardClass}>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{t("availableBalance")}</p>
          <p
            className={cn(
              "text-xl font-bold tabular-nums mt-1",
              metrics.availableBalance >= 0 ? "text-emerald-700" : "text-red-600",
            )}
          >
            {metrics.availableBalance.toLocaleString()}{" "}
            <span className="currency-code text-sm text-gray-500">Rwf</span>
          </p>
          <p className="text-xs text-gray-500 mt-0.5">{t("availableBalanceHint")}</p>
        </div>
      </div>

      <FinanceTableShell
        title={t("bankDeposits")}
        onAdd={openCreate}
        addLabel={t("add")}
        onRefresh={() => void handleRefresh()}
        isRefreshing={isRefreshing}
      >
        {renderTable()}
      </FinanceTableShell>

      <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); setOpen(v); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? t("editDeposit") : t("recordDeposit")}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{t("depositTitle")}</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t("depositExamplePlaceholder")}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t("amount")}</Label>
                <Input
                  type="number"
                  min={0}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>{t("depositDate")}</Label>
                <Input
                  type="date"
                  value={depositDate}
                  onChange={(e) => setDepositDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t("budgetPeriod")}</Label>
              <Select value={budgetPeriod} onValueChange={(v) => setBudgetPeriod(v as BudgetPeriod)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">{t("budgetPeriodMonthly")}</SelectItem>
                  <SelectItem value="quarterly">{t("budgetPeriodQuarterly")}</SelectItem>
                  <SelectItem value="yearly">{t("budgetPeriodYearly")}</SelectItem>
                  <SelectItem value="custom">{t("budgetPeriodCustom")}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">{t("budgetPeriodHint")}</p>
            </div>

            {budgetPeriod === "custom" ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>{t("periodStart")}</Label>
                  <Input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>{t("periodEnd")}</Label>
                  <Input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
                </div>
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t("bankAccount")}</Label>
                <Input
                  value={bankAccountName}
                  onChange={(e) => setBankAccountName(e.target.value)}
                  placeholder={t("bankAccountNamePlaceholder")}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("bankAccountNumber")}</Label>
                <Input
                  value={bankAccountNumber}
                  onChange={(e) => setBankAccountNumber(e.target.value)}
                  placeholder={t("bankAccountNumberPlaceholder")}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t("referenceNumber")}</Label>
              <Input
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder={t("depositReferencePlaceholder")}
              />
            </div>

            <div className="space-y-2">
              <Label>{t("note")}</Label>
              <Input value={note} onChange={(e) => setNote(e.target.value)} />
            </div>

            <ReceiptUploadField
              file={receiptFile}
              onFileChange={setReceiptFile}
              existingUrl={existingReceiptUrl}
              existingName={existingReceiptName}
              onClearExisting={() => {
                setExistingReceiptUrl(undefined);
                setExistingReceiptName(undefined);
              }}
            />
          </div>

          <DialogFooter>
            <Button variant="cancel" onClick={() => { resetForm(); setOpen(false); }}>
              {t("cancel")}
            </Button>
            <Button onClick={() => void handleSave()} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={handleDeleteOpenChange}
        title={t("deleteConfirmTitle")}
        description={t("deleteConfirmDesc").replace("{name}", deleteTarget?.title ?? "")}
        confirmLabel={t("delete")}
        cancelLabel={t("cancel")}
        deletingLabel={t("deleting")}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleteDeleting}
      />
    </>
  );
}
