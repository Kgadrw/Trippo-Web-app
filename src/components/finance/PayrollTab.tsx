import { useMemo, useState } from "react";
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
import { Plus, Loader2, MoreVertical, Pencil, Trash2, Paperclip } from "lucide-react";
import { cn } from "@/lib/utils";
import { ReceiptUploadField } from "@/components/finance/ReceiptUploadField";
import { PaymentDetailsFields, buildFinancePaymentPayload } from "@/components/finance/PaymentDetailsFields";
import { uploadReceipt, openReceiptInNewTab } from "@/lib/financeUpload";
import { filterByPageSearch } from "@/lib/pageSearch";
import { usePageSearch } from "@/hooks/usePageSearch";
import {
  FINANCE_TH_CLASS,
  FINANCE_TD_CLASS,
  formatFinanceTableDate,
  formatPaymentMode,
  FinanceDocumentRefCell,
  FinanceTableCheckbox,
  FinanceTableLoading,
  FinanceTableShell,
} from "@/components/finance/financeTable";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { useDeleteConfirm } from "@/hooks/useDeleteConfirm";

export interface PayrollEntry {
  id?: number;
  _id?: string;
  employeeName: string;
  amount: number;
  period: string;
  paymentDate: string;
  status?: "paid" | "pending";
  note?: string;
  paymentMethod?: string;
  bankAccountName?: string;
  bankAccountNumber?: string;
  accountId?: string;
  receiptUrl?: string;
  receiptFileName?: string;
}

function sortPayrolls(list: PayrollEntry[]) {
  const sorted = [...list];
  sorted.sort(
    (a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime(),
  );
  return sorted;
}

function payrollId(e: PayrollEntry): string {
  return String(e._id ?? e.id ?? "");
}

function currentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function buildPaymentDate(dateValue: string) {
  const now = new Date();
  const savedDate = new Date((dateValue || new Date().toISOString().split("T")[0]) + "T00:00:00");
  savedDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
  return savedDate.toISOString();
}

export function PayrollTab() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const { items: payrolls, isLoading, add, update, remove, refresh } = useApi<PayrollEntry>({
    endpoint: "payrolls",
    defaultValue: [],
  });

  const [employeeName, setEmployeeName] = useState("");
  const [amount, setAmount] = useState("");
  const [period, setPeriod] = useState(currentPeriod);
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [status, setStatus] = useState<"paid" | "pending">("paid");
  const [note, setNote] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("transfer");
  const [bankAccountName, setBankAccountName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [accountId, setAccountId] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [existingReceiptUrl, setExistingReceiptUrl] = useState<string | undefined>();
  const [existingReceiptName, setExistingReceiptName] = useState<string | undefined>();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PayrollEntry | null>(null);
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
  } = useDeleteConfirm<PayrollEntry>();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const sortedPayrolls = useMemo(() => sortPayrolls(payrolls), [payrolls]);
  const { query: pageSearchQuery } = usePageSearch();
  const visiblePayrolls = useMemo(
    () =>
      filterByPageSearch(sortedPayrolls, pageSearchQuery, (entry) => [
        entry.employeeName,
        entry.period,
        entry.note,
        entry.status,
      ]),
    [sortedPayrolls, pageSearchQuery],
  );

  const allSelected =
    visiblePayrolls.length > 0 && visiblePayrolls.every((e) => selectedIds.has(payrollId(e)));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(visiblePayrolls.map((e) => payrollId(e))));
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
    setEmployeeName("");
    setAmount("");
    setPeriod(currentPeriod());
    setPaymentDate(new Date().toISOString().split("T")[0]);
    setStatus("paid");
    setNote("");
    setPaymentMethod("transfer");
    setBankAccountName("");
    setBankAccountNumber("");
    setAccountId("");
    setReceiptFile(null);
    setExistingReceiptUrl(undefined);
    setExistingReceiptName(undefined);
    setEditing(null);
  };

  const openCreate = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (entry: PayrollEntry) => {
    setEditing(entry);
    setEmployeeName(entry.employeeName || "");
    setAmount(String(entry.amount ?? ""));
    setPeriod(entry.period || currentPeriod());
    setPaymentDate(String(entry.paymentDate || "").slice(0, 10) || new Date().toISOString().split("T")[0]);
    setStatus(entry.status === "pending" ? "pending" : "paid");
    setNote(entry.note || "");
    setPaymentMethod(entry.paymentMethod || "transfer");
    setBankAccountName(entry.bankAccountName || "");
    setBankAccountNumber(entry.bankAccountNumber || "");
    setAccountId(entry.accountId || "");
    setReceiptFile(null);
    setExistingReceiptUrl(entry.receiptUrl);
    setExistingReceiptName(entry.receiptFileName);
    setOpen(true);
  };

  const resolveReceipt = async () => {
    if (receiptFile) {
      return uploadReceipt(receiptFile);
    }
    if (existingReceiptUrl) {
      return { receiptUrl: existingReceiptUrl, receiptFileName: existingReceiptName || "" };
    }
    return { receiptUrl: undefined, receiptFileName: undefined };
  };

  const handleSave = async () => {
    const parsedAmount = parseFloat(amount);
    if (!employeeName.trim() || Number.isNaN(parsedAmount) || parsedAmount <= 0 || !period.trim()) {
      toast({
        title: t("missingInformation"),
        description: t("payrollNameAmountRequired"),
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const receipt = await resolveReceipt();
      const payment = buildFinancePaymentPayload(paymentMethod, bankAccountName, bankAccountNumber, accountId);
      const payload: Partial<PayrollEntry> = {
        employeeName: employeeName.trim(),
        amount: parsedAmount,
        period: period.trim(),
        paymentDate: buildPaymentDate(paymentDate),
        status,
        note: note.trim() || undefined,
        ...payment,
        receiptUrl: receipt.receiptUrl,
        receiptFileName: receipt.receiptFileName || undefined,
      };

      if (editing) {
        await update({ ...editing, ...payload } as PayrollEntry);
        toast({ title: t("payrollRecorded"), description: t("changesSaved") });
      } else {
        await add(payload as PayrollEntry);
        toast({ title: t("payrollRecorded"), description: t("payrollRecordedDesc") });
      }

      window.dispatchEvent(new CustomEvent("finance-should-refresh"));
      resetForm();
      setOpen(false);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t("savePayrollFailed");
      toast({ title: t("saveFailed"), description: message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    const item = takeTarget();
    if (!item) return;
    const id = payrollId(item);
    setIsDeleteDeleting(true);
    setDeletingId(id);
    try {
      await remove(item as PayrollEntry);
      toast({ title: t("deleted"), description: t("payrollRemovedDesc") });
      window.dispatchEvent(new CustomEvent("finance-should-refresh"));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t("deletePayrollFailed");
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
              <th className={FINANCE_TH_CLASS}>{t("payPeriod")}</th>
              <th className={FINANCE_TH_CLASS}>{`${t("payroll")} #`}</th>
              <th className={FINANCE_TH_CLASS}>{t("employeeName")}</th>
              <th className={cn(FINANCE_TH_CLASS, "hidden sm:table-cell")}>{t("payrollStatus")}</th>
              <th className={cn(FINANCE_TH_CLASS, "hidden md:table-cell")}>{t("paymentMethod")}</th>
              <th className={cn(FINANCE_TH_CLASS, "text-right")}>{t("amount")}</th>
              <th className={cn(FINANCE_TH_CLASS, "w-10 pr-4")} />
            </tr>
          </thead>
          <tbody className="bg-white">
            {visiblePayrolls.map((entry, index) => {
              const id = payrollId(entry);
              const isSelected = selectedIds.has(id);
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
                      ariaLabel={`Select ${entry.employeeName}`}
                    />
                  </td>
                  <td className={cn(FINANCE_TD_CLASS, "text-gray-700 tabular-nums")}>
                    {formatFinanceTableDate(entry.paymentDate)}
                  </td>
                  <td className={cn(FINANCE_TD_CLASS, "text-gray-600")}>{entry.period || "—"}</td>
                  <td className={FINANCE_TD_CLASS}>
                    <FinanceDocumentRefCell
                      entry={entry}
                      fallbackPrefix="payroll"
                      id={id}
                      index={index}
                      onEdit={() => openEdit(entry)}
                    />
                  </td>
                  <td className={cn(FINANCE_TD_CLASS, "font-semibold text-gray-900 max-w-[180px] truncate")}>
                    {entry.employeeName}
                  </td>
                  <td className={cn(FINANCE_TD_CLASS, "hidden sm:table-cell")}>
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                        entry.status === "pending"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-emerald-100 text-emerald-800",
                      )}
                    >
                      {entry.status === "pending" ? t("pending") : t("paid")}
                    </span>
                  </td>
                  <td className={cn(FINANCE_TD_CLASS, "hidden md:table-cell text-gray-600")}>
                    {formatPaymentMode(entry.paymentMethod, t)}
                  </td>
                  <td className={cn(FINANCE_TD_CLASS, "text-right font-medium tabular-nums text-violet-700")}>
                    -{Number(entry.amount).toLocaleString()} Rwf
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
                          <DropdownMenuItem onClick={() => openEdit(entry)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            {t("edit")}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => requestDelete(entry)}
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

  return (
    <>
      <FinanceTableShell
        title={t("payroll")}
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
            <DialogTitle>{editing ? t("editPayroll") : t("recordPayroll")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>{t("employeeName")}</Label>
              <Input value={employeeName} onChange={(e) => setEmployeeName(e.target.value)} disabled={isSaving} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>{t("amount")} (Rwf)</Label>
                <Input type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} disabled={isSaving} />
              </div>
              <div className="space-y-1">
                <Label>{t("payPeriod")}</Label>
                <Input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} disabled={isSaving} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>{t("date")}</Label>
                <Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} disabled={isSaving} />
              </div>
              <div className="space-y-1">
                <Label>{t("payrollStatus")}</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as "paid" | "pending")} disabled={isSaving}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paid">{t("paid")}</SelectItem>
                    <SelectItem value="pending">{t("pending")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
              disabled={isSaving}
            />
            <div className="space-y-1">
              <Label>{t("noteOptional")}</Label>
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("expenseNotePlaceholder")} disabled={isSaving} />
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

      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={handleDeleteOpenChange}
        title={t("deleteConfirmTitle")}
        description={t("deleteConfirmDesc").replace("{name}", deleteTarget?.employeeName ?? "")}
        confirmLabel={t("delete")}
        cancelLabel={t("cancel")}
        deletingLabel={t("deleting")}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleteDeleting}
      />
    </>
  );
}
