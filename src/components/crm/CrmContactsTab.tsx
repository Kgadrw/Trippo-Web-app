import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { crmApi } from "@/lib/api";
import {
  LIFECYCLE_STAGES,
  lifecycleClass,
  lifecycleLabel,
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
import { filterSelectClass } from "@/lib/fieldStyles";
import { cn } from "@/lib/utils";
import { Loader2, Plus } from "lucide-react";
import {
  FINANCE_TD_CLASS,
  FINANCE_TH_CLASS,
  FinanceTableLoading,
  FinanceTableShell,
} from "@/components/finance/financeTable";

export function CrmContactsTab() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { query: pageSearchQuery } = usePageSearch();
  const [contacts, setContacts] = useState<CrmContactRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [stageFilter, setStageFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [source, setSource] = useState("");
  const [lifecycleStage, setLifecycleStage] = useState("lead");
  const [notes, setNotes] = useState("");

  const loadContacts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await crmApi.getContacts(
        stageFilter !== "all" ? { lifecycleStage: stageFilter } : undefined,
      );
      setContacts((res.data as CrmContactRecord[]) || []);
    } catch {
      toast({ title: t("crmLoadFailed"), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [stageFilter, toast, t]);

  useEffect(() => {
    void loadContacts();
  }, [loadContacts]);

  const filtered = useMemo(
    () =>
      filterByPageSearch(contacts, pageSearchQuery, (c) => [
        c.name,
        c.email,
        c.phone,
        c.companyName,
        c.source,
        c.notes,
      ]),
    [contacts, pageSearchQuery],
  );

  const handleSave = async () => {
    if (!name.trim()) {
      toast({ title: t("customerNameRequired"), variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await crmApi.createContact({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        companyName: companyName.trim(),
        source: source.trim(),
        lifecycleStage,
        notes: notes.trim(),
      });
      setDialogOpen(false);
      setName("");
      setEmail("");
      setPhone("");
      setCompanyName("");
      setSource("");
      setLifecycleStage("lead");
      setNotes("");
      void loadContacts();
      toast({ title: t("customerCreated") });
    } catch {
      toast({ title: t("crmSaveFailed"), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5">
            <h2 className="text-lg font-semibold text-gray-900">{t("crmContactsTitle")}</h2>
            <HelpTip text={t("helpCrmContacts")} />
          </div>
          <p className="text-sm text-gray-500">{t("crmContactsSubtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={stageFilter} onValueChange={setStageFilter}>
            <SelectTrigger className={cn(filterSelectClass, "w-[160px]")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("crmAllLifecycle")}</SelectItem>
              {LIFECYCLE_STAGES.map((stage) => (
                <SelectItem key={stage} value={stage}>
                  {lifecycleLabel(stage, t)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            {t("crmAddContact")}
          </Button>
        </div>
      </div>

      <FinanceTableShell>
        {loading ? (
          <FinanceTableLoading />
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-500">{t("crmNoContacts")}</div>
        ) : (
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/80">
                <th className={FINANCE_TH_CLASS}>{t("customerName")}</th>
                <th className={FINANCE_TH_CLASS}>{t("crmLifecycle")}</th>
                <th className={FINANCE_TH_CLASS}>{t("crmCompany")}</th>
                <th className={FINANCE_TH_CLASS}>{t("crmSource")}</th>
                <th className={FINANCE_TH_CLASS}>{t("email")}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((contact) => (
                <tr key={contact._id} className="border-b border-gray-100">
                  <td className={FINANCE_TD_CLASS}>
                    <Link to={`/crm/contacts/${contact._id}`} className="font-medium text-sky-700 hover:underline">
                      {contact.name}
                    </Link>
                  </td>
                  <td className={FINANCE_TD_CLASS}>
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                        lifecycleClass(contact.lifecycleStage || "lead"),
                      )}
                    >
                      {lifecycleLabel(contact.lifecycleStage || "lead", t)}
                    </span>
                  </td>
                  <td className={FINANCE_TD_CLASS}>{contact.companyName || "—"}</td>
                  <td className={FINANCE_TD_CLASS}>{contact.source || "—"}</td>
                  <td className={FINANCE_TD_CLASS}>{contact.email || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </FinanceTableShell>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{t("crmAddContact")}</DialogTitle></DialogHeader>
          <div className="grid gap-3 py-2">
            <div>
              <Label>{t("customerName")}</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t("email")}</Label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div>
                <Label>{t("phone")}</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t("crmCompany")}</Label>
                <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
              </div>
              <div>
                <Label>{t("crmSource")}</Label>
                <Input value={source} onChange={(e) => setSource(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>{t("crmLifecycle")}</Label>
              <Select value={lifecycleStage} onValueChange={setLifecycleStage}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LIFECYCLE_STAGES.map((stage) => (
                    <SelectItem key={stage} value={stage}>{lifecycleLabel(stage, t)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("notes")}</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t("cancel")}</Button>
            <Button onClick={() => void handleSave()} disabled={saving}>{t("save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
