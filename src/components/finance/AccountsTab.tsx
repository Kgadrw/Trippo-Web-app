import { useMemo, useState } from "react";
import { filterByPageSearch } from "@/lib/pageSearch";
import { usePageSearch } from "@/hooks/usePageSearch";
import { useApi } from "@/hooks/useApi";
import { accountApi } from "@/lib/api";
import { invalidateAccountOptionsCache } from "@/hooks/useAccountOptions";
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
import { Plus, Loader2, MoreVertical, Pencil, Trash2, ArrowLeftRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/currency";
import {
  FINANCE_TH_CLASS,
  FINANCE_TD_CLASS,
  FinanceTableLoading,
  FinanceTableShell,
} from "@/components/finance/financeTable";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { useDeleteConfirm } from "@/hooks/useDeleteConfirm";

export interface AccountEntry {
  id?: number;
  _id?: string;
  name: string;
  type: "cash" | "bank" | "momo" | "airtel";
  institution?: string;
  accountNumber?: string;
  openingBalance?: number;
  balance?: number;
  isDefault?: boolean;
  notes?: string;
}

function accountId(a: AccountEntry): string {
  return String(a._id ?? a.id ?? "");
}

const TYPE_LABELS: Record<string, string> = {
  cash: "Cash",
  bank: "Bank",
  momo: "MoMo",
  airtel: "Airtel",
};

export function AccountsTab() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const { items: accounts, isLoading, add, update, remove, refresh } = useApi<AccountEntry>({
    endpoint: "accounts",
    defaultValue: [],
  });

  const { query: pageSearchQuery } = usePageSearch();
  const visibleAccounts = useMemo(
    () =>
      filterByPageSearch(accounts, pageSearchQuery, (entry) => [
        entry.name,
        entry.type,
        entry.institution,
        entry.accountNumber,
        entry.notes,
      ]),
    [accounts, pageSearchQuery],
  );

  const [name, setName] = useState("");
  const [type, setType] = useState<AccountEntry["type"]>("cash");
  const [institution, setInstitution] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [openingBalance, setOpeningBalance] = useState("0");
  const [notes, setNotes] = useState("");
  const [open, setOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [editing, setEditing] = useState<AccountEntry | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [fromAccountId, setFromAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferNote, setTransferNote] = useState("");
  const {
    target: deleteTarget,
    open: deleteOpen,
    isDeleting: isDeleteDeleting,
    setIsDeleting: setIsDeleteDeleting,
    requestDelete,
    takeTarget,
    handleOpenChange: handleDeleteOpenChange,
  } = useDeleteConfirm<AccountEntry>();

  const resetForm = () => {
    setName("");
    setType("cash");
    setInstitution("");
    setAccountNumber("");
    setOpeningBalance("0");
    setNotes("");
    setEditing(null);
  };

  const openCreate = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (entry: AccountEntry) => {
    setEditing(entry);
    setName(entry.name);
    setType(entry.type || "cash");
    setInstitution(entry.institution || "");
    setAccountNumber(entry.accountNumber || "");
    setOpeningBalance(String(entry.openingBalance ?? 0));
    setNotes(entry.notes || "");
    setOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast({ title: t("saveFailed"), description: t("accountNameRequired"), variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        name: name.trim(),
        type,
        institution: institution.trim() || undefined,
        accountNumber: accountNumber.trim() || undefined,
        openingBalance: parseFloat(openingBalance) || 0,
        notes: notes.trim() || undefined,
      };
      if (editing) {
        await update({ ...editing, ...payload } as AccountEntry);
        toast({ title: t("accountUpdated"), description: t("accountUpdatedDesc") });
      } else {
        await add(payload as AccountEntry);
        toast({ title: t("accountCreated"), description: t("accountCreatedDesc") });
      }
      invalidateAccountOptionsCache();
      resetForm();
      setOpen(false);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t("saveAccountFailed");
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
      invalidateAccountOptionsCache();
      toast({ title: t("deleted"), description: t("accountRemovedDesc") });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t("deleteAccountFailed");
      toast({ title: t("error"), description: message, variant: "destructive" });
    } finally {
      setIsDeleteDeleting(false);
    }
  };

  const handleTransfer = async () => {
    const amount = parseFloat(transferAmount);
    if (!fromAccountId || !toAccountId || Number.isNaN(amount) || amount <= 0) {
      toast({ title: t("saveFailed"), description: t("transferInvalid"), variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      await accountApi.createTransfer({
        fromAccountId,
        toAccountId,
        amount,
        note: transferNote.trim() || undefined,
      });
      invalidateAccountOptionsCache();
      toast({ title: t("transferComplete"), description: t("transferCompleteDesc") });
      setTransferOpen(false);
      setFromAccountId("");
      setToAccountId("");
      setTransferAmount("");
      setTransferNote("");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t("transferFailed");
      toast({ title: t("error"), description: message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const renderTable = () => {
    if (isLoading) return <FinanceTableLoading />;
    if (accounts.length === 0) {
      return (
        <div className="p-12 text-center text-muted-foreground">
          <p className="font-medium">{t("noAccountsYet")}</p>
          <p className="text-sm mt-1">{t("accountsEmptyHint")}</p>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px] border-collapse">
          <thead>
            <tr>
              <th className={FINANCE_TH_CLASS}>{t("accountName")}</th>
              <th className={FINANCE_TH_CLASS}>{t("accountType")}</th>
              <th className={cn(FINANCE_TH_CLASS, "hidden sm:table-cell")}>{t("bankAccountNumber")}</th>
              <th className={cn(FINANCE_TH_CLASS, "text-right")}>{t("currentBalance")}</th>
              <th className={cn(FINANCE_TH_CLASS, "w-10 pr-4")} />
            </tr>
          </thead>
          <tbody className="bg-white">
            {visibleAccounts.map((entry) => (
              <tr key={accountId(entry)} className="border-t border-gray-100 hover:bg-gray-50/80">
                <td className={cn(FINANCE_TD_CLASS, "font-medium")}>{entry.name}</td>
                <td className={FINANCE_TD_CLASS}>{TYPE_LABELS[entry.type] || entry.type}</td>
                <td className={cn(FINANCE_TD_CLASS, "hidden sm:table-cell text-gray-600")}>
                  {entry.accountNumber || entry.institution || "—"}
                </td>
                <td className={cn(FINANCE_TD_CLASS, "text-right font-semibold tabular-nums")}>
                  {formatCurrency(entry.balance ?? entry.openingBalance ?? 0)}
                </td>
                <td className={cn(FINANCE_TD_CLASS, "pr-4")}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical size={16} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
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
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <>
      <FinanceTableShell
        title={t("accounts")}
        onAdd={openCreate}
        addLabel={t("add")}
        onRefresh={() => void refresh(true)}
        isRefreshing={false}
        menuItems={[
          { label: t("transferFunds"), onSelect: () => setTransferOpen(true), icon: <ArrowLeftRight className="mr-2 h-4 w-4" /> },
        ]}
      >
        {renderTable()}
      </FinanceTableShell>

      <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); setOpen(v); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? t("editAccount") : t("addAccount")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label>{t("accountName")}</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t("accountType")}</Label>
              <Select value={type} onValueChange={(v) => setType(v as AccountEntry["type"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">{t("cash")}</SelectItem>
                  <SelectItem value="bank">{t("bankTransfer")}</SelectItem>
                  <SelectItem value="momo">{t("momoPay")}</SelectItem>
                  <SelectItem value="airtel">{t("airtelPay")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t("bankAccountName")}</Label>
                <Input value={institution} onChange={(e) => setInstitution(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t("bankAccountNumber")}</Label>
                <Input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} />
              </div>
            </div>
            {!editing ? (
              <div className="space-y-2">
                <Label>{t("openingBalance")}</Label>
                <Input type="number" min="0" value={openingBalance} onChange={(e) => setOpeningBalance(e.target.value)} />
              </div>
            ) : null}
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

      <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("transferFunds")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label>{t("fromAccount")}</Label>
              <Select value={fromAccountId || "none"} onValueChange={(v) => setFromAccountId(v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder={t("selectAccount")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("selectAccount")}</SelectItem>
                  {accounts.map((a) => (
                    <SelectItem key={accountId(a)} value={accountId(a)}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("toAccount")}</Label>
              <Select value={toAccountId || "none"} onValueChange={(v) => setToAccountId(v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder={t("selectAccount")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("selectAccount")}</SelectItem>
                  {accounts.map((a) => (
                    <SelectItem key={accountId(a)} value={accountId(a)}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("amount")}</Label>
              <Input type="number" min="0" value={transferAmount} onChange={(e) => setTransferAmount(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t("note")}</Label>
              <Input value={transferNote} onChange={(e) => setTransferNote(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="cancel" onClick={() => setTransferOpen(false)}>{t("cancel")}</Button>
            <Button onClick={() => void handleTransfer()} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("transfer")}
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
