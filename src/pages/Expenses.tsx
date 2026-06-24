import { useMemo, useState } from "react";

import { AppLayout } from "@/components/layout/AppLayout";

import { useApi } from "@/hooks/useApi";

import { Button } from "@/components/ui/button";

import { Input, searchBarInputClass } from "@/components/ui/input";

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
  filterSelectClass,

} from "@/components/ui/select";

import {

  DropdownMenu,

  DropdownMenuContent,

  DropdownMenuItem,

  DropdownMenuTrigger,

} from "@/components/ui/dropdown-menu";

import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";

import { Trash2, Plus, Loader2, MoreVertical, Pencil, Search, ArrowUpDown, ArrowDown, X, Receipt, FileText, Paperclip } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";

import { cn, formatDateWithTime } from "@/lib/utils";
import { MobileListSearchFilters } from "@/components/ui/mobile-list-search-filters";
import { usePageSearch } from "@/hooks/usePageSearch";
import { ReceiptUploadField } from "@/components/finance/ReceiptUploadField";
import { PaymentDetailsFields, buildFinancePaymentPayload } from "@/components/finance/PaymentDetailsFields";
import { uploadReceipt, openReceiptInNewTab } from "@/lib/financeUpload";
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

function expenseId(e: Expense): string {
  return String(e._id ?? e.id ?? "");
}



interface Expense {

  id?: number;

  _id?: string;

  title: string;

  amount: number;

  category?: string;

  date: string;

  note?: string;
  paymentMethod?: string;
  bankAccountName?: string;
  bankAccountNumber?: string;
  accountId?: string;
  receiptUrl?: string;
  receiptFileName?: string;
}

type ExpenseSort = "default" | "date-desc" | "date-asc" | "title-asc" | "title-desc" | "amount-desc" | "amount-asc";
type ExpenseDateFilter = "all" | "thisMonth" | "thisYear" | "last30";
type AddMode = "single" | "bulk";

interface BulkExpenseRow {
  title: string;
  amount: string;
  category: string;
  date: string;
  note: string;
}

const emptyBulkExpenseRow = (): BulkExpenseRow => ({
  title: "",
  amount: "",
  category: "general",
  date: new Date().toISOString().split("T")[0],
  note: "",
});

function compareExpenses(a: Expense, b: Expense, sort: ExpenseSort): number {
  if (sort === "default") return 0;
  const titleA = (a.title || "").toLowerCase();
  const titleB = (b.title || "").toLowerCase();
  const amountA = Number(a.amount) || 0;
  const amountB = Number(b.amount) || 0;
  const dateA = new Date(a.date).getTime();
  const dateB = new Date(b.date).getTime();
  const idA = expenseId(a);
  const idB = expenseId(b);
  let primary = 0;
  switch (sort) {
    case "date-desc":
      primary = dateB - dateA;
      break;
    case "date-asc":
      primary = dateA - dateB;
      break;
    case "title-asc":
      primary = titleA.localeCompare(titleB, undefined, { sensitivity: "base" });
      break;
    case "title-desc":
      primary = titleB.localeCompare(titleA, undefined, { sensitivity: "base" });
      break;
    case "amount-desc":
      primary = amountB - amountA;
      break;
    case "amount-asc":
      primary = amountA - amountB;
      break;
    default:
      return 0;
  }
  if (primary !== 0) return primary;
  return idA.localeCompare(idB);
}



export default function Expenses({ embedded = false }: { embedded?: boolean }) {

  const { toast } = useToast();
  const { t } = useTranslation();

  const { items: expenses, isLoading, add, update, remove, refresh } = useApi<Expense>({

    endpoint: "expenses",

    defaultValue: [],

  });

  const [title, setTitle] = useState("");

  const [amount, setAmount] = useState("");

  const [category, setCategory] = useState("general");

  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);

  const [note, setNote] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [bankAccountName, setBankAccountName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [accountId, setAccountId] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [existingReceiptUrl, setExistingReceiptUrl] = useState<string | undefined>();
  const [existingReceiptName, setExistingReceiptName] = useState<string | undefined>();

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const {
    target: deleteTarget,
    open: deleteOpen,
    isDeleting: isDeleteDeleting,
    setIsDeleting: setIsDeleteDeleting,
    requestDelete,
    takeTarget,
    handleOpenChange: handleDeleteOpenChange,
  } = useDeleteConfirm<Expense>();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { query, setQuery } = usePageSearch();

  const [sortBy, setSortBy] = useState<ExpenseSort>("date-desc");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState<ExpenseDateFilter>("all");
  const [showFilters, setShowFilters] = useState(false);

  const [open, setOpen] = useState(false);

  const [editing, setEditing] = useState<Expense | null>(null);

  const [addMode, setAddMode] = useState<AddMode>("single");

  const [bulkRows, setBulkRows] = useState<BulkExpenseRow[]>([emptyBulkExpenseRow()]);

  const [isSaving, setIsSaving] = useState(false);

  const expensesTitle = t("expenses");

  const total = useMemo(

    () => expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0),

    [expenses],

  );



  const expenseCategories = useMemo(() => {
    const set = new Set<string>();
    for (const e of expenses) {
      const cat = String(e.category || "").trim();
      if (cat) set.add(cat);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  }, [expenses]);

  const matchesExpenseDateFilter = (dateStr: string, filter: ExpenseDateFilter) => {
    if (filter === "all") return true;
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return false;
    const now = new Date();
    if (filter === "thisMonth") {
      return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
    }
    if (filter === "thisYear") {
      return date.getFullYear() === now.getFullYear();
    }
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - 30);
    cutoff.setHours(0, 0, 0, 0);
    return date >= cutoff;
  };

  const filteredExpenses = useMemo(() => {

    const q = query.trim().toLowerCase();

    let list = !q

      ? [...expenses]

      : expenses.filter((e) =>

          `${e.title} ${e.category || ""} ${e.note || ""}`.toLowerCase().includes(q),

        );

    if (categoryFilter !== "all") {
      list = list.filter((e) => (e.category || "").toLowerCase() === categoryFilter.toLowerCase());
    }

    if (dateFilter !== "all") {
      list = list.filter((e) => matchesExpenseDateFilter(e.date, dateFilter));
    }

    if (sortBy !== "default") {

      list.sort((a, b) => compareExpenses(a, b, sortBy));

    }

    return list;

  }, [expenses, query, sortBy, categoryFilter, dateFilter]);

  const sortedExpensesEmbedded = useMemo(() => {
    const list = [...expenses];
    list.sort((a, b) => compareExpenses(a, b, "date-desc"));
    return list;
  }, [expenses]);

  const allEmbeddedSelected =
    sortedExpensesEmbedded.length > 0 &&
    sortedExpensesEmbedded.every((e) => selectedIds.has(expenseId(e)));

  const toggleEmbeddedSelectAll = () => {
    if (allEmbeddedSelected) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(sortedExpensesEmbedded.map((e) => expenseId(e))));
  };

  const toggleEmbeddedSelectRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleEmbeddedRefresh = async () => {
    setIsRefreshing(true);
    try {
      } finally {
      setIsRefreshing(false);
    }
  };

  const sortOptionLabels: Record<ExpenseSort, string> = {

    default: t("defaultSortOrder"),

    "date-desc": `${t("date")} (newest)`,

    "date-asc": `${t("date")} (oldest)`,

    "title-asc": t("nameAsc"),

    "title-desc": t("nameDesc"),

    "amount-desc": `${t("amount")} (high)`,

    "amount-asc": `${t("amount")} (low)`,

  };


  const resetExpenseForm = () => {

    setTitle("");

    setAmount("");

    setCategory("general");

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

    setAddMode("single");

    setBulkRows([emptyBulkExpenseRow()]);

  };



  const openCreate = () => {

    resetExpenseForm();

    setOpen(true);

  };



  const openEdit = (expense: Expense) => {

    setEditing(expense);

    setTitle(expense.title || "");

    setAmount(String(expense.amount ?? ""));

    setCategory(expense.category || "general");

    setDate(String(expense.date || "").slice(0, 10) || new Date().toISOString().split("T")[0]);

    setNote(expense.note || "");
    setPaymentMethod(expense.paymentMethod || "cash");
    setBankAccountName(expense.bankAccountName || "");
    setBankAccountNumber(expense.bankAccountNumber || "");
    setAccountId(expense.accountId || "");
    setReceiptFile(null);
    setExistingReceiptUrl(expense.receiptUrl);
    setExistingReceiptName(expense.receiptFileName);

    setOpen(true);

  };



  const addBulkRow = () => {

    setBulkRows((rows) => [...rows, emptyBulkExpenseRow()]);

  };



  const removeBulkRow = (index: number) => {

    setBulkRows((rows) => (rows.length > 1 ? rows.filter((_, i) => i !== index) : rows));

  };



  const updateBulkRow = (index: number, field: keyof BulkExpenseRow, value: string) => {

    setBulkRows((rows) => {

      const next = [...rows];

      next[index] = { ...next[index], [field]: value };

      return next;

    });

  };



  const buildExpenseDate = (dateValue: string) => {

    const now = new Date();

    const savedDate = new Date((dateValue || new Date().toISOString().split("T")[0]) + "T00:00:00");

    savedDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());

    return savedDate.toISOString();

  };



  const buildExpensePayload = (

    expenseTitle: string,

    expenseAmount: number,

    expenseCategory: string,

    expenseDate: string,

    expenseNote?: string,
    base: Partial<Expense> = {},
    extras: Partial<Expense> = {},
  ): Expense =>
    ({
      ...base,
      ...extras,
      title: expenseTitle.trim(),
      amount: expenseAmount,
      category: expenseCategory.trim() || "general",
      date: buildExpenseDate(expenseDate),
      note: expenseNote?.trim() || undefined,
    }) as Expense;

  const resolveReceipt = async () => {
    if (receiptFile) {
      return await uploadReceipt(receiptFile);
    }
    if (existingReceiptUrl) {
      return { receiptUrl: existingReceiptUrl, receiptFileName: existingReceiptName || "" };
    }
    return { receiptUrl: undefined, receiptFileName: undefined };
  };



  const handleSave = async () => {

    if (editing) {

      const parsedAmount = parseFloat(amount);

      if (!title.trim() || Number.isNaN(parsedAmount) || parsedAmount <= 0) {

        toast({

          title: t("missingInformation"),

          description: t("expenseNameAmountRequired"),

          variant: "destructive",

        });

        return;

      }

      setIsSaving(true);

      try {
        const receipt = await resolveReceipt();
        const payment = buildFinancePaymentPayload(paymentMethod, bankAccountName, bankAccountNumber, accountId);
        await update(
          buildExpensePayload(title, parsedAmount, category, date, note, editing, {
            ...payment,
            receiptUrl: receipt.receiptUrl,
            receiptFileName: receipt.receiptFileName || undefined,
          }),
        );

        toast({ title: t("expenseRecorded"), description: t("changesSaved") });

        resetExpenseForm();

        setOpen(false);

        window.dispatchEvent(new CustomEvent("finance-should-refresh"));

      } catch (error: unknown) {

        const message = error instanceof Error ? error.message : t("saveExpenseFailed");

        toast({ title: t("saveFailed"), description: message, variant: "destructive" });

      } finally {

        setIsSaving(false);

      }

      return;

    }



    if (addMode === "bulk") {

      const payment = buildFinancePaymentPayload(paymentMethod, bankAccountName, bankAccountNumber, accountId);
      const expensesToAdd = bulkRows

        .map((row) => {

          const parsedAmount = parseFloat(row.amount);

          if (!row.title.trim() || Number.isNaN(parsedAmount) || parsedAmount <= 0) return null;

          return buildExpensePayload(row.title, parsedAmount, row.category, row.date, row.note, {}, payment);

        })

        .filter((row): row is Expense => row !== null);



      if (expensesToAdd.length === 0) {

        toast({

          title: t("missingInformation"),

          description: t("expenseNameAmountRequired"),

          variant: "destructive",

        });

        return;

      }



      setIsSaving(true);

      try {

        for (const expense of expensesToAdd) {

          await add(expense);

        }

        toast({

          title: t("expenseRecorded"),

          description: `${expensesToAdd.length} ${expensesTitle.toLowerCase()}`,

        });

        resetExpenseForm();

        setOpen(false);

        window.dispatchEvent(new CustomEvent("finance-should-refresh"));

      } catch (error: unknown) {

        const message = error instanceof Error ? error.message : t("saveExpenseFailed");

        toast({ title: t("saveFailed"), description: message, variant: "destructive" });

      } finally {

        setIsSaving(false);

      }

      return;

    }



    const parsedAmount = parseFloat(amount);

    if (!title.trim() || Number.isNaN(parsedAmount) || parsedAmount <= 0) {

      toast({

        title: t("missingInformation"),

        description: t("expenseNameAmountRequired"),

        variant: "destructive",

      });

      return;

    }



    setIsSaving(true);

    try {
      const receipt = await resolveReceipt();
      const payment = buildFinancePaymentPayload(paymentMethod, bankAccountName, bankAccountNumber, accountId);
      await add(
        buildExpensePayload(title, parsedAmount, category, date, note, {}, {
          ...payment,
          receiptUrl: receipt.receiptUrl,
          receiptFileName: receipt.receiptFileName || undefined,
        }),
      );

      resetExpenseForm();

      setOpen(false);

      toast({ title: t("expenseRecorded"), description: t("expenseRecordedDesc") });

      window.dispatchEvent(new CustomEvent("finance-should-refresh"));

    } catch (error: unknown) {

      const message = error instanceof Error ? error.message : t("saveExpenseFailed");

      toast({ title: t("saveFailed"), description: message, variant: "destructive" });

    } finally {

      setIsSaving(false);

    }

  };



  const handleDeleteConfirm = async () => {
    const item = takeTarget();
    if (!item) return;

    const id = String((item as { _id?: string; id?: number })._id ?? item.id ?? "");

    if (!id) return;

    setIsDeleteDeleting(true);
    setDeletingId(id);

    try {

      await remove(item as any);

      toast({ title: t("deleted"), description: t("expenseRemovedDesc") });

      window.dispatchEvent(new CustomEvent("finance-should-refresh"));
    } catch (error: any) {

      toast({

        title: t("error"),

        description: error?.message || t("deleteExpenseFailed"),

        variant: "destructive",

      });

    } finally {

      setDeletingId(null);
      setIsDeleteDeleting(false);

    }

  };

  const titleLabel = t("expenseTitle");
  const categoryLabel = t("category");
  const amountLabel = t("amount");
  const dateLabel = t("date");
  const noteLabel = t("note");
  const actionsLabel = t("actions");

  const filterControls = (
    <div className="space-y-3">
      <Select value={categoryFilter} onValueChange={setCategoryFilter}>
        <SelectTrigger className={cn("w-full h-10 rounded-none", filterSelectClass)}>
          <SelectValue placeholder={t("category")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("allCategories")}</SelectItem>
          {expenseCategories.map((cat) => (
            <SelectItem key={cat} value={cat}>
              {cat}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as ExpenseDateFilter)}>
        <SelectTrigger className={cn("w-full h-10 rounded-none", filterSelectClass)}>
          <SelectValue placeholder={t("date")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("allDates")}</SelectItem>
          <SelectItem value="thisMonth">{t("thisMonth")}</SelectItem>
          <SelectItem value="thisYear">{t("thisYear")}</SelectItem>
          <SelectItem value="last30">{t("filterLast30Days")}</SelectItem>
        </SelectContent>
      </Select>
      <Select value={sortBy} onValueChange={(v) => setSortBy(v as ExpenseSort)}>
        <SelectTrigger className={cn("w-full h-10 rounded-none", filterSelectClass)}>
          <div className="flex items-center gap-2">
            <ArrowUpDown size={14} className="text-gray-400" />
            <SelectValue placeholder={t("sortBy")} />
          </div>
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(sortOptionLabels) as ExpenseSort[]).map((key) => (
            <SelectItem key={key} value={key}>
              {sortOptionLabels[key]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {(categoryFilter !== "all" || dateFilter !== "all") && (
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setCategoryFilter("all");
            setDateFilter("all");
          }}
          className="h-10 rounded-none w-full"
        >
          <X size={14} className="mr-1.5" />
          {t("clearFilters")}
        </Button>
      )}
    </div>
  );

  const addExpenseButton = (
    <Button
      className="gap-2 shrink-0 rounded-none h-10 px-3"
      onClick={openCreate}
    >
      <Plus size={18} />
      <span className="sr-only">{t("add")}</span>
    </Button>
  );

  const filterBar = (
    <>
      <MobileListSearchFilters
        searchValue={query}
        onSearchChange={setQuery}
        searchPlaceholder={`${t("search")} ${expensesTitle.toLowerCase()}...`}
        showFilters={showFilters}
        onToggleFilters={() => setShowFilters((v) => !v)}
        filters={filterControls}
        trailing={addExpenseButton}
        searchName="search-expenses"
      />
      <div className="hidden lg:flex flex-wrap items-center gap-3">
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className={cn("w-[160px] h-10 rounded-none shrink-0", filterSelectClass)}>
            <SelectValue placeholder={t("category")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allCategories")}</SelectItem>
            {expenseCategories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as ExpenseDateFilter)}>
          <SelectTrigger className={cn("w-[170px] h-10 rounded-none shrink-0", filterSelectClass)}>
            <SelectValue placeholder={t("date")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allDates")}</SelectItem>
            <SelectItem value="thisMonth">{t("thisMonth")}</SelectItem>
            <SelectItem value="thisYear">{t("thisYear")}</SelectItem>
            <SelectItem value="last30">{t("filterLast30Days")}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as ExpenseSort)}>
          <SelectTrigger className={cn("w-[200px] h-10 rounded-none shrink-0", filterSelectClass)}>
            <div className="flex items-center gap-2">
              <ArrowUpDown size={14} className="text-gray-400" />
              <SelectValue placeholder={t("sortBy")} />
            </div>
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(sortOptionLabels) as ExpenseSort[]).map((key) => (
              <SelectItem key={key} value={key}>
                {sortOptionLabels[key]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(categoryFilter !== "all" || dateFilter !== "all") && (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setCategoryFilter("all");
              setDateFilter("all");
            }}
            className="h-10 rounded-none shrink-0"
          >
            <X size={14} className="mr-1.5" />
            {t("clearFilters")}
          </Button>
        )}
        <Button
          className="bg-sky-400 text-white hover:bg-sky-500 border border-sky-400 hover:text-white gap-2 shrink-0 rounded-none h-10"
          onClick={openCreate}
        >
          <Plus size={16} />
          <span>{t("saveExpense")}</span>
        </Button>
      </div>
    </>
  );

  const renderExpensesTable = (compact = false) => {
    const thClass = compact
      ? "text-left text-xs font-semibold text-gray-700 py-2 px-2"
      : "text-left text-sm font-semibold text-gray-700 py-4 px-6";
    const tdClass = compact ? "py-2 px-2" : "py-4 px-6";

    return (
      <table className="w-full border-collapse">
        <thead className="sticky top-0 z-10 bg-gray-100 border-b border-gray-200">
          <tr>
            <th className={thClass}>{titleLabel}</th>
            <th className={thClass}>{categoryLabel}</th>
            <th className={thClass}>{amountLabel}</th>
            <th className={thClass}>{dateLabel}</th>
            <th className={cn(thClass, compact ? "" : "hidden xl:table-cell")}>{noteLabel}</th>
            <th className={cn(thClass, "hidden lg:table-cell")}>{t("receipt")}</th>
            <th className={cn(thClass, "text-right")}>{actionsLabel}</th>
          </tr>
        </thead>
        <tbody className="bg-white">
          {filteredExpenses.length > 0 ? (
            <>
              {filteredExpenses.map((expense, index) => {
                const id = expenseId(expense);
                const isDeletingThis = deletingId !== null && id === deletingId;

                return (
                  <tr
                    key={id || expense.title}
                    className={cn(
                      "border-b border-gray-200",
                      index % 2 === 0 ? "bg-white" : "bg-gray-50",
                    )}
                  >
                    <td className={tdClass}>
                      <div className={cn("text-gray-900", compact ? "text-xs font-medium" : "text-sm font-medium")}>
                        {expense.title}
                      </div>
                    </td>
                    <td className={tdClass}>
                      <div className={cn("text-gray-700", compact ? "text-xs" : "text-sm")}>
                        {expense.category || "general"}
                      </div>
                    </td>
                    <td className={tdClass}>
                      <div className={cn("inline-flex items-center gap-1 text-rose-600 tabular-nums font-semibold", compact ? "text-xs" : "text-sm")}>
                        <ArrowDown size={14} className="shrink-0" aria-hidden />
                        {Number(expense.amount).toLocaleString()} Rwf
                      </div>
                    </td>
                    <td className={tdClass}>
                      <div className={cn("text-gray-700 whitespace-nowrap", compact ? "text-xs" : "text-sm")}>
                        {formatDateWithTime(expense.date)}
                      </div>
                    </td>
                    <td className={cn(tdClass, compact ? "" : "hidden xl:table-cell")}>
                      <div className={cn("text-gray-500 truncate max-w-[200px]", compact ? "text-xs" : "text-sm")}>
                        {expense.note || "—"}
                      </div>
                    </td>
                    <td className={cn(tdClass, "hidden lg:table-cell")}>
                      {expense.receiptUrl ? (
                        <button
                          type="button"
                          className="text-xs text-primary flex items-center gap-1 hover:underline"
                          onClick={() => void openReceiptInNewTab(expense.receiptUrl!).catch(() => undefined)}
                        >
                          <FileText size={14} />
                          {expense.receiptFileName || t("viewReceipt")}
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className={cn(tdClass, "text-right")}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" disabled={isDeletingThis}>
                            {isDeletingThis ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : (
                              <MoreVertical size={16} />
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(expense)}>
                            <Pencil size={14} className="mr-2" />
                            {t("edit")}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => requestDelete(expense)}
                            disabled={isDeletingThis}
                            className="text-red-600 focus:text-red-600 focus:bg-red-50"
                          >
                            <Trash2 size={14} className="mr-2" />
                            {t("delete")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
              <tr className="border-t border-gray-200 bg-blue-50/70">
                <td colSpan={3} className={cn(tdClass, "text-sm font-semibold text-gray-800")}>
                  {t("total")}
                </td>
                <td className={cn(tdClass, "text-sm font-semibold text-rose-600 tabular-nums")}>
                  <span className="inline-flex items-center gap-1">
                    <ArrowDown size={14} className="shrink-0" aria-hidden />
                    {total.toLocaleString()} Rwf
                  </span>
                </td>
                <td colSpan={compact ? 2 : 3} />
              </tr>
            </>
          ) : (
            <tr>
              <td colSpan={6} className={cn(tdClass, "py-12 text-center")}>
                <div className="flex flex-col items-center justify-center text-gray-400">
                  <Receipt size={48} className="mb-4 opacity-50" />
                  <p className="text-base font-medium">{t("noExpensesYet")}</p>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    );
  };

  const renderEmbeddedExpensesTable = () => {
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
                  checked={allEmbeddedSelected}
                  onCheckedChange={toggleEmbeddedSelectAll}
                  ariaLabel="Select all"
                />
              </th>
              <th className={FINANCE_TH_CLASS}>{t("date")}</th>
              <th className={FINANCE_TH_CLASS}>{t("category")}</th>
              <th className={FINANCE_TH_CLASS}>{`${t("expenditure")} #`}</th>
              <th className={FINANCE_TH_CLASS}>{titleLabel}</th>
              <th className={cn(FINANCE_TH_CLASS, "hidden sm:table-cell")}>{t("paymentMethod")}</th>
              <th className={cn(FINANCE_TH_CLASS, "text-right")}>{t("amount")}</th>
              <th className={cn(FINANCE_TH_CLASS, "w-10 pr-4")} />
            </tr>
          </thead>
          <tbody className="bg-white">
            {sortedExpensesEmbedded.map((expense, index) => {
              const id = expenseId(expense);
              const isSelected = selectedIds.has(id);
              const isDeletingThis = deletingId !== null && id === deletingId;

              return (
                <tr
                  key={id || expense.title}
                  className={cn(
                    "transition-colors hover:bg-gray-50/80",
                    isSelected && "bg-blue-50/40",
                  )}
                >
                  <td className={cn(FINANCE_TD_CLASS, "pl-4")}>
                    <FinanceTableCheckbox
                      checked={isSelected}
                      onCheckedChange={() => toggleEmbeddedSelectRow(id)}
                      ariaLabel={`Select ${expense.title}`}
                    />
                  </td>
                  <td className={cn(FINANCE_TD_CLASS, "text-gray-700 tabular-nums")}>
                    {formatFinanceTableDate(expense.date)}
                  </td>
                  <td className={cn(FINANCE_TD_CLASS, "text-gray-600")}>
                    {expense.category || "general"}
                  </td>
                  <td className={FINANCE_TD_CLASS}>
                    <FinanceDocumentRefCell
                      entry={expense}
                      fallbackPrefix="expense"
                      id={id}
                      index={index}
                      readOnly
                    />
                  </td>
                  <td className={cn(FINANCE_TD_CLASS, "font-semibold text-gray-900 max-w-[180px] truncate")}>
                    {expense.title}
                  </td>
                  <td className={cn(FINANCE_TD_CLASS, "hidden sm:table-cell text-gray-600")}>
                    {formatPaymentMode(expense.paymentMethod, t)}
                  </td>
                  <td className={cn(FINANCE_TD_CLASS, "text-right font-medium tabular-nums text-rose-600")}>
                    <span className="inline-flex items-center justify-end gap-1">
                      <ArrowDown size={14} className="shrink-0" aria-hidden />
                      {Number(expense.amount).toLocaleString()} Rwf
                    </span>
                  </td>
                  <td className={cn(FINANCE_TD_CLASS, "pr-4 text-right")}>
                    <div className="flex items-center justify-end gap-1">
                      {expense.receiptUrl ? (
                        <button
                          type="button"
                          className="p-1 text-gray-400 hover:text-gray-600"
                          onClick={() => void openReceiptInNewTab(expense.receiptUrl!).catch(() => undefined)}
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
                            disabled={isDeletingThis}
                          >
                            {isDeletingThis ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <MoreVertical className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(expense)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            {t("edit")}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => requestDelete(expense)}
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

  if (isLoading) {
    const loadingBody = (
      <div className="flex flex-col min-h-0 pb-4 lg:pb-4">
          <div className="lg:bg-white lg:flex-1 lg:flex lg:flex-col lg:min-h-0 lg:overflow-hidden rounded-lg">
            <div className="lg:bg-white lg:border-b lg:border-gray-200 lg:px-4 lg:py-4 flex-shrink-0">
              {filterBar}
            </div>
            <div className="hidden lg:block overflow-auto flex-1 pb-4">
              <table className="w-full border-collapse">
                <thead className="sticky top-0 z-10 bg-gray-100 border-b border-gray-200">
                  <tr>
                    {[titleLabel, categoryLabel, amountLabel, dateLabel, noteLabel, actionsLabel].map((col) => (
                      <th key={col} className="text-left text-sm font-semibold text-gray-700 py-4 px-6">
                        <Skeleton className="h-4 w-20" />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="border-b border-gray-200">
                      {Array.from({ length: 6 }).map((_, j) => (
                        <td key={j} className="py-4 px-6">
                          <Skeleton className="h-4 w-28" />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
    );
    if (embedded) {
      return (
        <>
          <FinanceTableShell
            title={t("expenditure")}
            onAdd={openCreate}
            addLabel={t("add")}
            onRefresh={() => void handleEmbeddedRefresh()}
            isRefreshing={isRefreshing}
          >
            <FinanceTableLoading />
          </FinanceTableShell>
        </>
      );
    }
    return <AppLayout title={expensesTitle}>{loadingBody}</AppLayout>;
  }

  const pageBody = (
    <>
      {embedded ? (
        <FinanceTableShell
          title={t("expenditure")}
          onAdd={openCreate}
          addLabel={t("add")}
          onRefresh={() => void handleEmbeddedRefresh()}
          isRefreshing={isRefreshing}
        >
          {renderEmbeddedExpensesTable()}
        </FinanceTableShell>
      ) : (
      <div className="flex flex-col min-h-0 pb-4 lg:pb-4">

      <div className="lg:bg-white lg:flex-1 lg:flex lg:flex-col lg:min-h-0 lg:overflow-hidden rounded-lg">
          <div className="lg:bg-white lg:border-b lg:border-gray-200 lg:px-4 lg:py-4 flex-shrink-0 mb-4 lg:mb-0">
            {filterBar}
            <div className="mt-3 text-xs text-gray-500 hidden lg:block">
              {filteredExpenses.length} {expensesTitle.toLowerCase()}
            </div>
          </div>
          <div className="hidden lg:block overflow-auto flex-1 pb-4">
            {renderExpensesTable(false)}
          </div>
          <div className="lg:hidden mt-4 pb-20 overflow-auto">
            <div className="min-w-full">{renderExpensesTable(true)}</div>
          </div>
      </div>
      </div>
      )}

      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next && isSaving) return;
          setOpen(next);
          if (!next) resetExpenseForm();
        }}
      >
        <DialogContent
          className={cn(
            "w-[calc(100vw-2rem)] max-w-[21rem] sm:max-w-md max-h-[70vh] sm:max-h-[90vh] overflow-y-auto p-4 sm:p-6",
            !editing && addMode === "bulk" && "sm:max-w-2xl",
          )}
        >
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-base sm:text-lg">
              {editing ? t("edit") : addMode === "bulk" ? t("bulkAdd") : t("saveExpense")}
            </DialogTitle>
          </DialogHeader>

          {!editing && (
            <div className="flex gap-2">
              <Button
                type="button"
                variant={addMode === "single" ? "default" : "outline"}
                onClick={() => setAddMode("single")}
                className={cn(addMode === "single" && "bg-sky-400 text-white hover:bg-sky-500 border border-sky-400 hover:text-white")}
                disabled={isSaving}
              >
                {t("saveExpense")}
              </Button>
              <Button
                type="button"
                variant={addMode === "bulk" ? "default" : "outline"}
                onClick={() => setAddMode("bulk")}
                className={cn(addMode === "bulk" && "bg-sky-400 text-white hover:bg-sky-500 border border-sky-400 hover:text-white")}
                disabled={isSaving}
              >
                {t("bulkAdd")}
              </Button>
            </div>
          )}

          <div className="space-y-2 sm:space-y-3 py-1 sm:py-2">
            {editing || addMode === "single" ? (
              <>
                <div className="space-y-1">
                  <Label className="text-[11px] sm:text-xs">{t("expenseTitle")}</Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={t("expenseExamplePlaceholder")}
                    disabled={isSaving}
                    className="h-9 sm:h-10 text-sm sm:text-base"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                  <div className="space-y-1">
                    <Label className="text-[11px] sm:text-xs">{t("amount")} (Rwf)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder={t("amount")}
                      disabled={isSaving}
                      className="h-9 sm:h-10 text-sm sm:text-base"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] sm:text-xs">{t("category")}</Label>
                    <Input
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      placeholder={t("expenseCategoryPlaceholder")}
                      disabled={isSaving}
                      className="h-9 sm:h-10 text-sm sm:text-base"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                  <div className="space-y-1">
                    <Label className="text-[11px] sm:text-xs">{t("date")}</Label>
                    <Input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      disabled={isSaving}
                      className="h-9 sm:h-10 text-sm sm:text-base"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] sm:text-xs">{t("noteOptional")}</Label>
                    <Input
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder={t("expenseNotePlaceholder")}
                      disabled={isSaving}
                      className="h-9 sm:h-10 text-sm sm:text-base"
                    />
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
                  labelClassName="text-[11px] sm:text-xs"
                  selectTriggerClassName="h-9 sm:h-10 text-sm sm:text-base"
                  inputClassName="h-9 sm:h-10 text-sm sm:text-base"
                />
                <ReceiptUploadField
                  file={receiptFile}
                  onFileChange={setReceiptFile}
                  existingUrl={existingReceiptUrl}
                  existingName={existingReceiptName}
                  disabled={isSaving}
                />
              </>
            ) : (
              <div className="space-y-3">
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
                  labelClassName="text-[11px] sm:text-xs"
                  selectTriggerClassName="h-9 sm:h-10 text-sm sm:text-base"
                  inputClassName="h-9 sm:h-10 text-sm sm:text-base"
                />
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <p className="text-sm text-muted-foreground">{t("addMultipleExpenses")}</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addBulkRow}
                    disabled={isSaving}
                    className="shrink-0 gap-1"
                  >
                    <Plus size={14} />
                    {t("saveExpense")}
                  </Button>
                </div>
                {bulkRows.map((row, index) => (
                  <div
                    key={index}
                    className="rounded-lg border border-gray-300 p-3 space-y-2 bg-white shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-600">
                        {t("expenseTitle")} #{index + 1}
                      </span>
                      {bulkRows.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeBulkRow(index)}
                          disabled={isSaving}
                          className="p-1 rounded text-red-600 hover:bg-red-50"
                          aria-label={t("delete")}
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <Input
                        value={row.title}
                        onChange={(e) => updateBulkRow(index, "title", e.target.value)}
                        placeholder={t("expenseExamplePlaceholder")}
                        disabled={isSaving}
                      />
                      <Input
                        type="number"
                        min="0"
                        value={row.amount}
                        onChange={(e) => updateBulkRow(index, "amount", e.target.value)}
                        placeholder={t("amount")}
                        disabled={isSaving}
                      />
                      <Input
                        value={row.category}
                        onChange={(e) => updateBulkRow(index, "category", e.target.value)}
                        placeholder={t("expenseCategoryPlaceholder")}
                        disabled={isSaving}
                      />
                      <Input
                        type="date"
                        value={row.date}
                        onChange={(e) => updateBulkRow(index, "date", e.target.value)}
                        disabled={isSaving}
                      />
                    </div>
                    <Input
                      value={row.note}
                      onChange={(e) => updateBulkRow(index, "note", e.target.value)}
                      placeholder={t("expenseNotePlaceholder")}
                      disabled={isSaving}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="cancel" onClick={() => setOpen(false)} disabled={isSaving}>
              {t("cancel")}
            </Button>
            <Button
              className="min-w-[7rem]"
              onClick={() => void handleSave()}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("saving")}
                </>
              ) : editing ? (
                t("save")
              ) : addMode === "bulk" ? (
                t("addExpensesBtn")
              ) : (
                t("save")
              )}
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

  if (embedded) {
    return pageBody;
  }

  return <AppLayout title={expensesTitle}>{pageBody}</AppLayout>;
}


