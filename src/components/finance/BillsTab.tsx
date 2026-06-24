import { useMemo, useState } from "react";
import { useApi } from "@/hooks/useApi";
import { billApi } from "@/lib/api";
import { CurrencyAmount } from "@/lib/currency";
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
import { Plus, Loader2, MoreVertical, Pencil, Trash2, FileText, CheckCircle2, ChevronDown, LayoutList, LayoutGrid, Search, AlertTriangle, ArrowUp, RefreshCw } from "lucide-react";
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
  getFinanceDocumentRef,
  FinanceDocumentRefCell,
  FinanceTableCheckbox,
  FinanceTableLoading,
} from "@/components/finance/financeTable";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { useDeleteConfirm } from "@/hooks/useDeleteConfirm";
import { HelpTip } from "@/components/ui/help-tip";

export interface BillEntry {
  id?: number;
  _id?: string;
  title: string;
  amount: number;
  vendor?: string;
  vendorId?: string;
  category?: string;
  dueDate: string;
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

function billId(e: BillEntry): string {
  return String(e._id ?? e.id ?? "");
}

function buildDueDate(dateValue: string) {
  const now = new Date();
  const savedDate = new Date((dateValue || new Date().toISOString().split("T")[0]) + "T00:00:00");
  savedDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
  return savedDate.toISOString();
}

function isOverdue(dueDate: string) {
  const due = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return due < today;
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function formatBillAmount(amount: number) {
  return `Rwf ${Math.round(Number(amount) || 0).toLocaleString()}`;
}

function billDateLabel(entry: BillEntry) {
  const raw = entry.status === "paid" && entry.paidAt ? entry.paidAt : entry.dueDate;
  return formatFinanceTableDate(raw);
}

function billStatus(entry: BillEntry) {
  const pending = (entry.status || "pending") === "pending";
  if (!pending) return { label: "PAID", className: "text-emerald-600 font-medium" };
  if (isOverdue(entry.dueDate)) return { label: "OVERDUE", className: "text-red-600 font-medium" };
  return { label: "OPEN", className: "text-blue-600 font-medium" };
}

function balanceDue(entry: BillEntry) {
  return (entry.status || "pending") === "pending" ? Number(entry.amount) || 0 : 0;
}

export function BillsTab() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const { items: bills, isLoading, add, update, remove, refresh } = useApi<BillEntry>({
    endpoint: "bills",
    defaultValue: [],
  });
  const { items: vendorList } = useApi<{ _id?: string; id?: number; name: string }>({
    endpoint: "vendors",
    defaultValue: [],
  });

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [category, setCategory] = useState("bills");
  const [dueDate, setDueDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [note, setNote] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [existingReceiptUrl, setExistingReceiptUrl] = useState<string | undefined>();
  const [existingReceiptName, setExistingReceiptName] = useState<string | undefined>();
  const [open, setOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [editing, setEditing] = useState<BillEntry | null>(null);
  const [paying, setPaying] = useState<BillEntry | null>(null);
  const [billPaymentMethod, setBillPaymentMethod] = useState("cash");
  const [billBankAccountName, setBillBankAccountName] = useState("");
  const [billBankAccountNumber, setBillBankAccountNumber] = useState("");
  const [billAccountId, setBillAccountId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [bankAccountName, setBankAccountName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [accountId, setAccountId] = useState("");
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [payReceiptFile, setPayReceiptFile] = useState<File | null>(null);
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
  } = useDeleteConfirm<BillEntry>();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const { query: pageSearchQuery } = usePageSearch();

  const metrics = useMemo(() => {
    const today = startOfDay(new Date());
    const in30 = new Date(today);
    in30.setDate(in30.getDate() + 30);

    let totalOutstanding = 0;
    let dueToday = 0;
    let dueWithin30 = 0;
    let overdueTotal = 0;

    for (const bill of bills) {
      if ((bill.status || "pending") !== "pending") continue;
      const amt = Number(bill.amount) || 0;
      totalOutstanding += amt;
      const due = startOfDay(new Date(bill.dueDate));
      const dueMs = due.getTime();
      const todayMs = today.getTime();
      const in30Ms = in30.getTime();

      if (dueMs === todayMs) dueToday += amt;
      else if (dueMs < todayMs) overdueTotal += amt;
      else if (dueMs <= in30Ms) dueWithin30 += amt;
    }

    return { totalOutstanding, dueToday, dueWithin30, overdueTotal };
  }, [bills]);

  const sortedBills = useMemo(() => {
    const list = [...bills];
    list.sort((a, b) => {
      const aPending = (a.status || "pending") === "pending";
      const bPending = (b.status || "pending") === "pending";
      if (aPending !== bPending) return aPending ? -1 : 1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });
    return list;
  }, [bills]);

  const filteredBills = useMemo(() => {
    return filterByPageSearch(sortedBills, pageSearchQuery, (entry) => {
      const id = billId(entry);
      const ref = getFinanceDocumentRef(entry, "bill", id, 0);
      return [entry.title, entry.vendor, entry.note, ref];
    });
  }, [sortedBills, pageSearchQuery]);

  const allSelected =
    sortedBills.length > 0 && sortedBills.every((e) => selectedIds.has(billId(e)));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(sortedBills.map((e) => billId(e))));
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
    setVendorId("");
    setCategory("bills");
    setDueDate(new Date().toISOString().split("T")[0]);
    setNote("");
    setBillPaymentMethod("cash");
    setBillBankAccountName("");
    setBillBankAccountNumber("");
    setReceiptFile(null);
    setExistingReceiptUrl(undefined);
    setExistingReceiptName(undefined);
    setEditing(null);
  };

  const resetPayForm = () => {
    setPaying(null);
    setPaymentMethod("cash");
    setBankAccountName("");
    setBankAccountNumber("");
    setPaymentDate(new Date().toISOString().split("T")[0]);
    setPayReceiptFile(null);
  };

  const openCreate = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (entry: BillEntry) => {
    setEditing(entry);
    setTitle(entry.title || "");
    setAmount(String(entry.amount ?? ""));
    setVendorId(entry.vendorId ? String(entry.vendorId) : "");
    setCategory(entry.category || "bills");
    setDueDate(String(entry.dueDate || "").slice(0, 10) || new Date().toISOString().split("T")[0]);
    setNote(entry.note || "");
    setBillPaymentMethod(entry.paymentMethod || "cash");
    setBillBankAccountName(entry.bankAccountName || "");
    setBillBankAccountNumber(entry.bankAccountNumber || "");
    setReceiptFile(null);
    setExistingReceiptUrl(entry.receiptUrl);
    setExistingReceiptName(entry.receiptFileName);
    setOpen(true);
  };

  const openPay = (entry: BillEntry) => {
    setPaying(entry);
    setPaymentMethod(entry.paymentMethod || "cash");
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
    if (!title.trim() || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      toast({
        title: t("missingInformation"),
        description: t("billNameAmountRequired"),
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const receipt = await resolveReceipt();
      const payment = buildFinancePaymentPayload(billPaymentMethod, billBankAccountName, billBankAccountNumber, billAccountId);
      const payload: Partial<BillEntry> = {
        title: title.trim(),
        amount: parsedAmount,
        vendorId: vendorId || undefined,
        category: category.trim() || "bills",
        dueDate: buildDueDate(dueDate),
        note: note.trim() || undefined,
        ...payment,
        receiptUrl: receipt.receiptUrl,
        receiptFileName: receipt.receiptFileName || undefined,
      };

      if (editing) {
        await update({ ...editing, ...payload } as BillEntry);
        toast({ title: t("billRecorded"), description: t("changesSaved") });
      } else {
        await add(payload as BillEntry);
        toast({ title: t("billRecorded"), description: t("billRecordedDesc") });
      }

      window.dispatchEvent(new CustomEvent("finance-should-refresh"));
      resetForm();
      setOpen(false);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t("saveBillFailed");
      toast({ title: t("saveFailed"), description: message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleMarkPaid = async () => {
    if (!paying) return;
    const id = billId(paying);
    setIsPaying(true);
    try {
      let receiptPayload: { receiptUrl?: string; receiptFileName?: string } = {};
      if (payReceiptFile) {
        receiptPayload = await uploadReceipt(payReceiptFile);
      }

      await billApi.markPaid(id, {
        ...buildFinancePaymentPayload(paymentMethod, bankAccountName, bankAccountNumber, accountId),
        paymentDate: buildDueDate(paymentDate),
        ...receiptPayload,
      });

      window.dispatchEvent(new CustomEvent("expenses-should-refresh"));
      window.dispatchEvent(new CustomEvent("finance-should-refresh"));
      toast({ title: t("billPaid"), description: t("billPaidDesc") });
      resetPayForm();
      setPayOpen(false);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t("markBillPaidFailed");
      toast({ title: t("saveFailed"), description: message, variant: "destructive" });
    } finally {
      setIsPaying(false);
    }
  };

  const handleDeleteRequest = (entry: BillEntry) => {
    if (entry.status === "paid") return;
    requestDelete(entry);
  };

  const handleDeleteConfirm = async () => {
    const item = takeTarget();
    if (!item) return;
    const id = billId(item);
    setIsDeleteDeleting(true);
    setDeletingId(id);
    try {
      await remove(item as BillEntry);
      toast({ title: t("deleted"), description: t("billRemovedDesc") });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t("deleteBillFailed");
      toast({ title: t("error"), description: message, variant: "destructive" });
    } finally {
      setDeletingId(null);
      setIsDeleteDeleting(false);
    }
  };

  const renderListTable = () => {
    if (isLoading) {
      return <FinanceTableLoading />;
    }

    if (filteredBills.length === 0) {
      return (
        <div className="px-6 py-16 text-center text-sm text-gray-500">
          {pageSearchQuery.trim() ? "No bills match your search." : t("noBillsYet") || "No bills yet."}
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px] border-collapse">
          <thead>
            <tr className="border-b border-gray-200">
              <th className={cn(FINANCE_TH_CLASS, "w-10 pl-4")}>
                <FinanceTableCheckbox
                  checked={allSelected}
                  onCheckedChange={toggleSelectAll}
                  ariaLabel="Select all"
                />
              </th>
              <th className={FINANCE_TH_CLASS}>Date</th>
              <th className={FINANCE_TH_CLASS}>Bill#</th>
              <th className={FINANCE_TH_CLASS}>Reference Number</th>
              <th className={FINANCE_TH_CLASS}>Vendor Name</th>
              <th className={FINANCE_TH_CLASS}>Status</th>
              <th className={FINANCE_TH_CLASS}>Due Date</th>
              <th className={cn(FINANCE_TH_CLASS, "text-right")}>Amount</th>
              <th className={cn(FINANCE_TH_CLASS, "text-right pr-4")}>Balance Due</th>
              <th className={cn(FINANCE_TH_CLASS, "w-10 pr-4")} />
            </tr>
          </thead>
          <tbody className="bg-white">
            {filteredBills.map((entry, index) => {
              const id = billId(entry);
              const isSelected = selectedIds.has(id);
              const pending = (entry.status || "pending") === "pending";
              const overdue = pending && isOverdue(entry.dueDate);
              const status = billStatus(entry);
              const due = balanceDue(entry);
              return (
                <tr
                  key={id}
                  className={cn(
                    "border-b border-gray-100 transition-colors hover:bg-gray-50/80",
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
                  <td className={cn(FINANCE_TD_CLASS, "text-gray-700 tabular-nums whitespace-nowrap")}>
                    {billDateLabel(entry)}
                  </td>
                  <td className={FINANCE_TD_CLASS}>
                    <div className="flex items-center gap-1.5">
                      <FinanceDocumentRefCell
                        entry={entry}
                        fallbackPrefix="bill"
                        id={id}
                        index={index}
                        onEdit={pending ? () => openEdit(entry) : undefined}
                        readOnly={!pending && !entry.receiptUrl}
                      />
                      {overdue ? (
                        <AlertTriangle size={14} className="shrink-0 text-amber-500" aria-label="Overdue" />
                      ) : null}
                    </div>
                  </td>
                  <td className={cn(FINANCE_TD_CLASS, "text-gray-600 max-w-[140px] truncate")}>
                    {entry.note || "—"}
                  </td>
                  <td className={cn(FINANCE_TD_CLASS, "text-gray-800")}>
                    {entry.vendor || "—"}
                  </td>
                  <td className={FINANCE_TD_CLASS}>
                    <span className={cn("text-xs uppercase tracking-wide", status.className)}>
                      {status.label}
                    </span>
                  </td>
                  <td className={cn(FINANCE_TD_CLASS, "text-gray-700 tabular-nums whitespace-nowrap")}>
                    {formatFinanceTableDate(entry.dueDate)}
                  </td>
                  <td className={cn(FINANCE_TD_CLASS, "text-right font-medium tabular-nums text-gray-900 whitespace-nowrap")}>
                    {formatBillAmount(entry.amount)}
                  </td>
                  <td className={cn(FINANCE_TD_CLASS, "text-right font-medium tabular-nums text-gray-900 whitespace-nowrap pr-4")}>
                    {formatBillAmount(due)}
                  </td>
                  <td className={cn(FINANCE_TD_CLASS, "pr-4 text-right")}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-none text-gray-400 hover:text-gray-700"
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
                        {pending && (
                          <DropdownMenuItem onClick={() => openPay(entry)}>
                            <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-600" />
                            {t("markAsPaid")}
                          </DropdownMenuItem>
                        )}
                        {pending && (
                          <DropdownMenuItem onClick={() => openEdit(entry)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            {t("edit")}
                          </DropdownMenuItem>
                        )}
                        {entry.receiptUrl && (
                          <DropdownMenuItem onClick={() => void openReceiptInNewTab(entry.receiptUrl!).catch(() => undefined)}>
                            <FileText className="mr-2 h-4 w-4" />
                            {t("viewReceipt")}
                          </DropdownMenuItem>
                        )}
                        {pending && (
                          <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteRequest(entry)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            {t("delete")}
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const renderGrid = () => {
    if (isLoading) return <FinanceTableLoading />;
    if (filteredBills.length === 0) {
      return (
        <div className="px-6 py-16 text-center text-sm text-gray-500">
          {pageSearchQuery.trim() ? "No bills match your search." : t("noBillsYet") || "No bills yet."}
        </div>
      );
    }

    return (
      <div className="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3">
        {filteredBills.map((entry, index) => {
          const id = billId(entry);
          const pending = (entry.status || "pending") === "pending";
          const status = billStatus(entry);
          const ref = getFinanceDocumentRef(entry, "bill", id, index);
          return (
            <div key={id} className="border border-gray-200 bg-white p-4">
              <div className="flex items-start justify-between gap-2">
                {ref ? (
                  <button
                    type="button"
                    onClick={() =>
                      entry.receiptUrl
                        ? void openReceiptInNewTab(entry.receiptUrl).catch(() => undefined)
                        : pending
                          ? openEdit(entry)
                          : undefined
                    }
                    className="text-sm font-medium text-primary hover:underline truncate"
                  >
                    {ref}
                  </button>
                ) : (
                  <span />
                )}
                <span className={cn("text-[10px] uppercase tracking-wide shrink-0", status.className)}>
                  {status.label}
                </span>
              </div>
              <p className="mt-2 text-sm font-semibold text-gray-900 truncate">{entry.vendor || "—"}</p>
              <p className="mt-1 text-xs text-gray-500 truncate">{entry.title}</p>
              <div className="mt-4 flex items-end justify-between gap-2">
                <div>
                  <p className="text-[10px] uppercase text-gray-400">Due</p>
                  <p className="text-sm text-gray-700">{formatFinanceTableDate(entry.dueDate)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">
                    <CurrencyAmount amount={entry.amount} codeFirst />
                  </p>
                  {pending ? (
                    <p className="text-xs text-gray-500">Due {formatBillAmount(balanceDue(entry))}</p>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div>
      <div className="overflow-hidden border border-gray-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-4 py-3">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              className="inline-flex items-center gap-1 text-[15px] font-semibold text-gray-800 hover:text-gray-900"
            >
              All Bills
              <ChevronDown size={16} className="text-primary" />
            </button>
            <HelpTip text={t("helpBills")} />
          </div>

          <div className="flex items-center gap-2">
            <Button
              className="h-9 gap-1.5 rounded-none bg-primary px-4 text-white hover:bg-sky-500"
              onClick={openCreate}
            >
              <Plus size={16} />
              New
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
            <div className="inline-flex border border-gray-200">
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={cn(
                  "flex h-9 w-9 items-center justify-center",
                  viewMode === "list" ? "bg-gray-100 text-gray-900" : "bg-white text-gray-500 hover:text-gray-700",
                )}
                aria-label="List view"
              >
                <LayoutList size={16} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={cn(
                  "flex h-9 w-9 items-center justify-center border-l border-gray-200",
                  viewMode === "grid" ? "bg-gray-100 text-gray-900" : "bg-white text-gray-500 hover:text-gray-700",
                )}
                aria-label="Grid view"
              >
                <LayoutGrid size={16} />
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 border-b border-gray-200 lg:grid-cols-4">
          <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-5 lg:border-b-0 lg:border-r">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-600">
              <ArrowUp size={18} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Outstanding Payables</p>
              <p className="mt-0.5 text-base font-semibold text-gray-900">
                <CurrencyAmount amount={metrics.totalOutstanding} codeFirst />
              </p>
            </div>
          </div>
          <div className="border-b border-gray-100 px-4 py-5 lg:border-b-0 lg:border-r">
            <p className="text-sm text-gray-500">Due Today</p>
            <p className="mt-1 text-base font-semibold text-gray-900">
              <CurrencyAmount amount={metrics.dueToday} codeFirst />
            </p>
          </div>
          <div className="border-r border-gray-100 px-4 py-5">
            <p className="text-sm text-gray-500">Due Within 30 Days</p>
            <p className="mt-1 text-base font-semibold text-gray-900">
              <CurrencyAmount amount={metrics.dueWithin30} codeFirst />
            </p>
          </div>
          <div className="px-4 py-5">
            <p className="text-sm text-gray-500">OverDue Bills</p>
            <p className="mt-1 text-base font-semibold text-red-600">
              <CurrencyAmount amount={metrics.overdueTotal} codeFirst codeClassName="text-red-600/70" />
            </p>
          </div>
        </div>

        {viewMode === "list" ? renderListTable() : renderGrid()}
      </div>

      <Dialog open={open} onOpenChange={(next) => { if (!isSaving) { setOpen(next); if (!next) resetForm(); } }}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? t("editBill") : t("recordBill")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>{t("billTitle")}</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("billExamplePlaceholder")} disabled={isSaving} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>{t("amount")} (Rwf)</Label>
                <Input type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} disabled={isSaving} />
              </div>
              <div className="space-y-1">
                <Label>{t("dueDate")}</Label>
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} disabled={isSaving} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>{t("vendor")}</Label>
                <Select value={vendorId || "none"} onValueChange={(v) => setVendorId(v === "none" ? "" : v)} disabled={isSaving}>
                  <SelectTrigger><SelectValue placeholder={t("selectVendor")} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t("other")}</SelectItem>
                    {vendorList.map((v) => (
                      <SelectItem key={String(v._id ?? v.id)} value={String(v._id ?? v.id)}>{v.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>{t("category")}</Label>
                <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder={t("expenseCategoryPlaceholder")} disabled={isSaving} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>{t("noteOptional")}</Label>
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("expenseNotePlaceholder")} disabled={isSaving} />
            </div>
            <PaymentDetailsFields
              paymentMethod={billPaymentMethod}
              onPaymentMethodChange={setBillPaymentMethod}
              bankAccountName={billBankAccountName}
              onBankAccountNameChange={setBillBankAccountName}
              bankAccountNumber={billBankAccountNumber}
              onBankAccountNumberChange={setBillBankAccountNumber}
              accountId={billAccountId}
              onAccountIdChange={setBillAccountId}
              disabled={isSaving}
            />
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
          {paying && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                {paying.title} — <CurrencyAmount amount={Number(paying.amount)} codeFirst />
              </p>
              <p className="text-xs text-muted-foreground">{t("billPaidHint")}</p>
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
          )}
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
    </div>
  );
}
