import { useCallback, useEffect, useMemo, useState } from "react";
import { teamMemberApi, teamReportApi, type TeamMemberRecord } from "@/lib/api";
import { useWorkspace } from "@/hooks/useWorkspace";
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
import {
  Loader2,
  CheckCircle2,
  XCircle,
  MessageSquareWarning,
  Plus,
  Paperclip,
  RefreshCw,
  Search,
  ChevronsUpDown,
  Check,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { filterSelectClass } from "@/lib/fieldStyles";
import {
  FINANCE_TH_CLASS,
  FINANCE_TD_CLASS,
  formatFinanceTableDate,
  FinanceTableLoading,
  FinanceTableShell,
  FinanceMobileRow,
  DesktopDataTable,
  MobileDataList,
} from "@/components/finance/financeTable";
import {
  canEditTeamReport,
  defaultPeriodForType,
  formatReportPeriod,
  teamReportId,
  teamReportStatusClass,
  teamReportStatusLabel,
  teamReportTypeLabel,
  type TeamReportRecord,
  type TeamReportStatus,
  type TeamReportType,
} from "@/lib/teamReportWorkflow";

type StatusFilter = TeamReportStatus | "all" | "mine";

const emptyForm = (type: TeamReportType = "daily") => {
  const period = defaultPeriodForType(type);
  return {
    title: "",
    reportType: type,
    periodStart: period.start,
    periodEnd: period.end,
    accomplishments: "",
    blockers: "",
    nextSteps: "",
    attachmentUrl: "",
    attachmentName: "",
    reportTo: [] as string[],
  };
};

export function TeamReportsTab() {
  const { toast } = useToast();
  const { mode, isWorkspaceAdmin } = useWorkspace();
  const [items, setItems] = useState<TeamReportRecord[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMemberRecord[]>([]);
  const [canReview, setCanReview] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TeamReportRecord | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<TeamReportRecord | null>(null);
  const [changesTarget, setChangesTarget] = useState<TeamReportRecord | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [detail, setDetail] = useState<TeamReportRecord | null>(null);
  const [reportToPickerOpen, setReportToPickerOpen] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const [pendingReportTo, setPendingReportTo] = useState<string[]>([]);

  const loadReports = useCallback(
    async (silent = false) => {
      if (!silent) setIsLoading(true);
      try {
        const params: { status?: string; mine?: boolean } = {};
        if (filter === "mine") params.mine = true;
        else if (filter !== "all") params.status = filter;
        const response = await teamReportApi.getAll(params);
        setItems((response.data || []) as TeamReportRecord[]);
        const meta = (response as { meta?: { canReview?: boolean } }).meta;
        setCanReview(Boolean(meta?.canReview ?? isWorkspaceAdmin));
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Could not load reports.";
        toast({ title: "Error", description: message, variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    },
    [filter, isWorkspaceAdmin, toast],
  );

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  useEffect(() => {
    void teamMemberApi
      .getAll({ status: "active" })
      .then((response) => setTeamMembers((response.data || []) as TeamMemberRecord[]))
      .catch(() => setTeamMembers([]));
  }, []);

  const selectedRecipients = useMemo(
    () => teamMembers.filter((member) => form.reportTo.includes(member._id)),
    [teamMembers, form.reportTo],
  );

  const filteredMembers = useMemo(() => {
    const q = memberSearch.trim().toLowerCase();
    const sorted = [...teamMembers].sort((a, b) =>
      String(a.name || "").localeCompare(String(b.name || "")),
    );
    if (!q) return sorted;
    return sorted.filter((member) => {
      const haystack = `${member.name || ""} ${member.jobTitle || ""} ${member.email || ""}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [teamMembers, memberSearch]);

  const openReportToPicker = () => {
    setPendingReportTo(form.reportTo);
    setMemberSearch("");
    setReportToPickerOpen(true);
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm("daily"));
    setModalOpen(true);
  };

  const openEdit = (report: TeamReportRecord) => {
    setEditing(report);
    setForm({
      title: report.title || "",
      reportType: report.reportType || "daily",
      periodStart: String(report.periodStart || "").slice(0, 10),
      periodEnd: String(report.periodEnd || "").slice(0, 10),
      accomplishments: report.accomplishments || "",
      blockers: report.blockers || "",
      nextSteps: report.nextSteps || "",
      attachmentUrl: report.attachmentUrl || "",
      attachmentName: report.attachmentName || "",
      reportTo: (report.reportTo || []).map((recipient) => recipient.memberId),
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.accomplishments.trim()) {
      toast({
        title: "Missing fields",
        description: "Title and accomplishments are required.",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        reportType: form.reportType,
        periodStart: form.periodStart,
        periodEnd: form.periodEnd,
        accomplishments: form.accomplishments.trim(),
        blockers: form.blockers.trim(),
        nextSteps: form.nextSteps.trim(),
        attachmentUrl: form.attachmentUrl.trim() || undefined,
        attachmentName: form.attachmentName.trim() || undefined,
        reportTo: form.reportTo,
      };
      if (editing) {
        const id = teamReportId(editing);
        await teamReportApi.update(id, payload);
        if (canEditTeamReport(editing.status)) {
          await teamReportApi.resubmit(id);
        }
        toast({ title: "Report updated", description: "Your report was resubmitted for review." });
      } else {
        await teamReportApi.create(payload);
        toast({
          title: "Report submitted",
          description:
            mode === "workspace"
              ? "Admins can now review your report."
              : "Your report was saved.",
        });
      }
      setModalOpen(false);
      await loadReports(true);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Could not save report.";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const runAction = async (
    key: string,
    action: () => Promise<unknown>,
    successTitle: string,
    successDescription: string,
  ) => {
    setActingId(key);
    try {
      await action();
      toast({ title: successTitle, description: successDescription });
      setRejectTarget(null);
      setChangesTarget(null);
      setReviewNote("");
      await loadReports(true);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Action failed.";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setActingId(null);
    }
  };

  const filterButtons = useMemo(
    () =>
      [
        { key: "all" as const, label: "All" },
        { key: "mine" as const, label: "Mine" },
        { key: "submitted" as const, label: "Submitted" },
        { key: "reviewed" as const, label: "Reviewed" },
        { key: "changes_requested" as const, label: "Changes" },
        { key: "rejected" as const, label: "Rejected" },
      ] as const,
    [],
  );

  const renderActions = (report: TeamReportRecord, compact = false) => {
    const id = teamReportId(report);
    const isPending = report.status === "submitted";
    return (
      <div className={cn("flex flex-wrap items-center gap-1", compact && "justify-end")}>
        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setDetail(report)}>
          View
        </Button>
        {canEditTeamReport(report.status) ? (
          <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => openEdit(report)}>
            Edit & resubmit
          </Button>
        ) : null}
        {(canReview || report.canReview) && isPending ? (
          <>
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs text-emerald-700 border-emerald-200 dark:text-emerald-200 dark:border-emerald-500/40"
              disabled={actingId !== null}
              onClick={() =>
                void runAction(
                  `${id}-review`,
                  () => teamReportApi.review(id),
                  "Reviewed",
                  `${report.title} was marked as reviewed.`,
                )
              }
            >
              {actingId === `${id}-review` ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
              )}
              {compact ? null : "Review"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs text-orange-700 border-orange-200 dark:text-orange-200 dark:border-orange-500/40"
              disabled={actingId !== null}
              onClick={() => {
                setChangesTarget(report);
                setReviewNote("");
              }}
            >
              <MessageSquareWarning className="h-3.5 w-3.5 mr-1" />
              {compact ? null : "Request changes"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs text-red-700 border-red-200 dark:text-red-200 dark:border-red-500/40"
              disabled={actingId !== null}
              onClick={() => {
                setRejectTarget(report);
                setReviewNote("");
              }}
            >
              <XCircle className="h-3.5 w-3.5 mr-1" />
              {compact ? null : "Reject"}
            </Button>
          </>
        ) : null}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-foreground">Team reporting</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Submit daily or weekly work reports.{" "}
            {canReview
              ? "You can review submissions from the team."
              : "Workspace admins review submitted reports."}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => void loadReports(true)}>
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
          <Button type="button" size="sm" onClick={openCreate}>
            <Plus className="h-3.5 w-3.5" />
            New report
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {filterButtons.map((btn) => (
          <button
            key={btn.key}
            type="button"
            onClick={() => setFilter(btn.key)}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              filter === btn.key
                ? "bg-primary text-white"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <FinanceTableLoading />
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-transparent bg-muted/40 px-4 py-16 text-center">
          <p className="text-sm font-medium text-foreground">No reports yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Submit your first daily, weekly, or monthly report to get started.
          </p>
          <Button type="button" className="mt-4" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Submit report
          </Button>
        </div>
      ) : (
        <FinanceTableShell>
          <DesktopDataTable>
            <thead>
              <tr>
                <th className={FINANCE_TH_CLASS}>Title</th>
                <th className={cn(FINANCE_TH_CLASS, "hidden md:table-cell")}>Submitter</th>
                <th className={cn(FINANCE_TH_CLASS, "hidden sm:table-cell")}>Period</th>
                <th className={FINANCE_TH_CLASS}>Status</th>
                <th className={cn(FINANCE_TH_CLASS, "hidden lg:table-cell")}>Submitted</th>
                <th className={cn(FINANCE_TH_CLASS, "text-right")}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((report) => (
                <tr key={teamReportId(report)} className="border-b border-transparent hover:bg-muted/40">
                  <td className={cn(FINANCE_TD_CLASS, "font-medium")}>
                    <div className="min-w-0">
                      <p className="truncate">{report.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {teamReportTypeLabel(report.reportType)}
                      </p>
                    </div>
                  </td>
                  <td className={cn(FINANCE_TD_CLASS, "hidden md:table-cell")}>{report.submitterName}</td>
                  <td className={cn(FINANCE_TD_CLASS, "hidden sm:table-cell text-xs")}>
                    {formatReportPeriod(report.periodStart, report.periodEnd)}
                  </td>
                  <td className={FINANCE_TD_CLASS}>
                    <span
                      className={cn(
                        "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                        teamReportStatusClass(report.status),
                      )}
                    >
                      {teamReportStatusLabel(report.status)}
                    </span>
                  </td>
                  <td className={cn(FINANCE_TD_CLASS, "hidden lg:table-cell text-xs text-muted-foreground")}>
                    {formatFinanceTableDate(report.createdAt)}
                  </td>
                  <td className={cn(FINANCE_TD_CLASS, "text-right")}>{renderActions(report)}</td>
                </tr>
              ))}
            </tbody>
          </DesktopDataTable>

          <MobileDataList>
            {items.map((report) => (
              <FinanceMobileRow
                key={teamReportId(report)}
                title={
                  <div className="space-y-1">
                    <p>{report.title}</p>
                    <span
                      className={cn(
                        "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                        teamReportStatusClass(report.status),
                      )}
                    >
                      {teamReportStatusLabel(report.status)}
                    </span>
                  </div>
                }
                subtitle={`${report.submitterName} · ${teamReportTypeLabel(report.reportType)}`}
                meta={formatReportPeriod(report.periodStart, report.periodEnd)}
                actions={renderActions(report, true)}
              />
            ))}
          </MobileDataList>
        </FinanceTableShell>
      )}

      <Dialog
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open);
          if (!open) {
            setReportToPickerOpen(false);
            setMemberSearch("");
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit & resubmit report" : "Submit team report"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="e.g. Week 12 progress report"
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select
                  value={form.reportType}
                  onValueChange={(value: TeamReportType) => {
                    const period = defaultPeriodForType(value);
                    setForm((prev) => ({
                      ...prev,
                      reportType: value,
                      periodStart: period.start,
                      periodEnd: period.end,
                    }));
                  }}
                >
                  <SelectTrigger className={filterSelectClass}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Period start</Label>
                <Input
                  type="date"
                  value={form.periodStart}
                  onChange={(e) => setForm((prev) => ({ ...prev, periodStart: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Period end</Label>
                <Input
                  type="date"
                  value={form.periodEnd}
                  onChange={(e) => setForm((prev) => ({ ...prev, periodEnd: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Reporting to</Label>
              <p className="text-xs text-muted-foreground">
                Select one or more people who should receive and review this report.
              </p>
              <button
                type="button"
                onClick={openReportToPicker}
                className={cn(
                  filterSelectClass,
                  "flex h-10 w-full items-center justify-between px-3 text-left text-sm",
                )}
              >
                <span
                  className={cn(
                    "min-w-0 truncate",
                    selectedRecipients.length ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {selectedRecipients.length === 0
                    ? "Select people…"
                    : selectedRecipients.length === 1
                      ? selectedRecipients[0].name
                      : `${selectedRecipients.length} people selected`}
                </span>
                <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
              </button>
              {selectedRecipients.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {selectedRecipients.map((member) => (
                    <span
                      key={member._id}
                      className="inline-flex max-w-full items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs text-foreground"
                    >
                      <span className="truncate">{member.name}</span>
                      <button
                        type="button"
                        className="shrink-0 text-muted-foreground hover:text-foreground"
                        aria-label={`Remove ${member.name}`}
                        onClick={() =>
                          setForm((prev) => ({
                            ...prev,
                            reportTo: prev.reportTo.filter((id) => id !== member._id),
                          }))
                        }
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label>Accomplishments</Label>
              <Textarea
                rows={4}
                value={form.accomplishments}
                onChange={(e) => setForm((prev) => ({ ...prev, accomplishments: e.target.value }))}
                placeholder="What did you complete?"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Blockers</Label>
              <Textarea
                rows={3}
                value={form.blockers}
                onChange={(e) => setForm((prev) => ({ ...prev, blockers: e.target.value }))}
                placeholder="Anything slowing you down? (optional)"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Next steps</Label>
              <Textarea
                rows={3}
                value={form.nextSteps}
                onChange={(e) => setForm((prev) => ({ ...prev, nextSteps: e.target.value }))}
                placeholder="What will you focus on next? (optional)"
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Attachment name</Label>
                <Input
                  value={form.attachmentName}
                  onChange={(e) => setForm((prev) => ({ ...prev, attachmentName: e.target.value }))}
                  placeholder="Optional file label"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Attachment URL</Label>
                <Input
                  value={form.attachmentUrl}
                  onChange={(e) => setForm((prev) => ({ ...prev, attachmentUrl: e.target.value }))}
                  placeholder="https://..."
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void handleSave()} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {editing ? "Save & resubmit" : "Submit report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={reportToPickerOpen}
        onOpenChange={(open) => {
          setReportToPickerOpen(open);
          if (!open) setMemberSearch("");
        }}
      >
        <DialogContent
          className="z-[70] max-h-[85vh] overflow-hidden sm:max-w-md"
          overlayClassName="z-[65]"
        >
          <DialogHeader>
            <DialogTitle>Select who you are reporting to</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                placeholder="Search by name…"
                className="pl-9"
                autoFocus
              />
            </div>
            <div className="max-h-[45vh] space-y-1 overflow-y-auto rounded-md border border-border p-1">
              {teamMembers.length === 0 ? (
                <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                  No active team members available.
                </p>
              ) : filteredMembers.length === 0 ? (
                <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                  No matching people found.
                </p>
              ) : (
                filteredMembers.map((member) => {
                  const selected = pendingReportTo.includes(member._id);
                  return (
                    <button
                      key={member._id}
                      type="button"
                      className={cn(
                        "flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm transition-colors",
                        selected ? "bg-sky-50 dark:bg-sky-500/15" : "hover:bg-muted",
                      )}
                      onClick={() =>
                        setPendingReportTo((prev) =>
                          selected
                            ? prev.filter((id) => id !== member._id)
                            : [...prev, member._id],
                        )
                      }
                    >
                      <Check
                        className={cn(
                          "h-4 w-4 shrink-0",
                          selected ? "opacity-100 text-sky-600 dark:text-sky-300" : "opacity-0",
                        )}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium text-foreground">
                          {member.name}
                        </span>
                        {member.jobTitle ? (
                          <span className="block truncate text-xs text-muted-foreground">
                            {member.jobTitle}
                          </span>
                        ) : null}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {pendingReportTo.length === 0
                ? "No one selected yet."
                : `${pendingReportTo.length} selected`}
            </p>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setReportToPickerOpen(false);
                setMemberSearch("");
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                setForm((prev) => ({ ...prev, reportTo: pendingReportTo }));
                setReportToPickerOpen(false);
                setMemberSearch("");
              }}
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(detail)} onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{detail?.title}</DialogTitle>
          </DialogHeader>
          {detail ? (
            <div className="space-y-3 text-sm">
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span>{detail.submitterName}</span>
                <span>·</span>
                <span>{teamReportTypeLabel(detail.reportType)}</span>
                <span>·</span>
                <span>{formatReportPeriod(detail.periodStart, detail.periodEnd)}</span>
              </div>
              {detail.reportTo?.length ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Reporting to
                  </p>
                  <p className="mt-1 text-foreground">
                    {detail.reportTo.map((recipient) => recipient.name).join(", ")}
                  </p>
                </div>
              ) : null}
              <span
                className={cn(
                  "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                  teamReportStatusClass(detail.status),
                )}
              >
                {teamReportStatusLabel(detail.status)}
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Accomplishments
                </p>
                <p className="mt-1 whitespace-pre-wrap text-foreground">{detail.accomplishments}</p>
              </div>
              {detail.blockers ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Blockers
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-foreground">{detail.blockers}</p>
                </div>
              ) : null}
              {detail.nextSteps ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Next steps
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-foreground">{detail.nextSteps}</p>
                </div>
              ) : null}
              {detail.attachmentUrl ? (
                <a
                  href={detail.attachmentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-sky-700 dark:text-sky-300"
                >
                  <Paperclip className="h-3.5 w-3.5" />
                  {detail.attachmentName || "Attachment"}
                </a>
              ) : null}
              {detail.reviewNote ? (
                <div className="rounded-md bg-muted/50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Reviewer note
                  </p>
                  <p className="mt-1 whitespace-pre-wrap">{detail.reviewNote}</p>
                  {detail.reviewedByName ? (
                    <p className="mt-2 text-xs text-muted-foreground">— {detail.reviewedByName}</p>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(rejectTarget)} onOpenChange={(open) => !open && setRejectTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject report</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Note (optional)</Label>
            <Textarea value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} rows={3} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRejectTarget(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={!rejectTarget || actingId !== null}
              onClick={() => {
                if (!rejectTarget) return;
                const id = teamReportId(rejectTarget);
                void runAction(
                  `${id}-reject`,
                  () => teamReportApi.reject(id, { reviewNote: reviewNote.trim() || undefined }),
                  "Rejected",
                  `${rejectTarget.title} was rejected.`,
                );
              }}
            >
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(changesTarget)} onOpenChange={(open) => !open && setChangesTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request changes</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>What should be updated?</Label>
            <Textarea value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} rows={3} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setChangesTarget(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!changesTarget || !reviewNote.trim() || actingId !== null}
              onClick={() => {
                if (!changesTarget || !reviewNote.trim()) return;
                const id = teamReportId(changesTarget);
                void runAction(
                  `${id}-changes`,
                  () => teamReportApi.requestChanges(id, { note: reviewNote.trim() }),
                  "Changes requested",
                  `${changesTarget.title} was returned to the submitter.`,
                );
              }}
            >
              Send request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
