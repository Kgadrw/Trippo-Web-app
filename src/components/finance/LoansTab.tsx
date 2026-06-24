import { useEffect, useMemo, useRef, useState } from "react";
import { useApi } from "@/hooks/useApi";
import { loanApi } from "@/lib/api";
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
  History,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/currency";
import { PaymentDetailsFields, buildFinancePaymentPayload } from "@/components/finance/PaymentDetailsFields";
import { ReceiptUploadField } from "@/components/finance/ReceiptUploadField";
import { uploadReceipt } from "@/lib/financeUpload";
import { filterByPageSearch } from "@/lib/pageSearch";
import { usePageSearch } from "@/hooks/usePageSearch";
import {
  FINANCE_TH_CLASS,
  FINANCE_TD_CLASS,
  formatFinanceTableDate,
  FinanceTableCheckbox,
  FinanceTableLoading,
  FinanceTableShell,
} from "@/components/finance/financeTable";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { useDeleteConfirm } from "@/hooks/useDeleteConfirm";

export interface LoanPayment {
  _id?: string;
  amount: number;
  paymentDate: string;
  principalPortion?: number;
  interestPortion?: number;
  note?: string;
  paymentMethod?: string;
}

export interface LoanEntry {
  id?: number;
  _id?: string;
  title: string;
  lender: string;
  loanType?: string;
  principalAmount: number;
  interestRate?: number;
  termMonths?: number;
  installmentAmount: number;
  paymentFrequency?: "monthly" | "quarterly" | "yearly";
  startDate: string;
  maturityDate?: string;
  nextDueDate: string;
  totalPaid?: number;
  remainingBalance: number;
  status?: "active" | "paid_off" | "overdue";
  referenceNumber?: string;
  accountNumber?: string;
  collateral?: string;
  contactPerson?: string;
  contactPhone?: string;
  note?: string;
  payments?: LoanPayment[];
}

const LOAN_TYPES = [
  "business",
  "working_capital",
  "equipment",
  "vehicle",
  "line_of_credit",
  "other",
] as const;

function loanId(e: LoanEntry): string {
  return String(e._id ?? e.id ?? "");
}

function buildLoanDate(dateValue: string) {
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

function isOverdue(nextDueDate: string, status?: string) {
  if (status === "paid_off") return false;
  return startOfDay(new Date(nextDueDate)) < startOfDay(new Date());
}

function sortLoans(list: LoanEntry[]) {
  return [...list].sort((a, b) => {
    const aPaid = a.status === "paid_off" ? 1 : 0;
    const bPaid = b.status === "paid_off" ? 1 : 0;
    if (aPaid !== bPaid) return aPaid - bPaid;
    const aOver = isOverdue(a.nextDueDate, a.status) ? 0 : 1;
    const bOver = isOverdue(b.nextDueDate, b.status) ? 0 : 1;
    if (aOver !== bOver) return aOver - bOver;
    return new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime();
  });
}

function loanTypeLabel(type: string | undefined, t: (key: string) => string) {
  const map: Record<string, string> = {
    business: t("loanTypeBusiness"),
    working_capital: t("loanTypeWorkingCapital"),
    equipment: t("loanTypeEquipment"),
    vehicle: t("loanTypeVehicle"),
    line_of_credit: t("loanTypeLineOfCredit"),
    other: t("loanTypeOther"),
  };
  return map[type || "business"] || type || "—";
}

function loanStatusLabel(entry: LoanEntry, t: (key: string) => string) {
  if (entry.status === "paid_off") {
    return { label: t("loanStatusPaidOff"), className: "text-emerald-600 font-medium" };
  }
  if (isOverdue(entry.nextDueDate, entry.status)) {
    return { label: t("loanStatusOverdue"), className: "text-red-600 font-medium" };
  }
  return { label: t("loanStatusActive"), className: "text-sky-600 font-medium" };
}

export function LoansTab() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const { items: loans, isLoading, add, update, remove, refresh } = useApi<LoanEntry>({
    endpoint: "loans",
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
    window.addEventListener("loans-should-refresh", onRefresh);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("loans-should-refresh", onRefresh);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [refresh]);

  const [title, setTitle] = useState("");
  const [lender, setLender] = useState("");
  const [loanType, setLoanType] = useState<string>("business");
  const [principalAmount, setPrincipalAmount] = useState("");
  const [interestRate, setInterestRate] = useState("");
  const [termMonths, setTermMonths] = useState("");
  const [installmentAmount, setInstallmentAmount] = useState("");
  const [paymentFrequency, setPaymentFrequency] = useState<string>("monthly");
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [nextDueDate, setNextDueDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [maturityDate, setMaturityDate] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [collateral, setCollateral] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [note, setNote] = useState("");

  const [open, setOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [editing, setEditing] = useState<LoanEntry | null>(null);
  const [paying, setPaying] = useState<LoanEntry | null>(null);
  const [viewingHistory, setViewingHistory] = useState<LoanEntry | null>(null);
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
  } = useDeleteConfirm<LoanEntry>();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [paymentAmount, setPaymentAmount] = useState("");
  const [principalPortion, setPrincipalPortion] = useState("");
  const [interestPortion, setInterestPortion] = useState("");
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [paymentNote, setPaymentNote] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("transfer");
  const [bankAccountName, setBankAccountName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [accountId, setAccountId] = useState("");
  const [payReceiptFile, setPayReceiptFile] = useState<File | null>(null);

  const sortedLoans = useMemo(() => sortLoans(loans), [loans]);
  const { query: pageSearchQuery } = usePageSearch();
  const visibleLoans = useMemo(
    () =>
      filterByPageSearch(sortedLoans, pageSearchQuery, (entry) => [
        entry.title,
        entry.lender,
        entry.referenceNumber,
        entry.contactPerson,
        entry.note,
        entry.status,
      ]),
    [sortedLoans, pageSearchQuery],
  );

  const metrics = useMemo(() => {
    const today = startOfDay(new Date());
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
    const active = loans.filter((l) => l.status !== "paid_off");
    const totalOutstanding = active.reduce((s, l) => s + (Number(l.remainingBalance) || 0), 0);
    const overdue = active.filter((l) => isOverdue(l.nextDueDate, l.status));
    const dueThisMonth = active.filter((l) => {
      const due = new Date(l.nextDueDate);
      return due >= today && due <= monthEnd;
    });
    return {
      totalOutstanding,
      overdueAmount: overdue.reduce((s, l) => s + (Number(l.installmentAmount) || 0), 0),
      overdueCount: overdue.length,
      dueThisMonthAmount: dueThisMonth.reduce((s, l) => s + (Number(l.installmentAmount) || 0), 0),
      dueThisMonthCount: dueThisMonth.length,
      activeCount: active.length,
      totalPaid: loans.reduce((s, l) => s + (Number(l.totalPaid) || 0), 0),
    };
  }, [loans]);

  const allSelected =
    visibleLoans.length > 0 && visibleLoans.every((e) => selectedIds.has(loanId(e)));

  const toggleSelectAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(visibleLoans.map((e) => loanId(e))));
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
    setLender("");
    setLoanType("business");
    setPrincipalAmount("");
    setInterestRate("");
    setTermMonths("");
    setInstallmentAmount("");
    setPaymentFrequency("monthly");
    setStartDate(new Date().toISOString().split("T")[0]);
    setNextDueDate(new Date().toISOString().split("T")[0]);
    setMaturityDate("");
    setReferenceNumber("");
    setAccountNumber("");
    setCollateral("");
    setContactPerson("");
    setContactPhone("");
    setNote("");
    setEditing(null);
  };

  const resetPayForm = () => {
    setPaying(null);
    setPaymentAmount("");
    setPrincipalPortion("");
    setInterestPortion("");
    setPaymentDate(new Date().toISOString().split("T")[0]);
    setPaymentNote("");
    setPaymentMethod("transfer");
    setBankAccountName("");
    setBankAccountNumber("");
    setPayReceiptFile(null);
  };

  const openCreate = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (entry: LoanEntry) => {
    if (entry.status === "paid_off") return;
    setEditing(entry);
    setTitle(entry.title || "");
    setLender(entry.lender || "");
    setLoanType(entry.loanType || "business");
    setPrincipalAmount(String(entry.principalAmount ?? ""));
    setInterestRate(entry.interestRate !== undefined ? String(entry.interestRate) : "");
    setTermMonths(entry.termMonths !== undefined ? String(entry.termMonths) : "");
    setInstallmentAmount(String(entry.installmentAmount ?? ""));
    setPaymentFrequency(entry.paymentFrequency || "monthly");
    setStartDate(String(entry.startDate || "").slice(0, 10) || new Date().toISOString().split("T")[0]);
    setNextDueDate(String(entry.nextDueDate || "").slice(0, 10) || new Date().toISOString().split("T")[0]);
    setMaturityDate(entry.maturityDate ? String(entry.maturityDate).slice(0, 10) : "");
    setReferenceNumber(entry.referenceNumber || "");
    setAccountNumber(entry.accountNumber || "");
    setCollateral(entry.collateral || "");
    setContactPerson(entry.contactPerson || "");
    setContactPhone(entry.contactPhone || "");
    setNote(entry.note || "");
    setOpen(true);
  };

  const openPay = (entry: LoanEntry) => {
    if (entry.status === "paid_off") return;
    setPaying(entry);
    setPaymentAmount(String(entry.installmentAmount ?? ""));
    setPrincipalPortion(String(entry.installmentAmount ?? ""));
    setInterestPortion("0");
    setPaymentDate(new Date().toISOString().split("T")[0]);
    setPayOpen(true);
  };

  const openHistory = (entry: LoanEntry) => {
    setViewingHistory(entry);
    setHistoryOpen(true);
  };

  const handleSave = async () => {
    if (!title.trim() || !lender.trim() || !principalAmount || !installmentAmount) {
      toast({
        title: t("saveFailed"),
        description: t("loanRequiredFields"),
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        title: title.trim(),
        lender: lender.trim(),
        loanType,
        principalAmount: Number(principalAmount),
        interestRate: interestRate ? Number(interestRate) : 0,
        termMonths: termMonths ? Number(termMonths) : undefined,
        installmentAmount: Number(installmentAmount),
        paymentFrequency,
        startDate: buildLoanDate(startDate),
        nextDueDate: buildLoanDate(nextDueDate),
        maturityDate: maturityDate ? buildLoanDate(maturityDate) : undefined,
        referenceNumber: referenceNumber.trim() || undefined,
        accountNumber: accountNumber.trim() || undefined,
        collateral: collateral.trim() || undefined,
        contactPerson: contactPerson.trim() || undefined,
        contactPhone: contactPhone.trim() || undefined,
        note: note.trim() || undefined,
      };

      if (editing) {
        await update({ ...editing, ...payload } as LoanEntry);
        toast({ title: t("loanUpdated"), description: t("loanUpdatedDesc") });
      } else {
        await add(payload as LoanEntry);
        toast({ title: t("loanRecorded"), description: t("loanRecordedDesc") });
      }
      window.dispatchEvent(new CustomEvent("loans-should-refresh"));
      resetForm();
      setOpen(false);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t("saveLoanFailed");
      toast({ title: t("saveFailed"), description: message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRecordPayment = async () => {
    if (!paying || !paymentAmount || Number(paymentAmount) <= 0) {
      toast({
        title: t("saveFailed"),
        description: t("loanPaymentAmountRequired"),
        variant: "destructive",
      });
      return;
    }

    const id = loanId(paying);
    setIsPaying(true);
    try {
      let receiptPayload: { receiptUrl?: string; receiptFileName?: string } = {};
      if (payReceiptFile) {
        receiptPayload = await uploadReceipt(payReceiptFile);
      }

      await loanApi.recordPayment(id, {
        amount: Number(paymentAmount),
        principalPortion: principalPortion ? Number(principalPortion) : Number(paymentAmount),
        interestPortion: interestPortion ? Number(interestPortion) : 0,
        paymentDate: buildLoanDate(paymentDate),
        note: paymentNote.trim() || undefined,
        ...buildFinancePaymentPayload(paymentMethod, bankAccountName, bankAccountNumber, accountId),
        ...receiptPayload,
      });

      window.dispatchEvent(new CustomEvent("loans-should-refresh"));
      window.dispatchEvent(new CustomEvent("expenses-should-refresh"));
      window.dispatchEvent(new CustomEvent("finance-should-refresh"));
      toast({ title: t("loanPaymentRecorded"), description: t("loanPaymentRecordedDesc") });
      resetPayForm();
      setPayOpen(false);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t("recordLoanPaymentFailed");
      toast({ title: t("saveFailed"), description: message, variant: "destructive" });
    } finally {
      setIsPaying(false);
    }
  };

  const handleDeleteRequest = (entry: LoanEntry) => {
    if ((entry.totalPaid || 0) > 0) {
      toast({
        title: t("error"),
        description: t("loanDeleteHasPayments"),
        variant: "destructive",
      });
      return;
    }
    requestDelete(entry);
  };

  const handleDeleteConfirm = async () => {
    const item = takeTarget();
    if (!item) return;
    const id = loanId(item);
    setIsDeleteDeleting(true);
    setDeletingId(id);
    try {
      await remove(item);
      toast({ title: t("deleted"), description: t("loanRemovedDesc") });
      window.dispatchEvent(new CustomEvent("loans-should-refresh"));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t("deleteLoanFailed");
      toast({ title: t("error"), description: message, variant: "destructive" });
    } finally {
      setDeletingId(null);
      setIsDeleteDeleting(false);
    }
  };

  const renderTable = () => {
    if (isLoading) return <FinanceTableLoading />;

    if (visibleLoans.length === 0) {
      return (
        <div className="p-12 text-center text-muted-foreground">
          <p className="font-medium">{t("noLoansYet")}</p>
          <p className="text-sm mt-1">{t("loansEmptyHint")}</p>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1200px] border-collapse">
          <thead>
            <tr>
              <th className={cn(FINANCE_TH_CLASS, "w-10 pl-4")}>
                <FinanceTableCheckbox
                  checked={allSelected}
                  onCheckedChange={toggleSelectAll}
                  ariaLabel="Select all"
                />
              </th>
              <th className={FINANCE_TH_CLASS}>{t("lender")}</th>
              <th className={FINANCE_TH_CLASS}>{t("loanTitle")}</th>
              <th className={cn(FINANCE_TH_CLASS, "hidden md:table-cell")}>{t("loanType")}</th>
              <th className={cn(FINANCE_TH_CLASS, "text-right")}>{t("principalAmount")}</th>
              <th className={cn(FINANCE_TH_CLASS, "text-right")}>{t("remainingBalance")}</th>
              <th className={cn(FINANCE_TH_CLASS, "text-right hidden sm:table-cell")}>{t("installmentAmount")}</th>
              <th className={FINANCE_TH_CLASS}>{t("nextDueDate")}</th>
              <th className={cn(FINANCE_TH_CLASS, "hidden lg:table-cell")}>{t("loanStatus")}</th>
              <th className={cn(FINANCE_TH_CLASS, "w-10 pr-4")} />
            </tr>
          </thead>
          <tbody className="bg-white">
            {visibleLoans.map((entry) => {
              const id = loanId(entry);
              const status = loanStatusLabel(entry, t);
              const paymentsCount = entry.payments?.length || 0;
              return (
                <tr key={id} className="border-t border-gray-100 hover:bg-gray-50/80">
                  <td className={cn(FINANCE_TD_CLASS, "pl-4")}>
                    <FinanceTableCheckbox
                      checked={selectedIds.has(id)}
                      onCheckedChange={() => toggleSelectRow(id)}
                      ariaLabel={`Select ${entry.title}`}
                    />
                  </td>
                  <td className={cn(FINANCE_TD_CLASS, "font-medium max-w-[140px] truncate")}>
                    {entry.lender}
                  </td>
                  <td className={cn(FINANCE_TD_CLASS, "max-w-[160px] truncate")}>{entry.title}</td>
                  <td className={cn(FINANCE_TD_CLASS, "hidden md:table-cell text-gray-600")}>
                    {loanTypeLabel(entry.loanType, t)}
                  </td>
                  <td className={cn(FINANCE_TD_CLASS, "text-right tabular-nums")}>
                    {formatCurrency(Number(entry.principalAmount) || 0)}
                  </td>
                  <td className={cn(FINANCE_TD_CLASS, "text-right font-semibold tabular-nums text-amber-700")}>
                    {formatCurrency(Number(entry.remainingBalance) || 0)}
                  </td>
                  <td className={cn(FINANCE_TD_CLASS, "text-right tabular-nums hidden sm:table-cell")}>
                    {formatCurrency(Number(entry.installmentAmount) || 0)}
                  </td>
                  <td className={cn(FINANCE_TD_CLASS, "tabular-nums")}>
                    <span className={cn(isOverdue(entry.nextDueDate, entry.status) && "text-red-600 font-medium")}>
                      {formatFinanceTableDate(entry.nextDueDate)}
                    </span>
                  </td>
                  <td className={cn(FINANCE_TD_CLASS, "hidden lg:table-cell", status.className)}>
                    {status.label}
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
                          {entry.status !== "paid_off" ? (
                            <DropdownMenuItem onClick={() => openPay(entry)}>
                              <CheckCircle2 className="mr-2 h-4 w-4" />
                              {t("recordLoanPayment")}
                            </DropdownMenuItem>
                          ) : null}
                          <DropdownMenuItem onClick={() => openHistory(entry)}>
                            <History className="mr-2 h-4 w-4" />
                            {t("paymentHistory")} ({paymentsCount})
                          </DropdownMenuItem>
                          {entry.status !== "paid_off" ? (
                            <>
                              <DropdownMenuItem onClick={() => openEdit(entry)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                {t("edit")}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => handleDeleteRequest(entry)}
                                disabled={deletingId === id}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                {t("delete")}
                              </DropdownMenuItem>
                            </>
                          ) : null}
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
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{t("totalOutstanding")}</p>
          <p className="text-xl font-bold text-amber-700 tabular-nums mt-1">
            {metrics.totalOutstanding.toLocaleString()}{" "}
            <span className="currency-code text-sm text-gray-500">Rwf</span>
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {metrics.activeCount} {t("activeLoans")}
          </p>
        </div>
        <div className="border border-gray-200 bg-white px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{t("dueThisMonth")}</p>
          <p className="text-xl font-bold text-sky-700 tabular-nums mt-1">
            {metrics.dueThisMonthAmount.toLocaleString()}{" "}
            <span className="currency-code text-sm text-gray-500">Rwf</span>
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {metrics.dueThisMonthCount} {t("loanPaymentsDue")}
          </p>
        </div>
        <div className="border border-gray-200 bg-white px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{t("overdue")}</p>
          <p className="text-xl font-bold text-red-600 tabular-nums mt-1">
            {metrics.overdueAmount.toLocaleString()}{" "}
            <span className="currency-code text-sm text-gray-500">Rwf</span>
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {metrics.overdueCount} {t("overdueLoans")}
          </p>
        </div>
        <div className="border border-gray-200 bg-white px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{t("totalPaidOnLoans")}</p>
          <p className="text-xl font-bold text-emerald-700 tabular-nums mt-1">
            {metrics.totalPaid.toLocaleString()}{" "}
            <span className="currency-code text-sm text-gray-500">Rwf</span>
          </p>
        </div>
      </div>

      <FinanceTableShell
        title={t("loans")}
        onAdd={openCreate}
        addLabel={t("add")}
        onRefresh={() => void handleRefresh()}
        isRefreshing={isRefreshing}
      >
        {renderTable()}
      </FinanceTableShell>

      {/* Add / Edit Loan */}
      <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); setOpen(v); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? t("editLoan") : t("addLoan")}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>{t("loanTitle")}</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("loanTitlePlaceholder")} />
            </div>
            <div className="space-y-2">
              <Label>{t("lender")}</Label>
              <Input value={lender} onChange={(e) => setLender(e.target.value)} placeholder={t("lenderPlaceholder")} />
            </div>
            <div className="space-y-2">
              <Label>{t("loanType")}</Label>
              <Select value={loanType} onValueChange={setLoanType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LOAN_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>{loanTypeLabel(type, t)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("principalAmount")}</Label>
              <Input type="number" min={0} value={principalAmount} onChange={(e) => setPrincipalAmount(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t("installmentAmount")}</Label>
              <Input type="number" min={0} value={installmentAmount} onChange={(e) => setInstallmentAmount(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t("interestRate")}</Label>
              <Input type="number" min={0} max={100} step="0.1" value={interestRate} onChange={(e) => setInterestRate(e.target.value)} placeholder="%" />
            </div>
            <div className="space-y-2">
              <Label>{t("termMonths")}</Label>
              <Input type="number" min={0} value={termMonths} onChange={(e) => setTermMonths(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t("paymentFrequency")}</Label>
              <Select value={paymentFrequency} onValueChange={setPaymentFrequency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">{t("budgetPeriodMonthly")}</SelectItem>
                  <SelectItem value="quarterly">{t("budgetPeriodQuarterly")}</SelectItem>
                  <SelectItem value="yearly">{t("budgetPeriodYearly")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("startDate")}</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t("nextDueDate")}</Label>
              <Input type="date" value={nextDueDate} onChange={(e) => setNextDueDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t("maturityDate")}</Label>
              <Input type="date" value={maturityDate} onChange={(e) => setMaturityDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t("referenceNumber")}</Label>
              <Input value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t("loanAccountNumber")}</Label>
              <Input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>{t("collateral")}</Label>
              <Input value={collateral} onChange={(e) => setCollateral(e.target.value)} placeholder={t("collateralPlaceholder")} />
            </div>
            <div className="space-y-2">
              <Label>{t("contactPerson")}</Label>
              <Input value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t("contactPhone")}</Label>
              <Input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>{t("note")}</Label>
              <Input value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="cancel" onClick={() => { resetForm(); setOpen(false); }}>{t("cancel")}</Button>
            <Button onClick={() => void handleSave()} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record Payment */}
      <Dialog open={payOpen} onOpenChange={(v) => { if (!v) resetPayForm(); setPayOpen(v); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("recordLoanPayment")}</DialogTitle>
          </DialogHeader>
          {paying ? (
            <div className="space-y-4 py-2">
              <div className="rounded border border-gray-200 bg-gray-50 px-3 py-2 text-sm">
                <p className="font-medium">{paying.title}</p>
                <p className="text-gray-600">{paying.lender}</p>
                <p className="mt-1 text-amber-700 font-semibold">
                  {t("remainingBalance")}: {formatCurrency(Number(paying.remainingBalance) || 0)}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>{t("paymentAmount")}</Label>
                  <Input type="number" min={0} value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>{t("paymentDate")}</Label>
                  <Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>{t("principalPortion")}</Label>
                  <Input type="number" min={0} value={principalPortion} onChange={(e) => setPrincipalPortion(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>{t("interestPortion")}</Label>
                  <Input type="number" min={0} value={interestPortion} onChange={(e) => setInterestPortion(e.target.value)} />
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
              />
              <div className="space-y-2">
                <Label>{t("note")}</Label>
                <Input value={paymentNote} onChange={(e) => setPaymentNote(e.target.value)} />
              </div>
              <ReceiptUploadField file={payReceiptFile} onFileChange={setPayReceiptFile} />
              <p className="text-xs text-gray-500 flex items-start gap-1">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                {t("loanPaymentExpenseHint")}
              </p>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="cancel" onClick={() => { resetPayForm(); setPayOpen(false); }}>{t("cancel")}</Button>
            <Button onClick={() => void handleRecordPayment()} disabled={isPaying}>
              {isPaying ? <Loader2 className="h-4 w-4 animate-spin" /> : t("recordLoanPayment")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment History */}
      <Dialog open={historyOpen} onOpenChange={(v) => { if (!v) setViewingHistory(null); setHistoryOpen(v); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("paymentHistory")}</DialogTitle>
          </DialogHeader>
          {viewingHistory ? (
            <div className="space-y-3 py-2">
              <div className="text-sm">
                <p className="font-medium">{viewingHistory.title}</p>
                <p className="text-gray-600">{viewingHistory.lender}</p>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-gray-600">
                  <span>{t("principalAmount")}: {formatCurrency(viewingHistory.principalAmount)}</span>
                  <span>{t("totalPaidOnLoans")}: {formatCurrency(viewingHistory.totalPaid || 0)}</span>
                  <span>{t("remainingBalance")}: {formatCurrency(viewingHistory.remainingBalance)}</span>
                  <span>{t("interestRate")}: {viewingHistory.interestRate || 0}%</span>
                </div>
              </div>
              {(viewingHistory.payments?.length || 0) === 0 ? (
                <p className="text-sm text-gray-500 py-4 text-center">{t("noPaymentsYet")}</p>
              ) : (
                <div className="divide-y divide-gray-100 border border-gray-200">
                  {[...(viewingHistory.payments || [])]
                    .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())
                    .map((p, i) => (
                      <div key={p._id || i} className="px-3 py-2.5 text-sm">
                        <div className="flex justify-between font-medium">
                          <span>{formatFinanceTableDate(p.paymentDate)}</span>
                          <span className="text-emerald-700">{formatCurrency(p.amount)}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {t("principalPortion")}: {formatCurrency(p.principalPortion || 0)}
                          {" · "}
                          {t("interestPortion")}: {formatCurrency(p.interestPortion || 0)}
                        </p>
                        {p.note ? <p className="text-xs text-gray-600 mt-0.5">{p.note}</p> : null}
                      </div>
                    ))}
                </div>
              )}
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="cancel" onClick={() => { setViewingHistory(null); setHistoryOpen(false); }}>
              {t("close")}
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
