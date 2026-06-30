import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { crmApi } from "@/lib/api";
import {
  ACTIVITY_TYPES,
  COMM_CHANNELS,
  LIFECYCLE_STAGES,
  activityTypeLabel,
  channelLabel,
  contractStatusLabel,
  dealStageLabel,
  lifecycleClass,
  lifecycleLabel,
  quoteStatusLabel,
  type CrmContactProfile,
} from "@/lib/crmWorkflow";
import { useTranslation } from "@/hooks/useTranslation";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/currency";
import { formatFinanceTableDate } from "@/components/finance/financeTable";
import { cn } from "@/lib/utils";
import { ArrowLeft, Loader2, Plus, Trash2 } from "lucide-react";

export function CrmContactDetailTab({ clientId }: { clientId: string }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [profile, setProfile] = useState<CrmContactProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [activityType, setActivityType] = useState("note");
  const [channel, setChannel] = useState("internal");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const res = await crmApi.getContactProfile(clientId);
      setProfile((res.data as CrmContactProfile) || null);
    } catch {
      toast({ title: t("crmProfileLoadFailed"), variant: "destructive" });
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [clientId, toast, t]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const updateLifecycle = async (lifecycleStage: string) => {
    try {
      await crmApi.updateContact(clientId, { lifecycleStage });
      void loadProfile();
    } catch {
      toast({ title: t("crmSaveFailed"), variant: "destructive" });
    }
  };

  const logActivity = async () => {
    if (!body.trim() && !subject.trim()) return;
    setSaving(true);
    try {
      await crmApi.createActivity({
        clientId,
        activityType,
        channel,
        subject: subject.trim(),
        body: body.trim(),
        occurredAt: new Date().toISOString(),
      });
      setSubject("");
      setBody("");
      void loadProfile();
      toast({ title: t("crmActivityLogged") });
    } catch {
      toast({ title: t("crmSaveFailed"), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const removeActivity = async (activityId: string) => {
    try {
      await crmApi.deleteActivity(activityId);
      void loadProfile();
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

  if (!profile) {
    return (
      <div className="p-6 text-center">
        <p className="text-sm text-gray-600">{t("crmContactNotFound")}</p>
        <Button asChild variant="link" className="mt-2">
          <Link to="/crm/contacts">{t("crmBackToContacts")}</Link>
        </Button>
      </div>
    );
  }

  const { client, deals, quotes, contracts, activities, invoices } = profile;

  return (
    <div className="space-y-5 p-4 lg:p-6">
      <Button asChild variant="ghost" size="sm" className="px-2">
        <Link to="/crm/contacts">
          <ArrowLeft className="mr-1 h-4 w-4" />
          {t("crmBackToContacts")}
        </Link>
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{client.name}</h2>
          {client.companyName ? <p className="text-sm text-gray-600">{client.companyName}</p> : null}
          <p className="mt-1 text-sm text-gray-500">
            {[client.email, client.phone].filter(Boolean).join(" · ") || t("crmNoContactInfo")}
          </p>
        </div>
        <Select value={client.lifecycleStage || "lead"} onValueChange={(v) => void updateLifecycle(v)}>
          <SelectTrigger className={cn("w-[160px]", lifecycleClass(client.lifecycleStage || "lead"))}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LIFECYCLE_STAGES.map((stage) => (
              <SelectItem key={stage} value={stage}>{lifecycleLabel(stage, t)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-lg border border-gray-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-gray-900">{t("crmOpenDeals")}</h3>
          {deals.length === 0 ? (
            <p className="mt-2 text-sm text-gray-500">{t("crmNoDeals")}</p>
          ) : (
            <ul className="mt-2 divide-y divide-gray-100">
              {deals.map((deal) => (
                <li key={deal._id} className="flex justify-between py-2 text-sm">
                  <span>{deal.title}</span>
                  <span className="text-gray-500">{dealStageLabel(deal.stage || "lead", t)} · {formatCurrency(deal.value || 0)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="rounded-lg border border-gray-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-gray-900">{t("crmRecentQuotes")}</h3>
          {quotes.length === 0 ? (
            <p className="mt-2 text-sm text-gray-500">{t("crmNoQuotes")}</p>
          ) : (
            <ul className="mt-2 divide-y divide-gray-100">
              {quotes.slice(0, 5).map((quote) => (
                <li key={quote._id} className="flex justify-between py-2 text-sm">
                  <span>{quote.title}</span>
                  <span className="text-gray-500">{quoteStatusLabel(quote.status || "draft", t)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-gray-900">{t("crmCommunicationTimeline")}</h3>
        <p className="text-xs text-gray-500">{t("crmCommunicationTimelineHint")}</p>

        <div className="mt-4 grid gap-3 rounded-lg border border-dashed border-gray-200 bg-gray-50/50 p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>{t("crmActivityType")}</Label>
              <Select value={activityType} onValueChange={setActivityType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ACTIVITY_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>{activityTypeLabel(type, t)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("crmChannel")}</Label>
              <Select value={channel} onValueChange={setChannel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COMM_CHANNELS.map((ch) => (
                    <SelectItem key={ch} value={ch}>{channelLabel(ch, t)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>{t("crmActivitySubject")}</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div>
            <Label>{t("crmActivityBody")}</Label>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} />
          </div>
          <Button size="sm" className="w-fit" onClick={() => void logActivity()} disabled={saving}>
            <Plus className="mr-1.5 h-4 w-4" />
            {t("crmLogActivity")}
          </Button>
        </div>

        <ul className="mt-4 divide-y divide-gray-100">
          {activities.length === 0 ? (
            <li className="py-6 text-center text-sm text-gray-500">{t("crmNoActivities")}</li>
          ) : (
            activities.map((activity) => (
              <li key={activity._id} className="flex items-start justify-between gap-3 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {activityTypeLabel(activity.activityType || "note", t)}
                    {activity.channel ? ` · ${channelLabel(activity.channel, t)}` : ""}
                  </p>
                  {activity.subject ? <p className="text-sm text-gray-800">{activity.subject}</p> : null}
                  {activity.body ? <p className="text-sm text-gray-600">{activity.body}</p> : null}
                  <p className="mt-1 text-xs text-gray-500">
                    {formatFinanceTableDate(activity.occurredAt)}
                    {activity.createdByName ? ` · ${activity.createdByName}` : ""}
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => void removeActivity(activity._id)}>
                  <Trash2 className="h-4 w-4 text-red-600" />
                </Button>
              </li>
            ))
          )}
        </ul>
      </section>

      {(contracts.length > 0 || invoices.length > 0) && (
        <div className="grid gap-4 lg:grid-cols-2">
          {contracts.length > 0 && (
            <section className="rounded-lg border border-gray-200 bg-white p-4">
              <h3 className="text-sm font-semibold text-gray-900">{t("crmContracts")}</h3>
              <ul className="mt-2 divide-y divide-gray-100">
                {contracts.map((contract) => (
                  <li key={contract._id} className="flex justify-between py-2 text-sm">
                    <span>{contract.title}</span>
                    <span className="text-gray-500">{contractStatusLabel(contract.status || "draft", t)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {invoices.length > 0 && (
            <section className="rounded-lg border border-gray-200 bg-white p-4">
              <h3 className="text-sm font-semibold text-gray-900">{t("invoices")}</h3>
              <ul className="mt-2 divide-y divide-gray-100">
                {invoices.map((inv) => (
                  <li key={inv._id} className="flex justify-between py-2 text-sm">
                    <span>{inv.invoiceNumber}</span>
                    <span className="text-gray-500">{formatCurrency(inv.amount)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
