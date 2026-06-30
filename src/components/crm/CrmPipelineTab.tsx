import { useCallback, useEffect, useMemo, useState } from "react";
import { crmApi } from "@/lib/api";
import {
  DEAL_STAGES,
  OPEN_DEAL_STAGES,
  contactName,
  dealStageLabel,
  type DealRecord,
} from "@/lib/crmWorkflow";
import { useTranslation } from "@/hooks/useTranslation";
import { useToast } from "@/hooks/use-toast";
import { HelpTip } from "@/components/ui/help-tip";
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
import { formatCurrency } from "@/lib/currency";
import { Loader2, Plus } from "lucide-react";
import type { CrmContactRecord } from "@/lib/crmWorkflow";

export function CrmPipelineTab() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [deals, setDeals] = useState<DealRecord[]>([]);
  const [contacts, setContacts] = useState<CrmContactRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [clientId, setClientId] = useState("");
  const [stage, setStage] = useState("lead");
  const [value, setValue] = useState("");
  const [probability, setProbability] = useState("10");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [dealsRes, contactsRes] = await Promise.all([crmApi.getDeals(), crmApi.getContacts()]);
      setDeals((dealsRes.data as DealRecord[]) || []);
      setContacts((contactsRes.data as CrmContactRecord[]) || []);
    } catch {
      toast({ title: t("crmLoadFailed"), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast, t]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const dealsByStage = useMemo(() => {
    const map = new Map<string, DealRecord[]>();
    for (const s of DEAL_STAGES) map.set(s, []);
    for (const deal of deals) {
      const key = deal.stage || "lead";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(deal);
    }
    return map;
  }, [deals]);

  const handleCreate = async () => {
    if (!title.trim() || !clientId) return;
    setSaving(true);
    try {
      await crmApi.createDeal({
        title: title.trim(),
        clientId,
        stage,
        value: Number(value) || 0,
        probability: Number(probability) || 10,
      });
      setDialogOpen(false);
      setTitle("");
      setClientId("");
      setValue("");
      void loadData();
      toast({ title: t("crmDealCreated") });
    } catch {
      toast({ title: t("crmSaveFailed"), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const moveDeal = async (deal: DealRecord, newStage: string) => {
    try {
      await crmApi.updateDeal(deal._id, { stage: newStage });
      void loadData();
    } catch {
      toast({ title: t("crmSaveFailed"), variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        {t("loading")}
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5">
            <h2 className="text-lg font-semibold text-gray-900">{t("crmPipelineTitle")}</h2>
            <HelpTip text={t("helpCrmPipeline")} />
          </div>
          <p className="text-sm text-gray-500">{t("crmPipelineSubtitle")}</p>
        </div>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          {t("crmAddDeal")}
        </Button>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2">
        {OPEN_DEAL_STAGES.map((stageKey) => {
          const columnDeals = dealsByStage.get(stageKey) || [];
          const columnValue = columnDeals.reduce((sum, d) => sum + (d.value || 0), 0);
          return (
            <div key={stageKey} className="min-w-[240px] flex-1 rounded-lg border border-gray-200 bg-gray-50/80">
              <div className="border-b border-gray-200 px-3 py-2">
                <p className="text-sm font-semibold text-gray-900">{dealStageLabel(stageKey, t)}</p>
                <p className="text-xs text-gray-500">
                  {columnDeals.length} · {formatCurrency(columnValue)}
                </p>
              </div>
              <ul className="space-y-2 p-2">
                {columnDeals.map((deal) => (
                  <li key={deal._id} className="rounded-md border border-gray-200 bg-white p-3 shadow-sm">
                    <p className="text-sm font-medium text-gray-900">{deal.title}</p>
                    <p className="text-xs text-gray-500">{contactName(deal.clientId as CrmContactRecord)}</p>
                    <p className="mt-1 text-sm font-semibold text-sky-700">{formatCurrency(deal.value || 0)}</p>
                    <Select value={deal.stage || stageKey} onValueChange={(v) => void moveDeal(deal, v)}>
                      <SelectTrigger className="mt-2 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DEAL_STAGES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {dealStageLabel(s, t)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {(dealsByStage.get("won") || []).length > 0 && (
          <section className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4">
            <h3 className="text-sm font-semibold text-emerald-900">{t("crmStageWon")}</h3>
            <ul className="mt-2 space-y-1 text-sm text-emerald-800">
              {(dealsByStage.get("won") || []).map((d) => (
                <li key={d._id}>{d.title} — {formatCurrency(d.value || 0)}</li>
              ))}
            </ul>
          </section>
        )}
        {(dealsByStage.get("lost") || []).length > 0 && (
          <section className="rounded-lg border border-red-200 bg-red-50/50 p-4">
            <h3 className="text-sm font-semibold text-red-900">{t("crmStageLost")}</h3>
            <ul className="mt-2 space-y-1 text-sm text-red-800">
              {(dealsByStage.get("lost") || []).map((d) => (
                <li key={d._id}>{d.title}</li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("crmAddDeal")}</DialogTitle></DialogHeader>
          <div className="grid gap-3 py-2">
            <div>
              <Label>{t("crmDealTitle")}</Label>
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
                <Label>{t("crmDealValue")}</Label>
                <Input type="number" min="0" value={value} onChange={(e) => setValue(e.target.value)} />
              </div>
              <div>
                <Label>{t("crmProbability")}</Label>
                <Input type="number" min="0" max="100" value={probability} onChange={(e) => setProbability(e.target.value)} />
              </div>
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
