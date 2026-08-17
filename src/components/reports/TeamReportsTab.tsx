import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  MessageSquareWarning,
  Plus,
  RefreshCw,
  Upload,
  FileText,
  Link2,
  X,
  Check,
  Pencil,
  Trash2,
  MoreVertical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { uploadCompanyDocument } from "@/lib/financeUpload";
import { ReportAttachmentViewer } from "@/components/reports/ReportAttachmentViewer";
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
  canDeleteTeamReport,
  canEditTeamReport,
  canReviewTeamReport,
  defaultPeriodForType,
  shouldResubmitTeamReport,
  teamReportId,
  teamReportStatusClass,
  teamReportStatusLabel,
  teamReportSubmitterStatusLabel,
  type TeamReportRecord,
  type TeamReportStatus,
} from "@/lib/teamReportWorkflow";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";

type StatusFilter = TeamReportStatus | "all" | "mine";

function currentUserId() {
  return localStorage.getItem("profit-pilot-user-id");
}

function isOwnReport(report: TeamReportRecord, userId: string | null) {
  if (!userId || !report.submitterUserId) return false;
  return String(report.submitterUserId) === String(userId);
}

function reportToNames(report: TeamReportRecord) {
  const names = (report.reportTo || []).map((recipient) => recipient.name).filter(Boolean);
  return names.length ? names.join(", ") : "—";
}

const emptyForm = () => {
  const period = defaultPeriodForType("daily");
  return {
    title: "",
    description: "",
    attachmentUrl: "",
    attachmentName: "",
    reportTo: [] as string[],
    periodStart: period.start,
    periodEnd: period.end,
  };
};

export function TeamReportsTab() {
  const { toast } = useToast();
  const { mode } = useWorkspace();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<TeamReportRecord[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMemberRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TeamReportRecord | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<TeamReportRecord | null>(null);
  const [changesTarget, setChangesTarget] = useState<TeamReportRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TeamReportRecord | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [detail, setDetail] = useState<TeamReportRecord | null>(null);
  const userId = currentUserId();
  const myMemberId = useMemo(() => {
    if (!userId) return null;
    const mine = teamMembers.find((member) => String(member.linkedUserId) === String(userId));
    return mine?._id ?? null;
  }, [teamMembers, userId]);

  const loadReports = useCallback(
    async (silent = false) => {
      if (!silent) setIsLoading(true);
      try {
        const params: { status?: string; mine?: boolean } = {};
        if (filter === "mine") params.mine = true;
        else if (filter !== "all") params.status = filter;
        const response = await teamReportApi.getAll(params);
        setItems((response.data || []) as TeamReportRecord[]);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Could not load reports.";
        toast({ title: "Error", description: message, variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    },
    [filter, toast],
  );

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  useEffect(() => {
    void teamMemberApi
      .getAll({ status: "active" })
      .then((response) =>
        setTeamMembers(
          ((response.data || []) as TeamMemberRecord[]).filter((member) => Boolean(member.linkedUserId)),
        ),
      )
      .catch(() => setTeamMembers([]));
  }, []);

  const selectedRecipients = useMemo(
    () => teamMembers.filter((member) => form.reportTo.includes(member._id)),
    [form.reportTo, teamMembers],
  );

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setAttachmentFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setModalOpen(true);
  };

  const openEdit = (report: TeamReportRecord) => {
    setEditing(report);
    setForm({
      title: report.title || "",
      description: report.accomplishments || "",
      attachmentUrl: report.attachmentUrl || "",
      attachmentName: report.attachmentName || "",
      reportTo: (report.reportTo || []).map((recipient) => recipient.memberId),
      periodStart: String(report.periodStart || "").slice(0, 10) || emptyForm().periodStart,
      periodEnd: String(report.periodEnd || "").slice(0, 10) || emptyForm().periodEnd,
    });
    setAttachmentFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setModalOpen(true);
  };

  const clearAttachment = () => {
    setAttachmentFile(null);
    setForm((prev) => ({ ...prev, attachmentUrl: "", attachmentName: "" }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.description.trim()) {
      toast({
        title: "Missing fields",
        description: "Report name and description are required.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      let attachmentUrl = form.attachmentUrl.trim() || undefined;
      let attachmentName = form.attachmentName.trim() || undefined;

      if (attachmentFile) {
        const uploaded = await uploadCompanyDocument(attachmentFile);
        attachmentUrl = uploaded.fileUrl;
        attachmentName = uploaded.fileName || attachmentFile.name;
      }

      const payload = {
        title: form.title.trim(),
        reportType: "daily" as const,
        periodStart: form.periodStart,
        periodEnd: form.periodEnd,
        accomplishments: form.description.trim(),
        blockers: "",
        nextSteps: "",
        attachmentUrl,
        attachmentName,
        reportTo: form.reportTo,
      };

      if (editing) {
        const id = teamReportId(editing);
        await teamReportApi.update(id, payload);
        if (shouldResubmitTeamReport(editing.status)) {
          await teamReportApi.resubmit(id);
          toast({ title: "Report updated", description: "Your report was resubmitted for review." });
        } else {
          toast({ title: "Report updated", description: "Your changes were saved." });
        }
      } else {
        await teamReportApi.create(payload);
        toast({
          title: "Report submitted",
          description:
            mode === "workspace"
              ? "People you reported to can now review it in Approvals."
              : "Your report was saved.",
        });
      }
      setModalOpen(false);
      window.dispatchEvent(new CustomEvent("approvals-should-refresh"));
      window.dispatchEvent(new CustomEvent("notifications-should-refresh"));
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
      window.dispatchEvent(new CustomEvent("approvals-should-refresh"));
      window.dispatchEvent(new CustomEvent("notifications-should-refresh"));
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

  const attachmentLabel = attachmentFile?.name || form.attachmentName || "";

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const id = teamReportId(deleteTarget);
    setActingId(`${id}-delete`);
    try {
      await teamReportApi.delete(id);
      toast({ title: "Report deleted", description: `"${deleteTarget.title}" was removed.` });
      setDeleteTarget(null);
      if (detail && teamReportId(detail) === id) setDetail(null);
      await loadReports(true);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Could not delete report.";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setActingId(null);
    }
  };

  const renderActions = (report: TeamReportRecord, compact = false) => {
    const id = teamReportId(report);
    const isPending = report.status === "submitted";
    const ownedByMe = isOwnReport(report, userId);
    const showEdit = ownedByMe && canEditTeamReport(report.status);
    const showDelete = ownedByMe && canDeleteTeamReport(report.status);
    const showReviewActions = canReviewTeamReport(report, userId, myMemberId) && isPending;
    const needsResubmit = shouldResubmitTeamReport(report.status);
    return (
      <div
        className={cn(
          "flex flex-wrap items-center gap-1.5",
          compact ? "justify-end" : "justify-end",
        )}
      >
        {ownedByMe ? (
          <span
            className={cn(
              "inline-flex max-w-full items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
              teamReportStatusClass(report.status),
            )}
            title={
              report.reviewNote
                ? `${teamReportSubmitterStatusLabel(report.status)} — ${report.reviewNote}`
                : teamReportSubmitterStatusLabel(report.status)
            }
          >
            {teamReportSubmitterStatusLabel(report.status)}
          </span>
        ) : null}
        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setDetail(report)}>
          View
        </Button>
        {showEdit || showDelete ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 px-0 text-muted-foreground"
                disabled={actingId !== null}
                aria-label="More actions"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {showEdit ? (
                <DropdownMenuItem onClick={() => openEdit(report)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  {needsResubmit ? "Edit & resubmit" : "Edit"}
                </DropdownMenuItem>
              ) : null}
              {showDelete ? (
                <DropdownMenuItem
                  className="text-red-600 focus:text-red-600"
                  onClick={() => setDeleteTarget(report)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
        {showReviewActions ? (
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
            Submit a report with a name, description, and optional document or link. Only the
            submitter can edit; people listed under Reporting to receive it in Approvals.
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
            Submit your first report with a name, description, and optional file or link.
          </p>
          <Button type="button" className="mt-4" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Submit report
          </Button>
        </div>
      ) : (
        <FinanceTableShell>
          <DesktopDataTable>
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className={cn(FINANCE_TH_CLASS, "w-full min-w-[180px]")}>Report name</th>
                  <th className={cn(FINANCE_TH_CLASS, "hidden md:table-cell w-[1%] whitespace-nowrap")}>
                    Submitter
                  </th>
                  <th className={cn(FINANCE_TH_CLASS, "hidden lg:table-cell w-[1%] whitespace-nowrap")}>
                    Reported to
                  </th>
                  <th className={cn(FINANCE_TH_CLASS, "w-[1%] whitespace-nowrap")}>Status</th>
                  <th className={cn(FINANCE_TH_CLASS, "hidden xl:table-cell w-[1%] whitespace-nowrap")}>
                    Submitted
                  </th>
                  <th className={cn(FINANCE_TH_CLASS, "w-[1%] whitespace-nowrap text-right")}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((report) => (
                  <tr
                    key={teamReportId(report)}
                    className="border-b border-transparent hover:bg-muted/40"
                  >
                    <td className={cn(FINANCE_TD_CLASS, "font-medium")}>
                      <div className="min-w-0 max-w-3xl">
                        <p className="break-words">{report.title}</p>
                        {report.accomplishments ? (
                          <p className="mt-0.5 line-clamp-2 text-xs font-normal text-muted-foreground">
                            {report.accomplishments}
                          </p>
                        ) : null}
                        {report.attachmentUrl ? (
                          <div className="mt-1.5">
                            <ReportAttachmentViewer
                              fileUrl={report.attachmentUrl}
                              fileName={report.attachmentName}
                              compact
                            />
                          </div>
                        ) : null}
                      </div>
                    </td>
                    <td className={cn(FINANCE_TD_CLASS, "hidden md:table-cell whitespace-nowrap")}>
                      {report.submitterName}
                    </td>
                    <td
                      className={cn(
                        FINANCE_TD_CLASS,
                        "hidden lg:table-cell max-w-[200px] text-sm text-muted-foreground",
                      )}
                      title={reportToNames(report)}
                    >
                      <span className="line-clamp-2">{reportToNames(report)}</span>
                    </td>
                    <td className={cn(FINANCE_TD_CLASS, "whitespace-nowrap")}>
                      <span
                        className={cn(
                          "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                          teamReportStatusClass(report.status),
                        )}
                      >
                        {teamReportStatusLabel(report.status)}
                      </span>
                    </td>
                    <td
                      className={cn(
                        FINANCE_TD_CLASS,
                        "hidden xl:table-cell whitespace-nowrap text-xs text-muted-foreground",
                      )}
                    >
                      {formatFinanceTableDate(report.createdAt)}
                    </td>
                    <td className={cn(FINANCE_TD_CLASS, "whitespace-nowrap text-right")}>
                      {renderActions(report)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
                subtitle={
                  [
                    report.submitterName,
                    report.reportTo?.length ? `To ${reportToNames(report)}` : null,
                    report.accomplishments || null,
                  ]
                    .filter(Boolean)
                    .join(" · ")
                }
                meta={
                  report.attachmentUrl ? (
                    <ReportAttachmentViewer
                      fileUrl={report.attachmentUrl}
                      fileName={report.attachmentName}
                      compact
                    />
                  ) : (
                    formatFinanceTableDate(report.createdAt)
                  )
                }
                actions={renderActions(report, true)}
              />
            ))}
          </MobileDataList>
        </FinanceTableShell>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing
                ? shouldResubmitTeamReport(editing.status)
                  ? "Edit & resubmit report"
                  : "Edit report"
                : "Submit report"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="report-name">Report name</Label>
              <Input
                id="report-name"
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="e.g. March inventory summary"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="report-description">Description</Label>
              <Textarea
                id="report-description"
                rows={5}
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Briefly describe this report…"
              />
            </div>

            <div className="space-y-2">
              <Label>Reporting to</Label>
              <p className="text-xs text-muted-foreground">
                Select the people who should receive and review this report.
              </p>
              <div className="max-h-44 space-y-1 overflow-y-auto rounded-md border border-border p-1">
                {teamMembers.length === 0 ? (
                  <p className="px-3 py-4 text-center text-xs text-muted-foreground">
                    No active workspace members are available.
                  </p>
                ) : (
                  teamMembers.map((member) => {
                    const selected = form.reportTo.includes(member._id);
                    return (
                      <button
                        key={member._id}
                        type="button"
                        disabled={saving}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm transition-colors",
                          selected ? "bg-sky-50 dark:bg-sky-500/15" : "hover:bg-muted",
                        )}
                        onClick={() =>
                          setForm((prev) => ({
                            ...prev,
                            reportTo: selected
                              ? prev.reportTo.filter((id) => id !== member._id)
                              : [...prev.reportTo, member._id],
                          }))
                        }
                      >
                        <Check
                          className={cn(
                            "h-4 w-4 shrink-0",
                            selected ? "text-sky-600 opacity-100 dark:text-sky-300" : "opacity-0",
                          )}
                        />
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-foreground">{member.name}</span>
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
              {selectedRecipients.length ? (
                <p className="text-xs text-muted-foreground">
                  Reporting to: {selectedRecipients.map((member) => member.name).join(", ")}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label>Document or link</Label>
              <p className="text-xs text-muted-foreground">
                Upload a file, or paste a link — use either one.
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,application/pdf"
                className="hidden"
                onChange={(e) => {
                  const picked = e.target.files?.[0] ?? null;
                  setAttachmentFile(picked);
                  if (picked) {
                    setForm((prev) => ({
                      ...prev,
                      attachmentName: picked.name,
                      attachmentUrl: "",
                    }));
                  }
                }}
              />

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 gap-1.5"
                  disabled={saving}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload size={14} />
                  {attachmentFile || form.attachmentUrl ? "Change file" : "Upload document"}
                </Button>
                {attachmentLabel ? (
                  <span className="inline-flex max-w-[14rem] items-center gap-1 truncate text-xs text-muted-foreground">
                    <FileText size={14} className="shrink-0" />
                    {attachmentLabel}
                  </span>
                ) : null}
                {(attachmentFile || form.attachmentUrl || form.attachmentName) && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-9 px-2"
                    disabled={saving}
                    onClick={clearAttachment}
                  >
                    <X size={14} />
                  </Button>
                )}
              </div>

              {form.attachmentUrl && !attachmentFile ? (
                <ReportAttachmentViewer
                  fileUrl={form.attachmentUrl}
                  fileName={form.attachmentName || "Attachment"}
                />
              ) : null}

              <div className="relative">
                <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={attachmentFile ? "" : form.attachmentUrl}
                  disabled={Boolean(attachmentFile) || saving}
                  onChange={(e) => {
                    const url = e.target.value;
                    setAttachmentFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                    setForm((prev) => ({
                      ...prev,
                      attachmentUrl: url,
                      attachmentName: url.trim()
                        ? prev.attachmentName || "Link"
                        : "",
                    }));
                  }}
                  placeholder="Or paste a link (https://…)"
                  className="pl-9"
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
              {editing
                ? shouldResubmitTeamReport(editing.status)
                  ? "Save & resubmit"
                  : "Save changes"
                : "Submit report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete report?"
        description={
          deleteTarget
            ? `This will permanently delete “${deleteTarget.title}”. This cannot be undone.`
            : "This will permanently delete the report."
        }
        onConfirm={() => void handleDelete()}
        isDeleting={Boolean(deleteTarget && actingId === `${teamReportId(deleteTarget)}-delete`)}
      />

      <Dialog open={Boolean(detail)} onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{detail?.title}</DialogTitle>
          </DialogHeader>
          {detail ? (
            <div className="space-y-3 text-sm">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>{detail.submitterName}</span>
                <span>·</span>
                <span>{formatFinanceTableDate(detail.createdAt)}</span>
              </div>
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
                  Description
                </p>
                <p className="mt-1 whitespace-pre-wrap text-foreground">{detail.accomplishments}</p>
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
              {detail.attachmentUrl ? (
                <div>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Document
                  </p>
                  <ReportAttachmentViewer
                    fileUrl={detail.attachmentUrl}
                    fileName={detail.attachmentName}
                  />
                </div>
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
