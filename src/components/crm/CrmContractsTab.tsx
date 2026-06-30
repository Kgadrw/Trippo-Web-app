import { useCallback, useEffect, useMemo, useState } from "react";
import { crmApi } from "@/lib/api";
import {
  CONTRACT_STATUSES,
  contractStatusLabel,
  type ContractRecord,
  type CrmContactRecord,
} from "@/lib/crmWorkflow";
import { useTranslation } from "@/hooks/useTranslation";
import { useToast } from "@/hooks/use-toast";
import { usePageSearch } from "@/hooks/usePageSearch";
import { filterByPageSearch } from "@/lib/pageSearch";
import { HelpTip } from "@/components/ui/help-tip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { formatCurrency } from "@/lib/currency";
import { formatFinanceTableDate, FINANCE_TD_CLASS, FINANCE_TH_CLASS, FinanceTableLoading, FinanceTableShell } from "@/components/finance/financeTable";
import { Loader2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { filterSelectClass } from "@/lib/fieldStyles";

export function CrmContractsTab() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { query: pageSearchQuery } = usePageSearch();
  const [contracts, setContracts] = useState<ContractRecord[]>([]);
  const [contacts, setContacts] = useState<CrmContactRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [clientId, setClientId] = useState("");
  const [status, setStatus] = useState("draft");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [renewalDate, setRenewalDate] = useState("");
  const [value, setValue] = useState("");
  const [notes, setNotes] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [contractsRes, contactsRes] = await Promise.all([
        crmApi.getContracts(statusFilter !== "all" ? { status: statusFilter } : undefined),
        crmApi.getContacts(),
      ]);
      setContracts((contractsRes.data as ContractRecord[]) || []);
      setContacts((contactsRes.data as CrmContactRecord[]) || []);
    } catch {
      toast({ title: t("crmLoadFailed"), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [statusFilter, toast, t]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filtered = useMemo(
    () =>
      filterByPageSearch(contracts, pageSearchQuery, (c) => [
        c.title,
        typeof c.clientId === "object" ? c.clientId.name : "",
        c.status,
        c.notes,
      ]),
    [contracts, pageSearchQuery],
  );

  const handleCreate = async () => {
    if (!title.trim() || !clientId) return;
    setSaving(true);
    try {
      await crmApi.createContract({
        title: title.trim(),
        clientId,
        status,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        renewalDate: renewalDate || undefined,
        value: Number(value) || 0,
        notes: notes.trim(),
      });
      setDialogOpen(false);
      setTitle("");
      setClientId("");
      setStatus("draft");
      setStartDate("");
      setEndDate("");
      setRenewalDate("");
      setValue("");
      setNotes("");
      void loadData();
      toast({ title: t("crmContractCreated") });
    } catch {
      toast({ title: t("crmSaveFailed"), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const activateContract = async (contract: ContractRecord) => {
    try {
      await crmApi.updateContract(contract._id, { status: "active" });
      void loadData();
    } catch {
      toast({ title: t("crmSaveFailed"), variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5">
            <h2 className="text-lg font-semibold text-gray-900">{t("crmContractsTitle")}</h2>
            <HelpTip text={t("helpCrmContracts")} />
          </div>
          <p className="text-sm text-gray-500">{t("crmContractsSubtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className={cn(filterSelectClass, "w-[150px]")}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("crmAllStatuses")}</SelectItem>
              {CONTRACT_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{contractStatusLabel(s, t)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            {t("crmAddContract")}
          </Button>
        </div>
      </div>

      <FinanceTableShell>
        {loading ? (
          <FinanceTableLoading />
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-500">{t("crmNoContracts")}</div>
        ) : (
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/80">
                <th className={FINANCE_TH_CLASS}>{t("crmContractTitle")}</th>
                <th className={FINANCE_TH_CLASS}>{t("customer")}</th>
                <th className={FINANCE_TH_CLASS}>{t("crmContractStatus")}</th>
                <th className={FINANCE_TH_CLASS}>{t("crmContractValue")}</th>
                <th className={FINANCE_TH_CLASS}>{t("crmRenewalDate")}</th>
                <th className={FINANCE_TH_CLASS} />
              </tr>
            </thead>
            <tbody>
              {filtered.map((contract) => (
                <tr key={contract._id} className="border-b border-gray-100">
                  <td className={FINANCE_TD_CLASS}>{contract.title}</td>
                  <td className={FINANCE_TD_CLASS}>
                    {typeof contract.clientId === "object" ? contract.clientId.name : "—"}
                  </td>
                  <td className={FINANCE_TD_CLASS}>{contractStatusLabel(contract.status || "draft", t)}</td>
                  <td className={FINANCE_TD_CLASS}>{formatCurrency(contract.value || 0)}</td>
                  <td className={FINANCE_TD_CLASS}>
                    {contract.renewalDate ? formatFinanceTableDate(contract.renewalDate) : "—"}
                  </td>
                  <td className={FINANCE_TD_CLASS}>
                    {contract.status === "draft" && (
                      <Button size="sm" variant="outline" onClick={() => void activateContract(contract)}>
                        {t("crmActivateContract")}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </FinanceTableShell>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{t("crmAddContract")}</DialogTitle></DialogHeader>
          <div className="grid gap-3 py-2">
            <div>
              <Label>{t("crmContractTitle")}</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div>
              <Label>{t("customer")}</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger><SelectValue placeholder={t("selectCustomer")} /></SelectTrigger>
                <SelectContent>
                  {contacts.map((c) => (
                    <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t("crmContractStart")}</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div>
                <Label>{t("crmContractEnd")}</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t("crmRenewalDate")}</Label>
                <Input type="date" value={renewalDate} onChange={(e) => setRenewalDate(e.target.value)} />
              </div>
              <div>
                <Label>{t("crmContractValue")}</Label>
                <Input type="number" min="0" value={value} onChange={(e) => setValue(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>{t("notes")}</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t("cancel")}</Button>
            <Button onClick={() => void handleCreate()} disabled={saving}>{t("save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
