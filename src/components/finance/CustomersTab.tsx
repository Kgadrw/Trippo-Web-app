import { useEffect, useMemo, useState } from "react";
import { useApi } from "@/hooks/useApi";
import { clientApi } from "@/lib/api";
import { clearStore } from "@/lib/indexedDB";
import { apiCache } from "@/lib/apiCache";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";
import { Plus, Loader2, MoreVertical, Pencil, Trash2, FileDown, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency, CurrencyAmount } from "@/lib/currency";
import { downloadClientStatementPdf } from "@/lib/invoicePdf";
import type { InvoiceEntry } from "@/components/finance/InvoicesTab";
import { filterByPageSearch } from "@/lib/pageSearch";
import { usePageSearch } from "@/hooks/usePageSearch";
import {
  FINANCE_TH_CLASS,
  FINANCE_TD_CLASS,
  formatFinanceTableDate,
  FinanceTableLoading,
  FinanceTableShell,
} from "@/components/finance/financeTable";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { useDeleteConfirm } from "@/hooks/useDeleteConfirm";

export interface CustomerEntry {
  id?: number;
  _id?: string;
  name: string;
  email?: string;
  phone?: string;
  businessType?: string;
  notes?: string;
}

function customerId(c: CustomerEntry): string {
  return String(c._id ?? c.id ?? "");
}

function customerDedupeKey(c: CustomerEntry): string {
  const name = (c.name || "").trim().toLowerCase();
  const email = (c.email || "").trim().toLowerCase();
  const phone = (c.phone || "").replace(/\D/g, "");
  return `${name}|${email}|${phone}`;
}

export function CustomersTab() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const { items: customers, isLoading, add, update, remove, refresh } = useApi<CustomerEntry>({
    endpoint: "clients",
    defaultValue: [],
  });
  const { items: invoices } = useApi<InvoiceEntry>({ endpoint: "invoices", defaultValue: [] });

  const { query: pageSearchQuery } = usePageSearch();
  const visibleCustomers = useMemo(() => {
    const seen = new Set<string>();
    const unique = customers.filter((entry) => {
      const dedupeKey = customerDedupeKey(entry);
      if (seen.has(dedupeKey)) return false;
      seen.add(dedupeKey);
      return true;
    });
    return filterByPageSearch(unique, pageSearchQuery, (entry) => [
      entry.name,
      entry.email,
      entry.phone,
      entry.businessType,
      entry.notes,
    ]);
  }, [customers, pageSearchQuery]);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CustomerEntry | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [viewing, setViewing] = useState<CustomerEntry | null>(null);
  const [activity, setActivity] = useState<{
    invoices: InvoiceEntry[];
    incomes: { title: string; amount: number; date: string }[];
    outstanding: number;
    totalPaid: number;
  } | null>(null);
  const [activityLoading, setActivityLoading] = useState(false);
  const {
    target: deleteTarget,
    open: deleteOpen,
    isDeleting: isDeleteDeleting,
    setIsDeleting: setIsDeleteDeleting,
    requestDelete,
    takeTarget,
    handleOpenChange: handleDeleteOpenChange,
  } = useDeleteConfirm<CustomerEntry>();

  // Clear stale local client copies once, then reload from API
  useEffect(() => {
    void (async () => {
      try {
        await clearStore("clients");
        apiCache.invalidateStore("clients");
        localStorage.setItem("profit-pilot-clients-changed", "true");
        await refresh(true);
      } catch {
        // IndexedDB optional
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const balances = useMemo(() => {
    const map = new Map<string, number>();
    for (const inv of invoices) {
      if (inv.status !== "sent" && inv.status !== "overdue") continue;
      const cid = inv.clientId ? String(inv.clientId) : "";
      if (!cid) continue;
      map.set(cid, (map.get(cid) || 0) + (Number(inv.amount) || 0));
    }
    return map;
  }, [invoices]);

  const resetForm = () => {
    setName("");
    setEmail("");
    setPhone("");
    setNotes("");
    setEditing(null);
  };

  const openCreate = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (entry: CustomerEntry) => {
    setEditing(entry);
    setName(entry.name);
    setEmail(entry.email || "");
    setPhone(entry.phone || "");
    setNotes(entry.notes || "");
    setOpen(true);
  };

  const openActivity = async (entry: CustomerEntry) => {
    setViewing(entry);
    setActivityLoading(true);
    try {
      const res = await clientApi.getActivity(customerId(entry));
      if (res.data) {
        setActivity({
          invoices: res.data.invoices || [],
          incomes: res.data.incomes || [],
          outstanding: res.data.outstanding || 0,
          totalPaid: res.data.totalPaid || 0,
        });
      }
    } catch {
      toast({ title: t("error"), description: t("loadCustomerActivityFailed"), variant: "destructive" });
    } finally {
      setActivityLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast({ title: t("saveFailed"), description: t("customerNameRequired"), variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        name: name.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        notes: notes.trim() || undefined,
        businessType: "General",
        clientType: "debtor",
      };
      if (editing) {
        await update({ ...editing, ...payload } as CustomerEntry);
        toast({ title: t("customerUpdated"), description: t("customerUpdatedDesc") });
      } else {
        await add(payload as CustomerEntry);
        toast({ title: t("customerCreated"), description: t("customerCreatedDesc") });
      }
      resetForm();
      setOpen(false);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t("saveCustomerFailed");
      toast({ title: t("saveFailed"), description: message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    const item = takeTarget();
    if (!item) return;
    setIsDeleteDeleting(true);
    try {
      await remove(item);
      toast({ title: t("deleted"), description: t("customerRemovedDesc") });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t("deleteCustomerFailed");
      toast({ title: t("error"), description: message, variant: "destructive" });
    } finally {
      setIsDeleteDeleting(false);
    }
  };

  const handleStatementPdf = () => {
    if (!viewing || !activity) return;
    downloadClientStatementPdf(
      viewing.name,
      activity.invoices.map((inv) => ({
        invoiceNumber: inv.invoiceNumber,
        title: inv.title,
        clientName: inv.clientName,
        lineItems: inv.lineItems || [],
        amount: inv.amount,
        issueDate: inv.issueDate,
        dueDate: inv.dueDate,
        status: inv.status,
      })),
      activity.incomes,
      activity.outstanding,
    );
  };

  const renderTable = () => {
    if (isLoading) return <FinanceTableLoading />;
    if (customers.length === 0) {
      return (
        <div className="p-12 text-center text-muted-foreground">
          <p className="font-medium">{t("noCustomersYet")}</p>
          <p className="text-sm mt-1">{t("customersEmptyHint")}</p>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px] border-collapse">
          <thead>
            <tr>
              <th className={FINANCE_TH_CLASS}>{t("customerName")}</th>
              <th className={cn(FINANCE_TH_CLASS, "hidden sm:table-cell")}>{t("email")}</th>
              <th className={cn(FINANCE_TH_CLASS, "hidden md:table-cell")}>{t("phone")}</th>
              <th className={cn(FINANCE_TH_CLASS, "text-right")}>{t("balanceDue")}</th>
              <th className={cn(FINANCE_TH_CLASS, "w-10 pr-4")} />
            </tr>
          </thead>
          <tbody className="bg-white">
            {visibleCustomers.map((entry) => {
              const id = customerId(entry);
              const balance = balances.get(id) || 0;
              return (
                <tr key={id} className="border-t border-gray-100 hover:bg-gray-50/80">
                  <td className={cn(FINANCE_TD_CLASS, "font-medium")}>{entry.name}</td>
                  <td className={cn(FINANCE_TD_CLASS, "hidden sm:table-cell text-gray-600")}>{entry.email || "—"}</td>
                  <td className={cn(FINANCE_TD_CLASS, "hidden md:table-cell text-gray-600")}>{entry.phone || "—"}</td>
                  <td className={cn(FINANCE_TD_CLASS, "text-right font-semibold tabular-nums", balance > 0 ? "text-amber-700" : "text-gray-500")}>
                    {formatCurrency(balance)}
                  </td>
                  <td className={cn(FINANCE_TD_CLASS, "pr-4")}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical size={16} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => void openActivity(entry)}>
                          <Eye className="mr-2 h-4 w-4" />
                          {t("viewStatement")}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEdit(entry)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          {t("edit")}
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600" onClick={() => requestDelete(entry)}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          {t("delete")}
                        </DropdownMenuItem>
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
      <FinanceTableShell
        title={t("customers")}
        onAdd={openCreate}
        addLabel={t("add")}
        onRefresh={() => void refresh(true)}
        isRefreshing={isRefreshing}
      >
        {renderTable()}
      </FinanceTableShell>

      <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); setOpen(v); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? t("editCustomer") : t("addCustomer")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label>{t("customerName")}</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t("email")}</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t("phone")}</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t("note")}</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
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

      <Dialog
        open={Boolean(viewing)}
        onOpenChange={(v) => {
          if (!v) {
            setViewing(null);
            setActivity(null);
          }
        }}
      >
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewing?.name}</DialogTitle>
          </DialogHeader>
          {activityLoading ? (
            <div className="py-8 text-center text-sm text-gray-500">{t("loading")}</div>
          ) : activity ? (
            <div className="space-y-4 py-2 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div className="border border-gray-200 px-3 py-2">
                  <p className="text-xs text-gray-500">{t("balanceDue")}</p>
                  <p className="font-bold text-amber-700"><CurrencyAmount amount={activity.outstanding} codeFirst codeClassName="text-amber-700/70" /></p>
                </div>
                <div className="border border-gray-200 px-3 py-2">
                  <p className="text-xs text-gray-500">{t("totalPaid")}</p>
                  <p className="font-bold text-emerald-700"><CurrencyAmount amount={activity.totalPaid} codeFirst codeClassName="text-emerald-700/70" /></p>
                </div>
              </div>
              <div>
                <p className="font-medium mb-2">{t("invoices")}</p>
                {activity.invoices.length === 0 ? (
                  <p className="text-gray-400">{t("noInvoicesYet")}</p>
                ) : (
                  <ul className="divide-y divide-gray-100 border border-gray-200">
                    {activity.invoices.map((inv) => (
                      <li key={invoiceId(inv)} className="flex justify-between px-3 py-2">
                        <span>{inv.invoiceNumber} · {formatFinanceTableDate(inv.dueDate)}</span>
                        <span className="font-medium">{formatCurrency(inv.amount)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <p className="font-medium mb-2">{t("paymentHistory")}</p>
                {activity.incomes.length === 0 ? (
                  <p className="text-gray-400">{t("noPaymentsYet")}</p>
                ) : (
                  <ul className="divide-y divide-gray-100 border border-gray-200">
                    {activity.incomes.map((row, i) => (
                      <li key={i} className="flex justify-between px-3 py-2">
                        <span>{row.title} · {formatFinanceTableDate(row.date)}</span>
                        <span className="text-emerald-700 font-medium">{formatCurrency(row.amount)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={handleStatementPdf} disabled={!activity}>
              <FileDown className="mr-2 h-4 w-4" />
              {t("downloadStatement")}
            </Button>
            <Button variant="cancel" onClick={() => { setViewing(null); setActivity(null); }}>
              {t("close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={handleDeleteOpenChange}
        title={t("deleteConfirmTitle")}
        description={t("deleteConfirmDesc").replace("{name}", deleteTarget?.name ?? "")}
        confirmLabel={t("delete")}
        cancelLabel={t("cancel")}
        deletingLabel={t("deleting")}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleteDeleting}
      />
    </>
  );
}

function invoiceId(inv: InvoiceEntry): string {
  return String(inv._id ?? inv.id ?? inv.invoiceNumber);
}
