import { useCallback, useEffect, useMemo, useState } from "react";
import { corporateCalendarApi } from "@/lib/api";
import {
  ANNOUNCEMENT_PRIORITIES,
  ANNOUNCEMENT_SCOPES,
  ANNOUNCEMENT_STATUSES,
  REGION_CODES,
  announcementPriorityClass,
  announcementPriorityLabel,
  announcementScopeLabel,
  announcementStatusClass,
  announcementStatusLabel,
  type CompanyAnnouncementRecord,
} from "@/lib/calendarWorkflow";
import { useTranslation } from "@/hooks/useTranslation";
import { useToast } from "@/hooks/use-toast";
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
import { HelpTip } from "@/components/ui/help-tip";
import { FINANCE_TD_CLASS, FINANCE_TH_CLASS, formatFinanceTableDate } from "@/components/finance/financeTable";
import { cn } from "@/lib/utils";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";

const EMPTY_FORM = {
  title: "",
  body: "",
  startDate: "",
  endDate: "",
  allDay: true,
  scope: "workspace",
  regionCode: "",
  priority: "normal",
  status: "draft",
};

export function CompanyAnnouncementsTab() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState<CompanyAnnouncementRecord[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CompanyAnnouncementRecord | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const loadRows = useCallback(async () => {
    setLoading(true);
    try {
      const res = await corporateCalendarApi.getAnnouncements(
        statusFilter === "all" ? undefined : { status: statusFilter },
      );
      setRows(Array.isArray(res.data) ? (res.data as CompanyAnnouncementRecord[]) : []);
    } catch {
      toast({ title: t("corpAnnLoadFailed"), variant: "destructive" });
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, t, toast]);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  const visibleRows = useMemo(() => rows, [rows]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (row: CompanyAnnouncementRecord) => {
    setEditing(row);
    setForm({
      title: row.title,
      body: row.body || "",
      startDate: row.startDate ? row.startDate.split("T")[0] : "",
      endDate: row.endDate ? row.endDate.split("T")[0] : "",
      allDay: row.allDay !== false,
      scope: row.scope || "workspace",
      regionCode: row.regionCode || "",
      priority: row.priority || "normal",
      status: row.status || "draft",
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.startDate) return;
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        body: form.body.trim() || undefined,
        startDate: form.startDate,
        endDate: form.endDate || undefined,
        allDay: form.allDay,
        scope: form.scope,
        regionCode: form.scope === "regional" ? form.regionCode : "",
        priority: form.priority,
        status: form.status,
      };
      if (editing) {
        await corporateCalendarApi.updateAnnouncement(editing._id, payload);
      } else {
        await corporateCalendarApi.createAnnouncement(payload);
      }
      toast({ title: t("corpAnnSaved") });
      setModalOpen(false);
      await loadRows();
    } catch {
      toast({ title: t("corpAnnSaveFailed"), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row: CompanyAnnouncementRecord) => {
    if (!window.confirm(t("corpAnnDeleteConfirm"))) return;
    try {
      await corporateCalendarApi.deleteAnnouncement(row._id);
      toast({ title: t("corpAnnDeleted") });
      await loadRows();
    } catch {
      toast({ title: t("corpAnnSaveFailed"), variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5">
            <h2 className="text-lg font-semibold text-gray-900">{t("corpAnnTitle")}</h2>
            <HelpTip text={t("helpCorpCalAnnouncements")} />
          </div>
          <p className="text-sm text-gray-500">{t("corpAnnSubtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("corpAnnAllStatuses")}</SelectItem>
              {ANNOUNCEMENT_STATUSES.map((value) => (
                <SelectItem key={value} value={value}>{announcementStatusLabel(value, t)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-1.5 h-4 w-4" />
            {t("corpAnnAdd")}
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-500">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            {t("loading")}
          </div>
        ) : visibleRows.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-500">{t("corpAnnEmpty")}</div>
        ) : (
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className={FINANCE_TH_CLASS}>{t("corpAnnColTitle")}</th>
                <th className={FINANCE_TH_CLASS}>{t("corpAnnColScope")}</th>
                <th className={FINANCE_TH_CLASS}>{t("corpAnnColPriority")}</th>
                <th className={FINANCE_TH_CLASS}>{t("corpAnnColDates")}</th>
                <th className={FINANCE_TH_CLASS}>{t("corpAnnColStatus")}</th>
                <th className={FINANCE_TH_CLASS} />
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => (
                <tr key={row._id} className="border-b border-gray-100 last:border-b-0">
                  <td className={cn(FINANCE_TD_CLASS, "max-w-[220px] font-medium text-gray-900")}>
                    <p className="truncate">{row.title}</p>
                    {row.body && <p className="truncate text-xs text-gray-500">{row.body}</p>}
                  </td>
                  <td className={FINANCE_TD_CLASS}>
                    {announcementScopeLabel(row.scope, t)}
                    {row.scope === "regional" && row.regionCode ? ` · ${row.regionCode}` : ""}
                  </td>
                  <td className={FINANCE_TD_CLASS}>
                    <span className={cn("rounded px-2 py-0.5 text-xs font-medium", announcementPriorityClass(row.priority))}>
                      {announcementPriorityLabel(row.priority, t)}
                    </span>
                  </td>
                  <td className={FINANCE_TD_CLASS}>
                    {formatFinanceTableDate(row.startDate)}
                    {row.endDate ? ` – ${formatFinanceTableDate(row.endDate)}` : ""}
                  </td>
                  <td className={FINANCE_TD_CLASS}>
                    <span className={cn("rounded px-2 py-0.5 text-xs font-medium", announcementStatusClass(row.status))}>
                      {announcementStatusLabel(row.status, t)}
                    </span>
                  </td>
                  <td className={FINANCE_TD_CLASS}>
                    <div className="flex justify-end gap-1">
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(row)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => void handleDelete(row)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? t("corpAnnEdit") : t("corpAnnAdd")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>{t("corpAnnColTitle")}</Label>
              <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>{t("corpAnnBody")}</Label>
              <Textarea value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>{t("corpAnnStartDate")}</Label>
                <Input type="date" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>{t("corpAnnEndDate")}</Label>
                <Input type="date" value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>{t("corpAnnColScope")}</Label>
                <Select value={form.scope} onValueChange={(value) => setForm((f) => ({ ...f, scope: value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ANNOUNCEMENT_SCOPES.map((value) => (
                      <SelectItem key={value} value={value}>{announcementScopeLabel(value, t)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {form.scope === "regional" && (
                <div className="space-y-1">
                  <Label>{t("corpAnnRegion")}</Label>
                  <Select value={form.regionCode || ""} onValueChange={(value) => setForm((f) => ({ ...f, regionCode: value }))}>
                    <SelectTrigger><SelectValue placeholder={t("corpAnnSelectRegion")} /></SelectTrigger>
                    <SelectContent>
                      {REGION_CODES.filter(Boolean).map((value) => (
                        <SelectItem key={value} value={value}>{value}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>{t("corpAnnColPriority")}</Label>
                <Select value={form.priority} onValueChange={(value) => setForm((f) => ({ ...f, priority: value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ANNOUNCEMENT_PRIORITIES.map((value) => (
                      <SelectItem key={value} value={value}>{announcementPriorityLabel(value, t)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>{t("corpAnnColStatus")}</Label>
                <Select value={form.status} onValueChange={(value) => setForm((f) => ({ ...f, status: value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ANNOUNCEMENT_STATUSES.map((value) => (
                      <SelectItem key={value} value={value}>{announcementStatusLabel(value, t)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>{t("cancel")}</Button>
            <Button onClick={() => void handleSave()} disabled={saving || !form.title.trim() || !form.startDate}>
              {saving ? t("saving") : t("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
