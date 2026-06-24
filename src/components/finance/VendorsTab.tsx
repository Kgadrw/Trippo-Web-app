import { useMemo, useState } from "react";
import { useApi } from "@/hooks/useApi";
import { vendorApi } from "@/lib/api";
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
import { downloadVendorStatementPdf } from "@/lib/invoicePdf";
import type { BillEntry } from "@/components/finance/BillsTab";
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

export interface VendorEntry {
  id?: number;
  _id?: string;
  name: string;
  email?: string;
  phone?: string;
  notes?: string;
}

function vendorId(v: VendorEntry): string {
  return String(v._id ?? v.id ?? "");
}

export function VendorsTab() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const { items: vendors, isLoading, add, update, remove, refresh } = useApi<VendorEntry>({
    endpoint: "vendors",
    defaultValue: [],
  });
  const { items: bills } = useApi<BillEntry>({ endpoint: "bills", defaultValue: [] });

  const { query: pageSearchQuery } = usePageSearch();
  const visibleVendors = useMemo(
    () =>
      filterByPageSearch(vendors, pageSearchQuery, (entry) => [
        entry.name,
        entry.email,
        entry.phone,
        entry.notes,
      ]),
    [vendors, pageSearchQuery],
  );

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<VendorEntry | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [viewing, setViewing] = useState<VendorEntry | null>(null);
  const [activity, setActivity] = useState<{
    bills: BillEntry[];
    expenses: { title: string; amount: number; date: string }[];
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
  } = useDeleteConfirm<VendorEntry>();

  const outstandingByVendor = useMemo(() => {
    const map = new Map<string, number>();
    for (const bill of bills) {
      if (bill.status === "paid") continue;
      const vid = bill.vendorId ? String(bill.vendorId) : "";
      if (!vid) continue;
      map.set(vid, (map.get(vid) || 0) + (Number(bill.amount) || 0));
    }
    return map;
  }, [bills]);

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

  const openEdit = (entry: VendorEntry) => {
    setEditing(entry);
    setName(entry.name);
    setEmail(entry.email || "");
    setPhone(entry.phone || "");
    setNotes(entry.notes || "");
    setOpen(true);
  };

  const openActivity = async (entry: VendorEntry) => {
    setViewing(entry);
    setActivityLoading(true);
    try {
      const res = await vendorApi.getActivity(vendorId(entry));
      if (res.data) {
        setActivity({
          bills: res.data.bills || [],
          expenses: res.data.expenses || [],
          outstanding: res.data.outstanding || 0,
          totalPaid: res.data.totalPaid || 0,
        });
      }
    } catch {
      toast({ title: t("error"), description: t("loadVendorActivityFailed"), variant: "destructive" });
    } finally {
      setActivityLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast({ title: t("saveFailed"), description: t("vendorNameRequired"), variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        name: name.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        notes: notes.trim() || undefined,
      };
      if (editing) {
        await update({ ...editing, ...payload } as VendorEntry);
        toast({ title: t("vendorUpdated"), description: t("vendorUpdatedDesc") });
      } else {
        await add(payload as VendorEntry);
        toast({ title: t("vendorCreated"), description: t("vendorCreatedDesc") });
      }
      resetForm();
      setOpen(false);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t("saveVendorFailed");
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
      toast({ title: t("deleted"), description: t("vendorRemovedDesc") });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t("deleteVendorFailed");
      toast({ title: t("error"), description: message, variant: "destructive" });
    } finally {
      setIsDeleteDeleting(false);
    }
  };

  const handleStatementPdf = () => {
    if (!viewing || !activity) return;
    downloadVendorStatementPdf(
      viewing.name,
      activity.bills.map((bill) => ({
        title: bill.title,
        amount: bill.amount,
        dueDate: bill.dueDate,
        status: bill.status,
      })),
      activity.expenses,
      activity.outstanding,
    );
  };

  const renderTable = () => {
    if (isLoading) return <FinanceTableLoading />;
    if (vendors.length === 0) {
      return (
        <div className="p-12 text-center text-muted-foreground">
          <p className="font-medium">{t("noVendorsYet")}</p>
          <p className="text-sm mt-1">{t("vendorsEmptyHint")}</p>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px] border-collapse">
          <thead>
            <tr>
              <th className={FINANCE_TH_CLASS}>{t("vendorName")}</th>
              <th className={cn(FINANCE_TH_CLASS, "hidden sm:table-cell")}>{t("email")}</th>
              <th className={cn(FINANCE_TH_CLASS, "hidden md:table-cell")}>{t("phone")}</th>
              <th className={cn(FINANCE_TH_CLASS, "text-right")}>{t("balanceDue")}</th>
              <th className={cn(FINANCE_TH_CLASS, "w-10 pr-4")} />
            </tr>
          </thead>
          <tbody className="bg-white">
            {visibleVendors.map((entry) => {
              const id = vendorId(entry);
              const outstanding = outstandingByVendor.get(id) || 0;
              return (
                <tr key={id} className="border-t border-gray-100 hover:bg-gray-50/80">
                  <td className={cn(FINANCE_TD_CLASS, "font-medium")}>{entry.name}</td>
                  <td className={cn(FINANCE_TD_CLASS, "hidden sm:table-cell text-gray-600")}>{entry.email || "—"}</td>
                  <td className={cn(FINANCE_TD_CLASS, "hidden md:table-cell text-gray-600")}>{entry.phone || "—"}</td>
                  <td className={cn(FINANCE_TD_CLASS, "text-right font-semibold tabular-nums", outstanding > 0 ? "text-amber-700" : "text-gray-500")}>
                    {formatCurrency(outstanding)}
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
        title={t("vendors")}
        onAdd={openCreate}
        addLabel={t("add")}
        onRefresh={() => void refresh(true)}
        isRefreshing={false}
      >
        {renderTable()}
      </FinanceTableShell>

      <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); setOpen(v); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? t("editVendor") : t("addVendor")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label>{t("vendorName")}</Label>
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
                <p className="font-medium mb-2">{t("bills")}</p>
                {activity.bills.length === 0 ? (
                  <p className="text-gray-400">{t("noBillsYet")}</p>
                ) : (
                  <ul className="divide-y divide-gray-100 border border-gray-200">
                    {activity.bills.map((bill) => (
                      <li key={billId(bill)} className="flex justify-between px-3 py-2">
                        <span>{bill.title} · {formatFinanceTableDate(bill.dueDate)} · {(bill.status || "pending").toUpperCase()}</span>
                        <span className="font-medium">{formatCurrency(bill.amount)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <p className="font-medium mb-2">{t("paymentHistory")}</p>
                {activity.expenses.length === 0 ? (
                  <p className="text-gray-400">{t("noPaymentsYet")}</p>
                ) : (
                  <ul className="divide-y divide-gray-100 border border-gray-200">
                    {activity.expenses.map((row, i) => (
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

function billId(bill: BillEntry): string {
  return String(bill._id ?? bill.id ?? bill.title);
}
