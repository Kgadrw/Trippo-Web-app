import { useMemo, useState } from "react";
import { useApi } from "@/hooks/useApi";
import { invoiceApi } from "@/lib/api";
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
  Send,
  FileDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency, CurrencyAmount } from "@/lib/currency";
import { PaymentDetailsFields, buildFinancePaymentPayload } from "@/components/finance/PaymentDetailsFields";
import { uploadReceipt } from "@/lib/financeUpload";
import { downloadInvoicePdf } from "@/lib/invoicePdf";
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

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface InvoiceEntry {
  id?: number;
  _id?: string;
  invoiceNumber: string;
  title: string;
  clientId?: string;
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  lineItems?: InvoiceLineItem[];
  amount: number;
  issueDate: string;
  dueDate: string;
  status?: "draft" | "sent" | "paid" | "overdue";
  sentAt?: string;
  paidAt?: string;
  incomeId?: string;
  note?: string;
  terms?: string;
  isRecurring?: boolean;
  recurrenceFrequency?: "monthly" | "quarterly" | "yearly";
  recurrenceEndDate?: string;
}

interface ClientOption {
  id?: number;
  _id?: string;
  name: string;
  email?: string;
  phone?: string;
}

function invoiceId(e: InvoiceEntry): string {
  return String(e._id ?? e.id ?? "");
}

function clientOptionId(c: ClientOption): string {
  return String(c._id ?? c.id ?? "");
}

function buildInvoiceDate(dateValue: string) {
  const now = new Date();
  const savedDate = new Date((dateValue || new Date().toISOString().split("T")[0]) + "T00:00:00");
  savedDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
  return savedDate.toISOString();
}

function emptyLineItem(): InvoiceLineItem {
  return { description: "", quantity: 1, unitPrice: 0, amount: 0 };
}

function computeLineItems(items: InvoiceLineItem[]) {
  return items
    .map((row) => {
      const quantity = Number(row.quantity) || 0;
      const unitPrice = Number(row.unitPrice) || 0;
      const amount = quantity * unitPrice;
      return { ...row, quantity, unitPrice, amount };
    })
    .filter((row) => row.description.trim());
}

function sortInvoices(list: InvoiceEntry[]) {
  const order = { overdue: 0, sent: 1, draft: 2, paid: 3 };
  return [...list].sort((a, b) => {
    const aOrder = order[a.status || "draft"] ?? 2;
    const bOrder = order[b.status || "draft"] ?? 2;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });
}

function statusStyle(status?: string) {
  switch (status) {
    case "paid":
      return "text-emerald-600 font-medium";
    case "sent":
      return "text-sky-600 font-medium";
    case "overdue":
      return "text-red-600 font-medium";
    default:
      return "text-gray-500 font-medium";
  }
}

export function InvoicesTab() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const { items: invoices, isLoading, add, update, remove, refresh, setItems } = useApi<InvoiceEntry>({
    endpoint: "invoices",
    defaultValue: [],
  });
  const { items: clients } = useApi<ClientOption>({ endpoint: "clients", defaultValue: [] });

  const [title, setTitle] = useState("");
  const [clientId, setClientId] = useState("");
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([emptyLineItem()]);
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [note, setNote] = useState("");
  const [terms, setTerms] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<string>("monthly");
  const [open, setOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [editing, setEditing] = useState<InvoiceEntry | null>(null);
  const [paying, setPaying] = useState<InvoiceEntry | null>(null);
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
  } = useDeleteConfirm<InvoiceEntry>();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [bankAccountName, setBankAccountName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [accountId, setAccountId] = useState("");
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [payReceiptFile, setPayReceiptFile] = useState<File | null>(null);

  const sortedInvoices = useMemo(() => sortInvoices(invoices), [invoices]);
  const { query: pageSearchQuery } = usePageSearch();
  const visibleInvoices = useMemo(
    () =>
      filterByPageSearch(sortedInvoices, pageSearchQuery, (entry) => [
        entry.invoiceNumber,
        entry.title,
        entry.clientName,
        entry.clientEmail,
        entry.clientPhone,
        entry.status,
        entry.note,
      ]),
    [sortedInvoices, pageSearchQuery],
  );

  const metrics = useMemo(() => {
    const unpaid = invoices.filter((inv) => inv.status === "sent" || inv.status === "overdue");
    const receivable = unpaid.reduce((s, inv) => s + (Number(inv.amount) || 0), 0);
    const overdue = invoices
      .filter((inv) => inv.status === "overdue")
      .reduce((s, inv) => s + (Number(inv.amount) || 0), 0);
    const drafts = invoices.filter((inv) => inv.status === "draft").length;
    const paid = invoices.filter((inv) => inv.status === "paid").length;
    return { receivable, overdue, drafts, paid };
  }, [invoices]);

  const totalAmount = useMemo(
    () => computeLineItems(lineItems).reduce((s, row) => s + row.amount, 0),
    [lineItems],
  );

  const resetForm = () => {
    setTitle("");
    setClientId("");
    setLineItems([emptyLineItem()]);
    setIssueDate(new Date().toISOString().split("T")[0]);
    setDueDate(new Date().toISOString().split("T")[0]);
    setNote("");
    setTerms("");
    setIsRecurring(false);
    setRecurrenceFrequency("monthly");
    setEditing(null);
  };

  const openCreate = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (entry: InvoiceEntry) => {
    if (entry.status === "paid") return;
    setEditing(entry);
    setTitle(entry.title);
    setClientId(entry.clientId ? String(entry.clientId) : "");
    setLineItems(
      entry.lineItems?.length
        ? entry.lineItems.map((row) => ({ ...row }))
        : [{ description: entry.title, quantity: 1, unitPrice: entry.amount, amount: entry.amount }],
    );
    setIssueDate(String(entry.issueDate).slice(0, 10));
    setDueDate(String(entry.dueDate).slice(0, 10));
    setNote(entry.note || "");
    setTerms(entry.terms || "");
    setIsRecurring(Boolean(entry.isRecurring));
    setRecurrenceFrequency(entry.recurrenceFrequency || "monthly");
    setOpen(true);
  };

  const buildPayload = () => {
    const items = computeLineItems(lineItems);
    return {
      title: title.trim(),
      clientId: clientId || undefined,
      lineItems: items,
      amount: items.reduce((s, row) => s + row.amount, 0),
      issueDate: buildInvoiceDate(issueDate),
      dueDate: buildInvoiceDate(dueDate),
      note: note.trim() || undefined,
      terms: terms.trim() || undefined,
      isRecurring,
      recurrenceFrequency: isRecurring ? recurrenceFrequency : undefined,
    };
  };

  const handleSave = async () => {
    const items = computeLineItems(lineItems);
    if (!title.trim() || items.length === 0) {
      toast({ title: t("saveFailed"), description: t("invoiceRequiredFields"), variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      const payload = buildPayload();
      if (editing) {
        await update({ ...editing, ...payload } as InvoiceEntry);
        toast({ title: t("invoiceUpdated"), description: t("invoiceUpdatedDesc") });
      } else {
        await add(payload as InvoiceEntry);
        toast({ title: t("invoiceCreated"), description: t("invoiceCreatedDesc") });
      }
      window.dispatchEvent(new CustomEvent("finance-should-refresh"));
      resetForm();
      setOpen(false);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t("saveInvoiceFailed");
      toast({ title: t("saveFailed"), description: message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleMarkSent = async (entry: InvoiceEntry) => {
    try {
      const res = await invoiceApi.markSent(invoiceId(entry));
      const updated = (res.data || res) as InvoiceEntry;
      if (updated?._id || updated?.id) {
        setItems(
          invoices.map((invoice) =>
            invoiceId(invoice) === invoiceId(entry) ? { ...invoice, ...updated } : invoice,
          ),
        );
      } else {
        await refresh(true);
      }
      window.dispatchEvent(new CustomEvent("finance-should-refresh"));
      toast({ title: t("invoiceSent"), description: t("invoiceSentDesc") });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t("markInvoiceSentFailed");
      toast({ title: t("saveFailed"), description: message, variant: "destructive" });
    }
  };

  const handleMarkPaid = async () => {
    if (!paying) return;
    setIsPaying(true);
    try {
      let receiptPayload: Record<string, string> = {};
      if (payReceiptFile) {
        receiptPayload = await uploadReceipt(payReceiptFile);
      }
      const res = await invoiceApi.markPaid(invoiceId(paying), {
        ...buildFinancePaymentPayload(paymentMethod, bankAccountName, bankAccountNumber, accountId),
        paymentDate: buildInvoiceDate(paymentDate),
        ...receiptPayload,
      });
      await refresh(true);
      window.dispatchEvent(new CustomEvent("incomes-should-refresh"));
      window.dispatchEvent(new CustomEvent("finance-should-refresh"));
      toast({ title: t("invoicePaid"), description: t("invoicePaidDesc") });
      if (res.data?.nextRecurring) {
        toast({ title: t("recurringInvoiceCreated"), description: t("recurringInvoiceCreatedDesc") });
      }
      setPaying(null);
      setPayOpen(false);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t("markInvoicePaidFailed");
      toast({ title: t("saveFailed"), description: message, variant: "destructive" });
    } finally {
      setIsPaying(false);
    }
  };

  const handleDeleteConfirm = async () => {
    const item = takeTarget();
    if (!item) return;
    const id = invoiceId(item);
    setIsDeleteDeleting(true);
    setDeletingId(id);
    try {
      await remove(item);
      toast({ title: t("deleted"), description: t("invoiceRemovedDesc") });
      window.dispatchEvent(new CustomEvent("finance-should-refresh"));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t("deleteInvoiceFailed");
      toast({ title: t("error"), description: message, variant: "destructive" });
    } finally {
      setDeletingId(null);
      setIsDeleteDeleting(false);
    }
  };

  const handleDownloadPdf = (entry: InvoiceEntry) => {
    downloadInvoicePdf({
      invoiceNumber: entry.invoiceNumber,
      title: entry.title,
      clientName: entry.clientName,
      clientEmail: entry.clientEmail,
      clientPhone: entry.clientPhone,
      lineItems: entry.lineItems || [],
      amount: entry.amount,
      issueDate: entry.issueDate,
      dueDate: entry.dueDate,
      status: entry.status,
      note: entry.note,
      terms: entry.terms,
    });
  };

  const renderTable = () => {
    if (isLoading) return <FinanceTableLoading />;
    if (visibleInvoices.length === 0) {
      return (
        <div className="p-12 text-center text-muted-foreground">
          <p className="font-medium">{t("noInvoicesYet")}</p>
          <p className="text-sm mt-1">{t("invoicesEmptyHint")}</p>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px] border-collapse">
          <thead>
            <tr>
              <th className={cn(FINANCE_TH_CLASS, "w-10 pl-4")}>
                <FinanceTableCheckbox
                  checked={visibleInvoices.length > 0 && visibleInvoices.every((e) => selectedIds.has(invoiceId(e)))}
                  onCheckedChange={() => {
                    if (visibleInvoices.every((e) => selectedIds.has(invoiceId(e)))) setSelectedIds(new Set());
                    else setSelectedIds(new Set(visibleInvoices.map((e) => invoiceId(e))));
                  }}
                  ariaLabel="Select all"
                />
              </th>
              <th className={FINANCE_TH_CLASS}>{t("invoiceNumber")}</th>
              <th className={FINANCE_TH_CLASS}>{t("customer")}</th>
              <th className={FINANCE_TH_CLASS}>{t("invoiceTitle")}</th>
              <th className={FINANCE_TH_CLASS}>{t("dueDate")}</th>
              <th className={FINANCE_TH_CLASS}>{t("invoiceStatus")}</th>
              <th className={cn(FINANCE_TH_CLASS, "text-right")}>{t("amount")}</th>
              <th className={cn(FINANCE_TH_CLASS, "w-10 pr-4")} />
            </tr>
          </thead>
          <tbody className="bg-white">
            {visibleInvoices.map((entry) => {
              const id = invoiceId(entry);
              return (
                <tr key={id} className="border-t border-gray-100 hover:bg-gray-50/80">
                  <td className={cn(FINANCE_TD_CLASS, "pl-4")}>
                    <FinanceTableCheckbox
                      checked={selectedIds.has(id)}
                      onCheckedChange={() => {
                        setSelectedIds((prev) => {
                          const next = new Set(prev);
                          if (next.has(id)) next.delete(id);
                          else next.add(id);
                          return next;
                        });
                      }}
                      ariaLabel={`Select ${entry.invoiceNumber}`}
                    />
                  </td>
                  <td className={cn(FINANCE_TD_CLASS, "font-mono text-xs")}>{entry.invoiceNumber}</td>
                  <td className={cn(FINANCE_TD_CLASS, "max-w-[140px] truncate")}>{entry.clientName || "—"}</td>
                  <td className={cn(FINANCE_TD_CLASS, "max-w-[160px] truncate font-medium")}>{entry.title}</td>
                  <td className={FINANCE_TD_CLASS}>{formatFinanceTableDate(entry.dueDate)}</td>
                  <td className={cn(FINANCE_TD_CLASS, statusStyle(entry.status))}>
                    {t(`invoiceStatus_${entry.status || "draft"}`)}
                  </td>
                  <td className={cn(FINANCE_TD_CLASS, "text-right font-semibold tabular-nums text-emerald-700")}>
                    {formatCurrency(Number(entry.amount) || 0)}
                  </td>
                  <td className={cn(FINANCE_TD_CLASS, "pr-4")}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical size={16} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleDownloadPdf(entry)}>
                          <FileDown className="mr-2 h-4 w-4" />
                          {t("downloadPdf")}
                        </DropdownMenuItem>
                        {entry.status === "draft" ? (
                          <DropdownMenuItem onClick={() => void handleMarkSent(entry)}>
                            <Send className="mr-2 h-4 w-4" />
                            {t("markAsSent")}
                          </DropdownMenuItem>
                        ) : null}
                        {entry.status !== "paid" && entry.status !== "draft" ? (
                          <DropdownMenuItem
                            onClick={() => {
                              setPaying(entry);
                              setPayOpen(true);
                            }}
                          >
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            {t("markAsPaid")}
                          </DropdownMenuItem>
                        ) : null}
                        {entry.status !== "paid" ? (
                          <>
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
                          </>
                        ) : null}
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

  return (
    <>
      <div className="mb-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="border border-gray-200 bg-white px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{t("unpaidInvoices")}</p>
          <p className="text-xl font-bold text-sky-700 tabular-nums mt-1"><CurrencyAmount amount={metrics.receivable} codeFirst codeClassName="text-sky-700/70" /></p>
        </div>
        <div className="border border-gray-200 bg-white px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{t("overdue")}</p>
          <p className="text-xl font-bold text-red-600 tabular-nums mt-1"><CurrencyAmount amount={metrics.overdue} codeFirst codeClassName="text-red-600/70" /></p>
        </div>
        <div className="border border-gray-200 bg-white px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{t("invoiceStatus_draft")}</p>
          <p className="text-xl font-bold text-gray-700 tabular-nums mt-1">{metrics.drafts}</p>
        </div>
        <div className="border border-gray-200 bg-white px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{t("invoiceStatus_paid")}</p>
          <p className="text-xl font-bold text-emerald-700 tabular-nums mt-1">{metrics.paid}</p>
        </div>
      </div>

      <FinanceTableShell
        title={t("invoices")}
        onAdd={openCreate}
        addLabel={t("add")}
        onRefresh={() => void refresh(true)}
        isRefreshing={isRefreshing}
      >
        {renderTable()}
      </FinanceTableShell>

      <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); setOpen(v); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? t("editInvoice") : t("createInvoice")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2 sm:col-span-2">
                <Label>{t("invoiceTitle")}</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t("customer")}</Label>
                <Select value={clientId || "none"} onValueChange={(v) => setClientId(v === "none" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder={t("selectCustomer")} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t("other")}</SelectItem>
                    {clients.map((c) => (
                      <SelectItem key={clientOptionId(c)} value={clientOptionId(c)}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("dueDate")}</Label>
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t("issueDate")}</Label>
                <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{t("lineItems")}</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setLineItems((prev) => [...prev, emptyLineItem()])}
                >
                  <Plus size={14} className="mr-1" />
                  {t("addLine")}
                </Button>
              </div>
              <div className="space-y-2 border border-gray-200 p-3">
                {lineItems.map((row, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-5">
                      <Input
                        placeholder={t("description")}
                        value={row.description}
                        onChange={(e) => {
                          const next = [...lineItems];
                          next[index] = { ...next[index], description: e.target.value };
                          setLineItems(next);
                        }}
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        min={0}
                        placeholder="Qty"
                        value={row.quantity}
                        onChange={(e) => {
                          const next = [...lineItems];
                          next[index] = { ...next[index], quantity: Number(e.target.value) };
                          setLineItems(next);
                        }}
                      />
                    </div>
                    <div className="col-span-3">
                      <Input
                        type="number"
                        min={0}
                        placeholder={t("unitPrice")}
                        value={row.unitPrice || ""}
                        onChange={(e) => {
                          const next = [...lineItems];
                          next[index] = { ...next[index], unitPrice: Number(e.target.value) };
                          setLineItems(next);
                        }}
                      />
                    </div>
                    <div className="col-span-2 text-right text-sm font-medium tabular-nums">
                      {formatCurrency((row.quantity || 0) * (row.unitPrice || 0))}
                    </div>
                  </div>
                ))}
                <p className="text-right text-sm font-semibold">{t("total")}: <CurrencyAmount amount={totalAmount} codeFirst /></p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="recurring"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="recurring">{t("recurringInvoice")}</Label>
              {isRecurring ? (
                <Select value={recurrenceFrequency} onValueChange={setRecurrenceFrequency}>
                  <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">{t("budgetPeriodMonthly")}</SelectItem>
                    <SelectItem value="quarterly">{t("budgetPeriodQuarterly")}</SelectItem>
                    <SelectItem value="yearly">{t("budgetPeriodYearly")}</SelectItem>
                  </SelectContent>
                </Select>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label>{t("note")}</Label>
              <Input value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t("paymentTerms")}</Label>
              <Input value={terms} onChange={(e) => setTerms(e.target.value)} placeholder={t("paymentTermsPlaceholder")} />
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

      <Dialog open={payOpen} onOpenChange={(v) => { if (!v) setPaying(null); setPayOpen(v); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("markAsPaid")}</DialogTitle>
          </DialogHeader>
          {paying ? (
            <div className="space-y-4 py-2">
              <p className="text-sm font-medium">{paying.invoiceNumber} — {formatCurrency(paying.amount)}</p>
              <div className="space-y-2">
                <Label>{t("paymentDate")}</Label>
                <Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
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
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="cancel" onClick={() => { setPaying(null); setPayOpen(false); }}>{t("cancel")}</Button>
            <Button onClick={() => void handleMarkPaid()} disabled={isPaying}>
              {isPaying ? <Loader2 className="h-4 w-4 animate-spin" /> : t("markAsPaid")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={handleDeleteOpenChange}
        title={t("deleteConfirmTitle")}
        description={t("deleteConfirmDesc").replace("{name}", deleteTarget?.invoiceNumber ?? "")}
        confirmLabel={t("delete")}
        cancelLabel={t("cancel")}
        deletingLabel={t("deleting")}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleteDeleting}
      />
    </>
  );
}
