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
import { Plus, Loader2, MoreVertical, Pencil, Trash2, ChevronDown, RefreshCw, Paperclip } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { ReceiptUploadField } from "@/components/finance/ReceiptUploadField";
import { PaymentDetailsFields, buildFinancePaymentPayload } from "@/components/finance/PaymentDetailsFields";
import { uploadReceipt, openReceiptInNewTab } from "@/lib/financeUpload";
import { FinanceDocumentRefCell, FinanceTableCheckbox } from "@/components/finance/financeTable";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { useDeleteConfirm } from "@/hooks/useDeleteConfirm";
import { filterByPageSearch } from "@/lib/pageSearch";
import { usePageSearch } from "@/hooks/usePageSearch";
import { HelpTip } from "@/components/ui/help-tip";

export interface IncomeEntry {
  id?: number;
  _id?: string;
  title: string;
  amount: number;
  category?: string;
  source?: string;
  date: string;
  note?: string;
  paymentMethod?: string;
  bankAccountName?: string;
  bankAccountNumber?: string;
  accountId?: string;
  receiptUrl?: string;
  receiptFileName?: string;
}

type IncomeSort = "date-desc" | "date-asc" | "title-asc" | "amount-desc";

function sortIncomes(list: IncomeEntry[], sortBy: IncomeSort) {
  const sorted = [...list];
  sorted.sort((a, b) => {
    switch (sortBy) {
      case "date-asc":
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      case "title-asc":
        return (a.title || "").localeCompare(b.title || "");
      case "amount-desc":
        return (Number(b.amount) || 0) - (Number(a.amount) || 0);
      default:
        return new Date(b.date).getTime() - new Date(a.date).getTime();
    }
  });
  return sorted;
}

function incomeId(e: IncomeEntry): string {
  return String(e._id ?? e.id ?? "");
}

function buildIncomeDate(dateValue: string) {
  const now = new Date();
  const savedDate = new Date((dateValue || new Date().toISOString().split("T")[0]) + "T00:00:00");
  savedDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
  return savedDate.toISOString();
}

function formatIncomeTableDate(dateStr: string) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function formatPaymentMode(method: string | undefined, t: (key: string) => string) {
  const map: Record<string, string> = {
    cash: t("cash"),
    momo: t("momoPay"),
    airtel: t("airtelPay"),
    card: t("card"),
    transfer: t("bankTransfer"),
    other: t("other"),
  };
  return map[method || ""] || method || "—";
}

const thClass =
  "px-3 py-2.5 text-left text-[11px] font-medium uppercase tracking-wide text-gray-400 whitespace-nowrap bg-sidebar";
const tdClass = "px-3 py-2.5 text-sm text-gray-800 align-middle";

export function IncomeTab() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const { items: incomes, isLoading, add, update, remove, refresh } = useApi<IncomeEntry>({
    endpoint: "incomes",
    defaultValue: [],
  });

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("general");
  const [source, setSource] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [note, setNote] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [bankAccountName, setBankAccountName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [accountId, setAccountId] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [existingReceiptUrl, setExistingReceiptUrl] = useState<string | undefined>();
  const [existingReceiptName, setExistingReceiptName] = useState<string | undefined>();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<IncomeEntry | null>(null);
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
  } = useDeleteConfirm<IncomeEntry>();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const sortedIncomes = useMemo(() => sortIncomes(incomes, "date-desc"), [incomes]);
  const { query: pageSearchQuery } = usePageSearch();
  const visibleIncomes = useMemo(
    () =>
      filterByPageSearch(sortedIncomes, pageSearchQuery, (entry) => [
        entry.title,
        entry.category,
        entry.source,
        entry.note,
        entry.paymentMethod,
      ]),
    [sortedIncomes, pageSearchQuery],
  );

  const allSelected =
    visibleIncomes.length > 0 && visibleIncomes.every((e) => selectedIds.has(incomeId(e)));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(visibleIncomes.map((e) => incomeId(e))));
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
    setCategory("general");
    setSource("");
    setDate(new Date().toISOString().split("T")[0]);
    setNote("");
    setPaymentMethod("cash");
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

  const openEdit = (entry: IncomeEntry) => {
    setEditing(entry);
    setTitle(entry.title || "");
    setAmount(String(entry.amount ?? ""));
    setCategory(entry.category || "general");
    setSource(entry.source || "");
    setDate(String(entry.date || "").slice(0, 10) || new Date().toISOString().split("T")[0]);
    setNote(entry.note || "");
    setPaymentMethod(entry.paymentMethod || "cash");
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
      const uploaded = await uploadReceipt(receiptFile);
      return uploaded;
    }
    if (existingReceiptUrl) {
      return { receiptUrl: existingReceiptUrl, receiptFileName: existingReceiptName || "" };
    }
    return { receiptUrl: undefined, receiptFileName: undefined };
  };

  const handleSave = async () => {
    const parsedAmount = parseFloat(amount);
    if (!title.trim() || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      toast({
        title: t("missingInformation"),
        description: t("incomeNameAmountRequired"),
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const receipt = await resolveReceipt();
      const payment = buildFinancePaymentPayload(paymentMethod, bankAccountName, bankAccountNumber, accountId);
      const payload: Partial<IncomeEntry> = {
        title: title.trim(),
        amount: parsedAmount,
        category: category.trim() || "general",
        source: source.trim() || category.trim() || "general",
        date: buildIncomeDate(date),
        note: note.trim() || undefined,
        ...payment,
        receiptUrl: receipt.receiptUrl,
        receiptFileName: receipt.receiptFileName || undefined,
      };

      if (editing) {
        await update({ ...editing, ...payload } as IncomeEntry);
        toast({ title: t("incomeRecorded"), description: t("changesSaved") });
      } else {
        await add(payload as IncomeEntry);
        toast({ title: t("incomeRecorded"), description: t("incomeRecordedDesc") });
      }

      window.dispatchEvent(new CustomEvent("finance-should-refresh"));
      resetForm();
      setOpen(false);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t("saveIncomeFailed");
      toast({ title: t("saveFailed"), description: message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    const item = takeTarget();
    if (!item) return;
    const id = incomeId(item);
    setIsDeleteDeleting(true);
    setDeletingId(id);
    try {
      await remove(item as IncomeEntry);
      toast({ title: t("deleted"), description: t("incomeRemovedDesc") });
      window.dispatchEvent(new CustomEvent("finance-should-refresh"));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t("deleteIncomeFailed");
      toast({ title: t("error"), description: message, variant: "destructive" });
    } finally {
      setDeletingId(null);
      setIsDeleteDeleting(false);
    }
  };

  const renderTable = () => {
    if (isLoading) {
      return (
        <div className="divide-y divide-gray-100">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse">
          <thead>
            <tr>
              <th className={cn(thClass, "w-10 pl-4")}>
                <FinanceTableCheckbox
                  checked={allSelected}
                  onCheckedChange={toggleSelectAll}
                  ariaLabel="Select all"
                />
              </th>
              <th className={thClass}>{t("date")}</th>
              <th className={thClass}>{t("incomeSource")}</th>
              <th className={thClass}>{`${t("income")} #`}</th>
              <th className={cn(thClass, "hidden md:table-cell")}>{t("category")}</th>
              <th className={thClass}>{t("incomeTitle")}</th>
              <th className={cn(thClass, "hidden sm:table-cell")}>{t("paymentMethod")}</th>
              <th className={cn(thClass, "text-right")}>{t("amount")}</th>
              <th className={cn(thClass, "w-10 pr-4")} />
            </tr>
          </thead>
          <tbody className="bg-white">
            {visibleIncomes.map((entry, index) => {
              const id = incomeId(entry);
              const isSelected = selectedIds.has(id);
              return (
                <tr
                  key={id}
                  className={cn(
                    "transition-colors hover:bg-gray-50/80",
                    isSelected && "bg-blue-50/40",
                  )}
                >
                  <td className={cn(tdClass, "pl-4")}>
                    <FinanceTableCheckbox
                      checked={isSelected}
                      onCheckedChange={() => toggleSelectRow(id)}
                      ariaLabel={`Select ${entry.title}`}
                    />
                  </td>
                  <td className={cn(tdClass, "text-gray-700 tabular-nums")}>
                    {formatIncomeTableDate(entry.date)}
                  </td>
                  <td className={cn(tdClass, "text-gray-600")}>
                    {entry.source || entry.category || "—"}
                  </td>
                  <td className={tdClass}>
                    <FinanceDocumentRefCell
                      entry={entry}
                      fallbackPrefix="income"
                      id={id}
                      index={index}
                      onEdit={() => openEdit(entry)}
                    />
                  </td>
                  <td className={cn(tdClass, "hidden md:table-cell text-gray-600")}>
                    {entry.category || "—"}
                  </td>
                  <td className={cn(tdClass, "font-semibold text-gray-900 max-w-[180px] truncate")}>
                    {entry.title}
                  </td>
                  <td className={cn(tdClass, "hidden sm:table-cell text-gray-600")}>
                    {formatPaymentMode(entry.paymentMethod, t)}
                  </td>
                  <td className={cn(tdClass, "text-right font-medium tabular-nums text-gray-900")}>
                    {Number(entry.amount).toLocaleString()} Rwf
                  </td>
                  <td className={cn(tdClass, "pr-4 text-right")}>
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
      <div className="overflow-hidden bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              className="inline-flex items-center gap-1 text-[15px] font-semibold text-gray-800 hover:text-gray-900"
            >
              {t("income")}
              <ChevronDown size={16} className="text-primary" />
            </button>
            <HelpTip text={t("helpIncome")} />
          </div>

          <div className="flex items-center gap-2">
            <Button
              className="h-9 gap-1.5 rounded-none bg-primary px-4 text-white hover:bg-sky-500"
              onClick={openCreate}
            >
              <Plus size={16} />
              {t("add")}
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-none border-gray-200"
              onClick={() => void handleRefresh()}
              disabled={isRefreshing}
              aria-label="Refresh"
            >
              <RefreshCw size={16} className={cn(isRefreshing && "animate-spin")} />
            </Button>
          </div>
        </div>

        {renderTable()}
      </div>

      <Dialog open={open} onOpenChange={(next) => { if (!isSaving) { setOpen(next); if (!next) resetForm(); } }}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? t("editIncome") : t("recordIncome")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>{t("incomeTitle")}</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("incomeExamplePlaceholder")} disabled={isSaving} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>{t("amount")} (Rwf)</Label>
                <Input type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} disabled={isSaving} />
              </div>
              <div className="space-y-1">
                <Label>{t("date")}</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} disabled={isSaving} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>{t("incomeSource")}</Label>
                <Input value={source} onChange={(e) => setSource(e.target.value)} placeholder={t("incomeSourcePlaceholder")} disabled={isSaving} />
              </div>
              <div className="space-y-1">
                <Label>{t("category")}</Label>
                <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder={t("expenseCategoryPlaceholder")} disabled={isSaving} />
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
