import { useApi } from "@/hooks/useApi";
import { taxApi } from "@/lib/api";
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
import {
  Plus,
  Loader2,
  MoreVertical,
  Pencil,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Paperclip,
  ArrowDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useMemo, useRef, useState } from "react";
import { ReceiptUploadField } from "@/components/finance/ReceiptUploadField";
import { PaymentDetailsFields, buildFinancePaymentPayload } from "@/components/finance/PaymentDetailsFields";
import { uploadReceipt, openReceiptInNewTab } from "@/lib/financeUpload";
import { CurrencyAmount } from "@/lib/currency";
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

export interface TaxEntry {
  id?: number;
  _id?: string;
  title: string;
  taxType: string;
  amount: number;
  dueDate: string;
  period?: string;
  authority?: string;
  referenceNumber?: string;
  status?: "pending" | "paid";
  paidAt?: string;
  expenseId?: string;
  note?: string;
  paymentMethod?: string;
  bankAccountName?: string;
  bankAccountNumber?: string;
  receiptUrl?: string;
  receiptFileName?: string;
}

const TAX_TYPES = ["VAT", "PAYE", "WHT", "Income Tax", "Local Government", "Other"] as const;

function taxId(e: TaxEntry): string {
  return String(e._id ?? e.id ?? "");
}

function buildDueDate(dateValue: string) {
  const now = new Date();
  const savedDate = new Date((dateValue || new Date().toISOString().split("T")[0]) + "T00:00:00");
  savedDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
  return savedDate.toISOString();
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function isOverdue(dueDate: string, status?: string) {
  if (status === "paid") return false;
  const due = startOfDay(new Date(dueDate));
  const today = startOfDay(new Date());
  return due < today;
}

function isDueToday(dueDate: string, status?: string) {
  if (status === "paid") return false;
  const due = startOfDay(new Date(dueDate));
  const today = startOfDay(new Date());
  return due.getTime() === today.getTime();
}

function isDueWithinDays(dueDate: string, days: number, status?: string) {
  if (status === "paid") return false;
  const due = startOfDay(new Date(dueDate));
  const today = startOfDay(new Date());
  const limit = new Date(today);
  limit.setDate(limit.getDate() + days);
  return due >= today && due <= limit;
}

function sortTaxes(list: TaxEntry[]) {
  return [...list].sort((a, b) => {
    const aPending = (a.status || "pending") === "pending" ? 0 : 1;
    const bPending = (b.status || "pending") === "pending" ? 0 : 1;
    if (aPending !== bPending) return aPending - bPending;
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });
}

export function TaxesTab() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const { items: taxes, isLoading, add, update, remove, refresh } = useApi<TaxEntry>({
    endpoint: "taxes",
    defaultValue: [],
  });

  const lastRefreshRef = useRef(0);
  useEffect(() => {
    const onRefresh = () => void refresh(true);
    const onVisibility = () => {
      if (document.visibilityState !== "visible") return;
      const now = Date.now();
      if (now - lastRefreshRef.current < 30_000) return;
      lastRefreshRef.current = now;
      void refresh(true);
    };
    window.addEventListener("taxes-should-refresh", onRefresh);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("taxes-should-refresh", onRefresh);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [refresh]);

  const [title, setTitle] = useState("");
  const [taxType, setTaxType] = useState<string>("VAT");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [period, setPeriod] = useState("");
  const [authority, setAuthority] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [note, setNote] = useState("");
  const [taxPaymentMethod, setTaxPaymentMethod] = useState("transfer");
  const [taxBankAccountName, setTaxBankAccountName] = useState("");
  const [taxBankAccountNumber, setTaxBankAccountNumber] = useState("");
  const [taxAccountId, setTaxAccountId] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [existingReceiptUrl, setExistingReceiptUrl] = useState<string | undefined>();
  const [existingReceiptName, setExistingReceiptName] = useState<string | undefined>();
  const [open, setOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [editing, setEditing] = useState<TaxEntry | null>(null);
  const [paying, setPaying] = useState<TaxEntry | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const {
    target: deleteTarget,
    open: deleteOpen,
    isDeleting: isDeleteDeleting,
    setIsDeleting: setIsDeleteDeleting,
    requestDelete,
    takeTarget,
    handleOpenChange: handleDeleteOpenChange,
  } = useDeleteConfirm<TaxEntry>();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("transfer");
  const [bankAccountName, setBankAccountName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [accountId, setAccountId] = useState("");
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [payReceiptFile, setPayReceiptFile] = useState<File | null>(null);

  const sortedTaxes = useMemo(() => sortTaxes(taxes), [taxes]);
  const { query: pageSearchQuery } = usePageSearch();
  const visibleTaxes = useMemo(
    () =>
      filterByPageSearch(sortedTaxes, pageSearchQuery, (entry) => [
        entry.title,
        entry.taxType,
        entry.note,
        entry.status,
      ]),
    [sortedTaxes, pageSearchQuery],
  );

  const metrics = useMemo(() => {
    const pending = taxes.filter((tx) => (tx.status || "pending") === "pending");
    const outstanding = pending.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
    const dueToday = pending.filter((tx) => isDueToday(tx.dueDate, tx.status));
    const dueSoon = pending.filter((tx) => isDueWithinDays(tx.dueDate, 30, tx.status));
    const overdue = pending.filter((tx) => isOverdue(tx.dueDate, tx.status));
    return {
      outstanding,
      dueTodayAmount: dueToday.reduce((s, tx) => s + (Number(tx.amount) || 0), 0),
      dueSoonAmount: dueSoon.reduce((s, tx) => s + (Number(tx.amount) || 0), 0),
      overdueAmount: overdue.reduce((s, tx) => s + (Number(tx.amount) || 0), 0),
      dueTodayCount: dueToday.length,
      dueSoonCount: dueSoon.length,
      overdueCount: overdue.length,
    };
  }, [taxes]);

  const allSelected =
    visibleTaxes.length > 0 && visibleTaxes.every((e) => selectedIds.has(taxId(e)));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(visibleTaxes.map((e) => taxId(e))));
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
      await refresh(true);
    } finally {
      setIsRefreshing(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setTaxType("VAT");
    setAmount("");
    setDueDate(new Date().toISOString().split("T")[0]);
    setPeriod("");
    setAuthority("");
    setReferenceNumber("");
    setNote("");
    setTaxPaymentMethod("transfer");
    setTaxBankAccountName("");
    setTaxBankAccountNumber("");
    setReceiptFile(null);
    setExistingReceiptUrl(undefined);
    setExistingReceiptName(undefined);
    setEditing(null);
  };

  const resetPayForm = () => {
    setPaying(null);
    setPaymentMethod("transfer");
    setBankAccountName("");
    setBankAccountNumber("");
    setPaymentDate(new Date().toISOString().split("T")[0]);
    setPayReceiptFile(null);
  };

  const openCreate = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (entry: TaxEntry) => {
    if (entry.status === "paid") return;
    setEditing(entry);
    setTitle(entry.title || "");
    setTaxType(entry.taxType || "VAT");
    setAmount(String(entry.amount ?? ""));
    setDueDate(String(entry.dueDate || "").slice(0, 10) || new Date().toISOString().split("T")[0]);
    setPeriod(entry.period || "");
    setAuthority(entry.authority || "");
    setReferenceNumber(entry.referenceNumber || "");
    setNote(entry.note || "");
    setTaxPaymentMethod(entry.paymentMethod || "transfer");
    setTaxBankAccountName(entry.bankAccountName || "");
    setTaxBankAccountNumber(entry.bankAccountNumber || "");
    setReceiptFile(null);
    setExistingReceiptUrl(entry.receiptUrl);
    setExistingReceiptName(entry.receiptFileName);
    setOpen(true);
  };

  const openPay = (entry: TaxEntry) => {
    setPaying(entry);
    setPaymentMethod(entry.paymentMethod || "transfer");
    setBankAccountName(entry.bankAccountName || "");
    setBankAccountNumber(entry.bankAccountNumber || "");
    setPaymentDate(new Date().toISOString().split("T")[0]);
    setPayReceiptFile(null);
    setPayOpen(true);
  };

  const resolveReceipt = async () => {
    if (receiptFile) return uploadReceipt(receiptFile);
    if (existingReceiptUrl) {
      return { receiptUrl: existingReceiptUrl, receiptFileName: existingReceiptName || "" };
    }
    return { receiptUrl: undefined, receiptFileName: undefined };
  };

  const handleSave = async () => {
    const parsedAmount = parseFloat(amount);
    if (!title.trim() || !taxType.trim() || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      toast({
        title: t("missingInformation"),
        description: t("taxNameAmountRequired"),
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const receipt = await resolveReceipt();
      const payment = buildFinancePaymentPayload(taxPaymentMethod, taxBankAccountName, taxBankAccountNumber, taxAccountId);
      const payload: Partial<TaxEntry> = {
        title: title.trim(),
        taxType: taxType.trim(),
        amount: parsedAmount,
        dueDate: buildDueDate(dueDate),
        period: period.trim() || undefined,
        authority: authority.trim() || undefined,
        referenceNumber: referenceNumber.trim() || undefined,
        note: note.trim() || undefined,
        ...payment,
        receiptUrl: receipt.receiptUrl,
        receiptFileName: receipt.receiptFileName || undefined,
      };

      if (editing) {
        await update({ ...editing, ...payload } as TaxEntry);
        toast({ title: t("taxRecorded"), description: t("changesSaved") });
      } else {
        await add(payload as TaxEntry);
        toast({ title: t("taxRecorded"), description: t("taxRecordedDesc") });
      }

      await refresh(true);
      window.dispatchEvent(new CustomEvent("taxes-should-refresh"));
      resetForm();
      setOpen(false);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t("saveTaxFailed");
      toast({ title: t("saveFailed"), description: message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleMarkPaid = async () => {
    if (!paying) return;
    const id = taxId(paying);
    setIsPaying(true);
    try {
      let receiptPayload: { receiptUrl?: string; receiptFileName?: string } = {};
      if (payReceiptFile) {
        receiptPayload = await uploadReceipt(payReceiptFile);
      }

      await taxApi.markPaid(id, {
        ...buildFinancePaymentPayload(paymentMethod, bankAccountName, bankAccountNumber, accountId),
        paymentDate: buildDueDate(paymentDate),
        ...receiptPayload,
      });

      await refresh(true);
      window.dispatchEvent(new CustomEvent("taxes-should-refresh"));
      window.dispatchEvent(new CustomEvent("expenses-should-refresh"));
      window.dispatchEvent(new CustomEvent("finance-should-refresh"));
      toast({ title: t("taxPaid"), description: t("taxPaidDesc") });
      resetPayForm();
      setPayOpen(false);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t("markTaxPaidFailed");
      toast({ title: t("saveFailed"), description: message, variant: "destructive" });
    } finally {
      setIsPaying(false);
    }
  };

  const handleDeleteRequest = (entry: TaxEntry) => {
    if (entry.status === "paid") return;
    requestDelete(entry);
  };

  const handleDeleteConfirm = async () => {
    const item = takeTarget();
    if (!item) return;
    const id = taxId(item);
    setIsDeleteDeleting(true);
    setDeletingId(id);
    try {
      await remove(item as TaxEntry);
      toast({ title: t("deleted"), description: t("taxRemovedDesc") });
      window.dispatchEvent(new CustomEvent("taxes-should-refresh"));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t("deleteTaxFailed");
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

    if (visibleTaxes.length === 0) {
      return (
        <div className="p-12 text-center text-muted-foreground">
          <p className="font-medium">{t("noTaxesYet")}</p>
          <p className="text-sm mt-1">{t("taxesEmptyHint")}</p>
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
              <th className={FINANCE_TH_CLASS}>{t("dueDate")}</th>
              <th className={FINANCE_TH_CLASS}>{t("taxType")}</th>
              <th className={FINANCE_TH_CLASS}>{`${t("taxes")} #`}</th>
              <th className={FINANCE_TH_CLASS}>{t("taxTitle")}</th>
              <th className={cn(FINANCE_TH_CLASS, "hidden md:table-cell")}>{t("taxAuthority")}</th>
              <th className={cn(FINANCE_TH_CLASS, "hidden lg:table-cell")}>{t("taxPeriod")}</th>
              <th className={FINANCE_TH_CLASS}>{t("billStatus")}</th>
              <th className={cn(FINANCE_TH_CLASS, "text-right")}>{t("amount")}</th>
              <th className={cn(FINANCE_TH_CLASS, "w-10 pr-4")} />
            </tr>
          </thead>
          <tbody className="bg-white">
            {visibleTaxes.map((entry, index) => {
              const id = taxId(entry);
              const isSelected = selectedIds.has(id);
              const pending = (entry.status || "pending") === "pending";
              const overdue = pending && isOverdue(entry.dueDate, entry.status);

              return (
                <tr
                  key={id}
                  className={cn(
                    "transition-colors hover:bg-gray-50/80",
                    isSelected && "bg-blue-50/40",
                  )}
                >
                  <td className={cn(FINANCE_TD_CLASS, "pl-4")}>
                    <FinanceTableCheckbox
                      checked={isSelected}
                      onCheckedChange={() => toggleSelectRow(id)}
                      ariaLabel={`Select ${entry.title}`}
                    />
                  </td>
                  <td className={cn(FINANCE_TD_CLASS, "text-gray-700 tabular-nums")}>
                    <span className="inline-flex items-center gap-1">
                      {overdue ? <AlertTriangle size={14} className="text-red-500 shrink-0" /> : null}
                      {formatFinanceTableDate(entry.dueDate)}
                    </span>
                  </td>
                  <td className={cn(FINANCE_TD_CLASS, "text-gray-600")}>{entry.taxType}</td>
                  <td className={FINANCE_TD_CLASS}>
                    <FinanceDocumentRefCell
                      entry={entry}
                      fallbackPrefix="tax"
                      id={id}
                      index={index}
                      readOnly={!entry.receiptUrl}
                    />
                  </td>
                  <td className={cn(FINANCE_TD_CLASS, "font-semibold text-gray-900 max-w-[180px] truncate")}>
                    {entry.title}
                  </td>
                  <td className={cn(FINANCE_TD_CLASS, "hidden md:table-cell text-gray-600 max-w-[140px] truncate")}>
                    {entry.authority || "—"}
                  </td>
                  <td className={cn(FINANCE_TD_CLASS, "hidden lg:table-cell text-gray-600")}>
                    {entry.period || "—"}
                  </td>
                  <td className={FINANCE_TD_CLASS}>
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                        pending
                          ? overdue
                            ? "bg-red-100 text-red-800"
                            : "bg-amber-100 text-amber-800"
                          : "bg-emerald-100 text-emerald-800",
                      )}
                    >
                      {pending ? (overdue ? t("overdue") : t("pending")) : t("paid")}
                    </span>
                  </td>
                  <td className={cn(FINANCE_TD_CLASS, "text-right font-medium tabular-nums text-rose-600")}>
                    <span className="inline-flex items-center justify-end gap-1">
                      <ArrowDown size={14} className="shrink-0" aria-hidden />
                      {Number(entry.amount).toLocaleString()} Rwf
                    </span>
                  </td>
                  <td className={cn(FINANCE_TD_CLASS, "pr-4 text-right")}>
                    <div className="flex items-center justify-end gap-1">
                      {entry.receiptUrl ? (
                        <button
                          type="button"
                          className="p-1 text-gray-400 hover:text-gray-600"
                          onClick={() => void openReceiptInNewTab(entry.receiptUrl!).catch(() => undefined)}
                          aria-label={t("viewReceipt")}
                        >
                          <Paperclip size={15} />
                        </button>
                      ) : null}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-gray-400 hover:text-gray-700"
                            disabled={deletingId === id}
                          >
                            {deletingId === id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <MoreVertical className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {pending ? (
                            <>
                              <DropdownMenuItem onClick={() => openPay(entry)}>
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                                {t("markAsPaid")}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openEdit(entry)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                {t("edit")}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => handleDeleteRequest(entry)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                {t("delete")}
                              </DropdownMenuItem>
                            </>
                          ) : (
                            <DropdownMenuItem onClick={() => openEdit(entry)} disabled>
                              <Pencil className="mr-2 h-4 w-4" />
                              {t("paid")}
                            </DropdownMenuItem>
                          )}
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

  return (
    <>
      <div className="mb-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="border border-gray-200 bg-white px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{t("outstandingTaxes")}</p>
          <p className="text-xl font-bold text-gray-900 tabular-nums mt-1">
            {metrics.outstanding.toLocaleString()} <span className="currency-code text-sm text-gray-500">Rwf</span>
          </p>
        </div>
        <div className="border border-gray-200 bg-white px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{t("dueToday")}</p>
          <p className="text-xl font-bold text-amber-700 tabular-nums mt-1">
            {metrics.dueTodayAmount.toLocaleString()} <span className="currency-code text-sm text-gray-500">Rwf</span>
          </p>
          <p className="text-xs text-gray-500 mt-0.5">{metrics.dueTodayCount} {t("taxObligations")}</p>
        </div>
        <div className="border border-gray-200 bg-white px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{t("dueWithin30Days")}</p>
          <p className="text-xl font-bold text-sky-700 tabular-nums mt-1">
            {metrics.dueSoonAmount.toLocaleString()} <span className="currency-code text-sm text-gray-500">Rwf</span>
          </p>
          <p className="text-xs text-gray-500 mt-0.5">{metrics.dueSoonCount} {t("taxObligations")}</p>
        </div>
        <div className="border border-gray-200 bg-white px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{t("overdue")}</p>
          <p className="text-xl font-bold text-red-600 tabular-nums mt-1">
            {metrics.overdueAmount.toLocaleString()} <span className="currency-code text-sm text-gray-500">Rwf</span>
          </p>
          <p className="text-xs text-gray-500 mt-0.5">{metrics.overdueCount} {t("taxObligations")}</p>
        </div>
      </div>

      <FinanceTableShell
        title={t("taxes")}
        onAdd={openCreate}
        addLabel={t("add")}
        onRefresh={() => void handleRefresh()}
        isRefreshing={isRefreshing}
      >
        {renderTable()}
      </FinanceTableShell>

      <Dialog open={open} onOpenChange={(next) => { if (!isSaving) { setOpen(next); if (!next) resetForm(); } }}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? t("editTax") : t("recordTax")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>{t("taxTitle")}</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t("taxExamplePlaceholder")}
                disabled={isSaving}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>{t("taxType")}</Label>
                <Select value={taxType} onValueChange={setTaxType} disabled={isSaving}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TAX_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>{t("amount")} (Rwf)</Label>
                <Input type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} disabled={isSaving} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>{t("dueDate")}</Label>
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} disabled={isSaving} />
              </div>
              <div className="space-y-1">
                <Label>{t("taxPeriod")}</Label>
                <Input
                  type="month"
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  disabled={isSaving}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>{t("taxAuthority")}</Label>
                <Input
                  value={authority}
                  onChange={(e) => setAuthority(e.target.value)}
                  placeholder={t("taxAuthorityPlaceholder")}
                  disabled={isSaving}
                />
              </div>
              <div className="space-y-1">
                <Label>{t("referenceNumber")}</Label>
                <Input
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  placeholder={t("referenceNumberPlaceholder")}
                  disabled={isSaving}
                />
              </div>
            </div>
            <PaymentDetailsFields
              paymentMethod={taxPaymentMethod}
              onPaymentMethodChange={setTaxPaymentMethod}
              bankAccountName={taxBankAccountName}
              onBankAccountNameChange={setTaxBankAccountName}
              bankAccountNumber={taxBankAccountNumber}
              onBankAccountNumberChange={setTaxBankAccountNumber}
              accountId={taxAccountId}
              onAccountIdChange={setTaxAccountId}
              disabled={isSaving}
            />
            <div className="space-y-1">
              <Label>{t("noteOptional")}</Label>
              <Input value={note} onChange={(e) => setNote(e.target.value)} disabled={isSaving} />
            </div>
            <ReceiptUploadField
              file={receiptFile}
              onFileChange={setReceiptFile}
              existingUrl={existingReceiptUrl}
              existingName={existingReceiptName}
              disabled={isSaving}
            />
          </div>
          <DialogFooter>
            <Button variant="cancel" onClick={() => setOpen(false)} disabled={isSaving}>{t("cancel")}</Button>
            <Button onClick={() => void handleSave()} disabled={isSaving}>
              {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t("saving")}</> : t("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={payOpen} onOpenChange={(next) => { if (!isPaying) { setPayOpen(next); if (!next) resetPayForm(); } }}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-md">
          <DialogHeader>
            <DialogTitle>{t("markAsPaid")}</DialogTitle>
          </DialogHeader>
          {paying ? (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                {paying.title} — <CurrencyAmount amount={Number(paying.amount)} codeFirst />
              </p>
              <p className="text-xs text-gray-500">{t("taxPaidHint")}</p>
              <div className="space-y-1">
                <Label>{t("date")}</Label>
                <Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} disabled={isPaying} />
              </div>
              <PaymentDetailsFields
                paymentMethod={paymentMethod}
                onPaymentMethodChange={setPaymentMethod}
                bankAccountName={bankAccountName}
                onBankAccountNameChange={setBankAccountName}
                bankAccountNumber={bankAccountNumber}
                onBankAccountNumberChange={setBankAccountNumber}
                accountId={accountId}
                onAccountIdChange={setAccountId}
                disabled={isPaying}
              />
              <ReceiptUploadField file={payReceiptFile} onFileChange={setPayReceiptFile} disabled={isPaying} />
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="cancel" onClick={() => setPayOpen(false)} disabled={isPaying}>{t("cancel")}</Button>
            <Button onClick={() => void handleMarkPaid()} disabled={isPaying}>
              {isPaying ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t("saving")}</> : t("markAsPaid")}
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
