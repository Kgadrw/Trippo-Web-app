import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { assetApi, teamMemberApi, type TeamMemberRecord } from "@/lib/api";
import {
  assetStatusClass,
  assetStatusLabel,
  assetTypeLabel,
  custodianName,
  formatAssetTag,
  isWarrantyExpiringSoon,
  lifecycleEventLabel,
  type AssetDepreciationRow,
  type AssetEntry,
  type AssetMaintenanceRecord,
} from "@/lib/assetWorkflow";
import { useTranslation } from "@/hooks/useTranslation";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/currency";
import { formatFinanceTableDate } from "@/components/finance/financeTable";
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { AlertTriangle, ArrowLeft, Loader2, Wrench } from "lucide-react";

type DetailTab = "overview" | "depreciation" | "maintenance" | "history";

interface AssetProfilePayload {
  asset: AssetEntry;
  depreciationSchedule: AssetDepreciationRow[];
  upcomingMaintenance: AssetMaintenanceRecord[];
}

export function AssetDetailTab({ assetId }: { assetId: string }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [profile, setProfile] = useState<AssetProfilePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<DetailTab>("overview");
  const [teamMembers, setTeamMembers] = useState<TeamMemberRecord[]>([]);
  const [maintenanceOpen, setMaintenanceOpen] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);
  const [custodyOpen, setCustodyOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [maintenanceTitle, setMaintenanceTitle] = useState("");
  const [maintenanceDate, setMaintenanceDate] = useState("");
  const [maintenanceNote, setMaintenanceNote] = useState("");
  const [auditSummary, setAuditSummary] = useState("");
  const [auditDetails, setAuditDetails] = useState("");
  const [custodyMemberId, setCustodyMemberId] = useState("");

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const res = await assetApi.getProfile(assetId);
      setProfile((res.data as AssetProfilePayload) || null);
    } catch {
      toast({ title: t("assetProfileLoadFailed"), variant: "destructive" });
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [assetId, toast, t]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    void teamMemberApi.getAll({ status: "active" }).then((res) => {
      setTeamMembers((res.data as TeamMemberRecord[]) || []);
    });
  }, []);

  const asset = profile?.asset;

  const handleAddMaintenance = async () => {
    if (!maintenanceTitle.trim() || !maintenanceDate) return;
    setSaving(true);
    try {
      await assetApi.addMaintenance(assetId, {
        title: maintenanceTitle.trim(),
        scheduledDate: maintenanceDate,
        note: maintenanceNote.trim() || undefined,
      });
      setMaintenanceOpen(false);
      setMaintenanceTitle("");
      setMaintenanceDate("");
      setMaintenanceNote("");
      await loadProfile();
      toast({ title: t("assetMaintenanceScheduled") });
    } catch {
      toast({ title: t("assetSaveFailed"), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleCompleteMaintenance = async (record: AssetMaintenanceRecord) => {
    if (!record._id) return;
    setSaving(true);
    try {
      await assetApi.completeMaintenance(assetId, { maintenanceId: record._id });
      await loadProfile();
      toast({ title: t("assetMaintenanceCompleted") });
    } catch {
      toast({ title: t("assetSaveFailed"), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleRecordAudit = async () => {
    if (!auditSummary.trim()) return;
    setSaving(true);
    try {
      await assetApi.recordAudit(assetId, {
        summary: auditSummary.trim(),
        details: auditDetails.trim() || undefined,
      });
      setAuditOpen(false);
      setAuditSummary("");
      setAuditDetails("");
      await loadProfile();
      toast({ title: t("assetAuditRecorded") });
    } catch {
      toast({ title: t("assetSaveFailed"), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleAssignCustody = async () => {
    if (!custodyMemberId) return;
    setSaving(true);
    try {
      await assetApi.assignCustody(assetId, { teamMemberId: custodyMemberId });
      setCustodyOpen(false);
      setCustodyMemberId("");
      await loadProfile();
      toast({ title: t("assetCustodyUpdated") });
    } catch {
      toast({ title: t("assetSaveFailed"), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        {t("loading")}
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="space-y-4 p-4 lg:p-6">
        <Button asChild variant="outline" className="rounded-none">
          <Link to="/assets">
            <ArrowLeft size={16} className="mr-2" />
            {t("assetBackToRegister")}
          </Link>
        </Button>
        <p className="text-sm text-gray-500">{t("assetProfileNotFound")}</p>
      </div>
    );
  }

  const warrantySoon = isWarrantyExpiringSoon(asset.warrantyExpires);
  const tabs: Array<{ id: DetailTab; label: string }> = [
    { id: "overview", label: t("assetTabOverview") },
    { id: "depreciation", label: t("assetTabDepreciation") },
    { id: "maintenance", label: t("assetTabMaintenance") },
    { id: "history", label: t("assetTabHistory") },
  ];

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <Button asChild variant="outline" className="rounded-none border-gray-300">
        <Link to="/assets">
          <ArrowLeft size={16} className="mr-2" />
          {t("assetBackToRegister")}
        </Link>
      </Button>

      <div className="border border-gray-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              {formatAssetTag(asset.assetTag)} · {assetTypeLabel(asset.assetType, t)}
            </p>
            <h1 className="mt-1 text-xl font-semibold text-gray-900">{asset.title}</h1>
            <p className="mt-1 text-sm text-gray-600">
              {[asset.manufacturer, asset.model].filter(Boolean).join(" ") || asset.serialNumber || "—"}
            </p>
            <p className={cn("mt-2 text-sm", assetStatusClass(asset.status))}>
              {assetStatusLabel(asset.status, t)}
            </p>
          </div>
          <div className="text-right text-sm text-gray-600">
            <p>{t("assetAssignedTo")}: {custodianName(asset) || "—"}</p>
            <p>{t("assetLocation")}: {asset.location || "—"}</p>
            <p className="inline-flex items-center justify-end gap-1">
              {t("assetWarranty")}:{" "}
              {asset.warrantyExpires ? formatFinanceTableDate(asset.warrantyExpires) : "—"}
              {warrantySoon ? <AlertTriangle className="h-3.5 w-3.5 text-amber-500" /> : null}
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="border border-gray-100 bg-gray-50 p-3">
            <p className="text-xs uppercase tracking-wide text-gray-500">{t("assetPurchaseDate")}</p>
            <p className="mt-1 text-sm font-medium">{formatFinanceTableDate(asset.purchaseDate)}</p>
          </div>
          <div className="border border-gray-100 bg-gray-50 p-3">
            <p className="text-xs uppercase tracking-wide text-gray-500">{t("assetPurchaseCost")}</p>
            <p className="mt-1 text-sm font-medium">{formatCurrency(asset.purchaseCost)}</p>
          </div>
          <div className="border border-gray-100 bg-gray-50 p-3">
            <p className="text-xs uppercase tracking-wide text-gray-500">{t("assetCurrentValue")}</p>
            <p className="mt-1 text-sm font-medium">{formatCurrency(asset.currentValue || 0)}</p>
          </div>
          <div className="border border-gray-100 bg-gray-50 p-3">
            <p className="text-xs uppercase tracking-wide text-gray-500">{t("assetUsefulLife")}</p>
            <p className="mt-1 text-sm font-medium">
              {asset.usefulLifeMonths ? `${asset.usefulLifeMonths} ${t("assetMonths")}` : "—"}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="sm" variant="outline" className="rounded-none" onClick={() => setCustodyOpen(true)}>
            {t("assetAssignCustody")}
          </Button>
          <Button size="sm" variant="outline" className="rounded-none" onClick={() => setMaintenanceOpen(true)}>
            <Wrench size={14} className="mr-1" />
            {t("assetScheduleMaintenance")}
          </Button>
          <Button size="sm" variant="outline" className="rounded-none" onClick={() => setAuditOpen(true)}>
            {t("assetRecordAudit")}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-gray-200">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cn(
              "border-b-2 px-3 py-2 text-sm font-medium",
              tab === item.id ? "border-sky-600 text-sky-700" : "border-transparent text-gray-500",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "overview" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="border border-gray-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-gray-900">{t("assetUpcomingMaintenance")}</h2>
            {(profile?.upcomingMaintenance || []).length === 0 ? (
              <p className="mt-3 text-sm text-gray-500">{t("assetNoMaintenance")}</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {profile?.upcomingMaintenance.map((row) => (
                  <li key={row._id} className="flex items-center justify-between gap-3 text-sm">
                    <div>
                      <p className="font-medium text-gray-900">{row.title}</p>
                      <p className="text-xs text-gray-500">{formatFinanceTableDate(row.scheduledDate)}</p>
                    </div>
                    <span className={row.status === "overdue" ? "text-amber-600" : "text-gray-500"}>
                      {row.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="border border-gray-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-gray-900">{t("assetCustodyHistory")}</h2>
            {(asset.custodyHistory || []).length === 0 ? (
              <p className="mt-3 text-sm text-gray-500">{t("assetNoCustodyHistory")}</p>
            ) : (
              <ul className="mt-3 space-y-2 text-sm">
                {[...(asset.custodyHistory || [])].reverse().map((row) => (
                  <li key={row._id} className="border-b border-gray-100 pb-2">
                    <p className="font-medium text-gray-900">{row.assigneeName || "—"}</p>
                    <p className="text-xs text-gray-500">
                      {formatFinanceTableDate(row.assignedAt)}
                      {row.returnedAt ? ` → ${formatFinanceTableDate(row.returnedAt)}` : ` · ${t("assetCurrentCustodian")}`}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}

      {tab === "depreciation" ? (
        <div className="overflow-x-auto border border-gray-200 bg-white">
          {(profile?.depreciationSchedule || []).length === 0 ? (
            <p className="p-6 text-sm text-gray-500">{t("assetNoDepreciation")}</p>
          ) : (
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="px-3 py-2">{t("assetPeriod")}</th>
                  <th className="px-3 py-2">{t("assetOpeningValue")}</th>
                  <th className="px-3 py-2">{t("assetDepreciation")}</th>
                  <th className="px-3 py-2">{t("assetAccumulated")}</th>
                  <th className="px-3 py-2">{t("assetClosingValue")}</th>
                </tr>
              </thead>
              <tbody>
                {profile?.depreciationSchedule.map((row) => (
                  <tr key={row.period} className="border-b border-gray-100">
                    <td className="px-3 py-2">{row.periodLabel}</td>
                    <td className="px-3 py-2 tabular-nums">{formatCurrency(row.openingValue)}</td>
                    <td className="px-3 py-2 tabular-nums">{formatCurrency(row.depreciation)}</td>
                    <td className="px-3 py-2 tabular-nums">{formatCurrency(row.accumulatedDepreciation)}</td>
                    <td className="px-3 py-2 tabular-nums font-medium">{formatCurrency(row.closingValue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : null}

      {tab === "maintenance" ? (
        <div className="border border-gray-200 bg-white divide-y divide-gray-100">
          {(asset.maintenanceRecords || []).length === 0 ? (
            <p className="p-6 text-sm text-gray-500">{t("assetNoMaintenance")}</p>
          ) : (
            [...(asset.maintenanceRecords || [])]
              .sort((a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime())
              .map((row) => (
                <div key={row._id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{row.title}</p>
                    <p className="text-xs text-gray-500">
                      {formatFinanceTableDate(row.scheduledDate)}
                      {row.completedDate ? ` · ${formatFinanceTableDate(row.completedDate)}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={row.status === "overdue" ? "text-amber-600 text-sm" : "text-gray-500 text-sm"}>
                      {row.status}
                    </span>
                    {row.status !== "completed" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-none"
                        disabled={saving}
                        onClick={() => void handleCompleteMaintenance(row)}
                      >
                        {t("assetMarkComplete")}
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))
          )}
        </div>
      ) : null}

      {tab === "history" ? (
        <div className="border border-gray-200 bg-white divide-y divide-gray-100">
          {(asset.lifecycleEvents || []).length === 0 ? (
            <p className="p-6 text-sm text-gray-500">{t("assetNoHistory")}</p>
          ) : (
            asset.lifecycleEvents.map((event) => (
              <div key={event._id} className="px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-gray-900">{event.summary}</p>
                  <span className="text-xs text-gray-500">{formatFinanceTableDate(event.occurredAt)}</span>
                </div>
                <p className="text-xs text-sky-700">{lifecycleEventLabel(event.eventType, t)}</p>
                {event.details ? <p className="mt-1 text-xs text-gray-500">{event.details}</p> : null}
                {event.actorName ? (
                  <p className="mt-1 text-[10px] text-gray-400">{event.actorName}</p>
                ) : null}
              </div>
            ))
          )}
        </div>
      ) : null}

      <Dialog open={maintenanceOpen} onOpenChange={setMaintenanceOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("assetScheduleMaintenance")}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>{t("title")}</Label><Input value={maintenanceTitle} onChange={(e) => setMaintenanceTitle(e.target.value)} /></div>
            <div><Label>{t("date")}</Label><Input type="date" value={maintenanceDate} onChange={(e) => setMaintenanceDate(e.target.value)} /></div>
            <div><Label>{t("note")}</Label><Textarea value={maintenanceNote} onChange={(e) => setMaintenanceNote(e.target.value)} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMaintenanceOpen(false)}>{t("cancel")}</Button>
            <Button onClick={() => void handleAddMaintenance()} disabled={saving}>{t("save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={auditOpen} onOpenChange={setAuditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("assetRecordAudit")}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>{t("assetAuditSummary")}</Label><Input value={auditSummary} onChange={(e) => setAuditSummary(e.target.value)} /></div>
            <div><Label>{t("note")}</Label><Textarea value={auditDetails} onChange={(e) => setAuditDetails(e.target.value)} rows={3} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAuditOpen(false)}>{t("cancel")}</Button>
            <Button onClick={() => void handleRecordAudit()} disabled={saving}>{t("save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={custodyOpen} onOpenChange={setCustodyOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("assetAssignCustody")}</DialogTitle></DialogHeader>
          <div>
            <Label>{t("teamMembers")}</Label>
            <Select value={custodyMemberId} onValueChange={setCustodyMemberId}>
              <SelectTrigger className="bg-white"><SelectValue placeholder={t("assetSelectAssignee")} /></SelectTrigger>
              <SelectContent>
                {teamMembers.map((member) => (
                  <SelectItem key={member._id} value={member._id}>{member.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCustodyOpen(false)}>{t("cancel")}</Button>
            <Button onClick={() => void handleAssignCustody()} disabled={saving || !custodyMemberId}>{t("save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
