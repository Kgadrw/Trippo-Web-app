import { useCallback, useEffect, useMemo, useState } from "react";
import { leaveRequestApi, teamMemberApi, type TeamMemberRecord } from "@/lib/api";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";
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
  FINANCE_TH_CLASS,
  FINANCE_TD_CLASS,
  formatFinanceTableDate,
  FinanceTableLoading,
  FinanceTableShell,
  DesktopDataTable,
  MobileDataList,
  MobileListCard,
} from "@/components/finance/financeTable";
import {
  Loader2,
  Plus,
  CheckCircle2,
  XCircle,
  Ban,
  MessageSquareWarning,
  Pencil,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import {
  canEditLeaveRequest,
  formatLeaveRange,
  leaveId,
  leaveStatusClass,
  leaveStatusLabel,
  leaveTypeLabel,
  type LeaveRequestRecord,
  type LeaveType,
} from "@/lib/leaveWorkflow";

const LEAVE_TYPES: LeaveType[] = ["annual", "sick", "unpaid", "personal", "other"];

function dispatchLeaveRefresh() {
  window.dispatchEvent(new CustomEvent("leave-requests-should-refresh"));
  window.dispatchEvent(new CustomEvent("notifications-should-refresh"));
}

export function TeamLeaveTab() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { mode, isWorkspaceAdmin, activeWorkspace } = useWorkspace();
  const canReviewLeave =
    mode === "workspace" &&
    (isWorkspaceAdmin || (activeWorkspace?.permissions || []).includes("hr"));

  const [requests, setRequests] = useState<LeaveRequestRecord[]>([]);
  const [members, setMembers] = useState<TeamMemberRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filter, setFilter] = useState<
    "all" | "pending" | "approved" | "rejected" | "changes_requested"
  >("all");
  const [view, setView] = useState<"mine" | "team" | "public">(canReviewLeave ? "team" : "mine");

  useEffect(() => {
    // Reviewers should land on team queue so pending requests are visible.
    if (canReviewLeave) {
      setView((prev) => (prev === "public" ? prev : "team"));
    } else {
      setView((prev) => (prev === "team" ? "mine" : prev));
    }
  }, [canReviewLeave]);

  const [open, setOpen] = useState(false);
  const [leaveType, setLeaveType] = useState<LeaveType>("annual");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [teamMemberId, setTeamMemberId] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [editing, setEditing] = useState<LeaveRequestRecord | null>(null);
  const [rejectTarget, setRejectTarget] = useState<LeaveRequestRecord | null>(null);
  const [rejectionNote, setRejectionNote] = useState("");
  const [changesTarget, setChangesTarget] = useState<LeaveRequestRecord | null>(null);
  const [changeNote, setChangeNote] = useState("");
  const [actingId, setActingId] = useState<string | null>(null);

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const statusParam = filter === "all" ? undefined : filter;
      const [leaveRes, memberRes] = await Promise.all([
        leaveRequestApi.getAll(statusParam ? { status: statusParam } : undefined),
        teamMemberApi.getAll({ status: "active" }),
      ]);
      setRequests((leaveRes.data as LeaveRequestRecord[]) || []);
      setMembers((memberRes.data as TeamMemberRecord[]) || []);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Could not load leave requests.";
      toast({ title: t("error"), description: message, variant: "destructive" });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [filter, t, toast]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    const onRefresh = () => void loadData(true);
    window.addEventListener("leave-requests-should-refresh", onRefresh);
    return () => window.removeEventListener("leave-requests-should-refresh", onRefresh);
  }, [loadData]);

  const visibleRequests = useMemo(() => {
    const userId = localStorage.getItem("profit-pilot-user-id");
    if (canReviewLeave && view === "team") return requests;
    if (view === "public") {
      return requests.filter(
        (r) =>
          Boolean(r.isPublic) &&
          (r.status === "approved" || r.status === "rejected") &&
          (!userId || String(r.requesterUserId || "") !== userId),
      );
    }
    if (!userId) return requests;
    return requests.filter((r) => String(r.requesterUserId || "") === userId);
  }, [requests, canReviewLeave, view]);

  const pendingTeamCount = useMemo(
    () =>
      canReviewLeave
        ? requests.filter((r) => r.status === "pending").length
        : requests.filter(
            (r) =>
              r.status === "pending" &&
              String(r.requesterUserId || "") === localStorage.getItem("profit-pilot-user-id"),
          ).length,
    [requests, canReviewLeave],
  );

  const resetForm = () => {
    setLeaveType("annual");
    setStartDate("");
    setEndDate("");
    setReason("");
    setTeamMemberId("");
    setIsPublic(false);
    setEditing(null);
  };

  const openCreate = () => {
    resetForm();
    const today = new Date().toISOString().split("T")[0];
    setStartDate(today);
    setEndDate(today);
    setOpen(true);
  };

  const openEdit = (record: LeaveRequestRecord) => {
    setLeaveType(record.leaveType);
    setStartDate(record.startDate?.split("T")[0] || record.startDate);
    setEndDate(record.endDate?.split("T")[0] || record.endDate);
    setReason(record.reason || "");
    setTeamMemberId(record.teamMemberId ? String(record.teamMemberId) : "");
    setIsPublic(Boolean(record.isPublic));
    setEditing(record);
    setOpen(true);
  };

  const handleSave = async () => {
    if (!startDate || !endDate) {
      toast({ title: "Missing dates", description: "Please select start and end dates.", variant: "destructive" });
      return;
    }
    if (endDate < startDate) {
      toast({ title: "Invalid dates", description: "End date must be on or after start date.", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        leaveType,
        startDate,
        endDate,
        reason: reason.trim() || undefined,
        teamMemberId: teamMemberId || undefined,
        isPublic: mode === "workspace" ? isPublic : false,
      };

      if (editing) {
        await leaveRequestApi.update(leaveId(editing), payload);
        toast({
          title: "Leave updated",
          description: "Your leave request has been saved.",
        });
      } else {
        await leaveRequestApi.create(payload);
        toast({
          title: "Leave requested",
          description:
            mode === "workspace"
              ? "Request submitted as pending. An admin or HR will review it."
              : "Leave request saved.",
        });
      }
      setOpen(false);
      resetForm();
      dispatchLeaveRefresh();
      await loadData(true);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Could not submit leave request.";
      toast({ title: t("error"), description: message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleApprove = async (record: LeaveRequestRecord) => {
    if (!canReviewLeave) return;
    const id = leaveId(record);
    setActingId(`${id}-approve`);
    try {
      await leaveRequestApi.approve(id);
      toast({ title: "Approved", description: `Leave approved for ${record.requesterName}.` });
      dispatchLeaveRefresh();
      await loadData(true);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Could not approve leave.";
      toast({ title: t("error"), description: message, variant: "destructive" });
    } finally {
      setActingId(null);
    }
  };

  const handleRejectConfirm = async () => {
    if (!canReviewLeave || !rejectTarget) return;
    const id = leaveId(rejectTarget);
    setActingId(`${id}-reject`);
    try {
      await leaveRequestApi.reject(id, { rejectionNote: rejectionNote.trim() || undefined });
      toast({ title: "Rejected", description: `Leave rejected for ${rejectTarget.requesterName}.` });
      setRejectTarget(null);
      setRejectionNote("");
      dispatchLeaveRefresh();
      await loadData(true);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Could not reject leave.";
      toast({ title: t("error"), description: message, variant: "destructive" });
    } finally {
      setActingId(null);
    }
  };

  const handleRequestChangesConfirm = async () => {
    if (!canReviewLeave || !changesTarget) return;
    const note = changeNote.trim();
    if (!note) {
      toast({
        title: "Note required",
        description: "Please explain what changes are needed.",
        variant: "destructive",
      });
      return;
    }
    const id = leaveId(changesTarget);
    setActingId(`${id}-changes`);
    try {
      await leaveRequestApi.requestChanges(id, { note });
      toast({
        title: "Changes requested",
        description: `Feedback sent to ${changesTarget.requesterName}.`,
      });
      setChangesTarget(null);
      setChangeNote("");
      dispatchLeaveRefresh();
      await loadData(true);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Could not request changes.";
      toast({ title: t("error"), description: message, variant: "destructive" });
    } finally {
      setActingId(null);
    }
  };

  const handleResubmit = async (record: LeaveRequestRecord) => {
    const id = leaveId(record);
    setActingId(`${id}-resubmit`);
    try {
      await leaveRequestApi.resubmit(id);
      toast({ title: "Resubmitted", description: "Leave request sent back for review." });
      dispatchLeaveRefresh();
      await loadData(true);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Could not resubmit leave.";
      toast({ title: t("error"), description: message, variant: "destructive" });
    } finally {
      setActingId(null);
    }
  };

  const handleCancel = async (record: LeaveRequestRecord) => {
    const id = leaveId(record);
    setActingId(`${id}-cancel`);
    try {
      await leaveRequestApi.cancel(id);
      toast({ title: "Cancelled", description: "Leave request cancelled." });
      dispatchLeaveRefresh();
      await loadData(true);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Could not cancel leave.";
      toast({ title: t("error"), description: message, variant: "destructive" });
    } finally {
      setActingId(null);
    }
  };

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Button size="sm" variant={view === "mine" ? "default" : "outline"} onClick={() => setView("mine")}>
          My requests
        </Button>
        {canReviewLeave ? (
          <Button size="sm" variant={view === "team" ? "default" : "outline"} onClick={() => setView("team")}>
            Team requests
          </Button>
        ) : mode === "workspace" ? (
          <Button size="sm" variant={view === "public" ? "default" : "outline"} onClick={() => setView("public")}>
            Team decisions
          </Button>
        ) : null}
        {(["all", "pending", "approved", "rejected", "changes_requested"] as const).map((value) => (
          <Button
            key={value}
            size="sm"
            variant={filter === value ? "default" : "outline"}
            onClick={() => setFilter(value)}
          >
            {value === "all" ? "All" : leaveStatusLabel(value)}
          </Button>
        ))}
      </div>

      <FinanceTableShell
        title="Leave"
        onAdd={openCreate}
        addLabel="Request leave"
        onRefresh={() => {
          setIsRefreshing(true);
          void loadData(true);
        }}
        isRefreshing={isRefreshing}
      >
        {isLoading ? (
          <FinanceTableLoading />
        ) : visibleRequests.length === 0 ? (
          <div className="px-4 py-16 text-center text-sm text-gray-500">
            {canReviewLeave && view === "mine" && pendingTeamCount > 0 ? (
              <>
                No personal leave in this filter.{" "}
                <button
                  type="button"
                  className="font-medium text-sky-600 hover:underline"
                  onClick={() => setView("team")}
                >
                  View {pendingTeamCount} pending team request{pendingTeamCount === 1 ? "" : "s"}
                </button>
              </>
            ) : (
              <>No leave requests yet. Click &quot;Request leave&quot; to submit time off.</>
            )}
          </div>
        ) : (
          <>
          <DesktopDataTable>
            <table className="w-full min-w-[900px] border-collapse">
              <thead>
                <tr>
                  {(canReviewLeave && view === "team") || view === "public" ? (
                    <th className={FINANCE_TH_CLASS}>Employee</th>
                  ) : null}
                  <th className={FINANCE_TH_CLASS}>Type</th>
                  <th className={FINANCE_TH_CLASS}>Dates</th>
                  <th className={FINANCE_TH_CLASS}>Status</th>
                  <th className={cn(FINANCE_TH_CLASS, "hidden md:table-cell")}>Reason</th>
                  <th className={cn(FINANCE_TH_CLASS, "hidden lg:table-cell")}>Reviewed</th>
                  <th className={FINANCE_TH_CLASS}>Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {visibleRequests.map((record) => {
                  const id = leaveId(record);
                  const isPending = record.status === "pending";
                  const isChangesRequested = record.status === "changes_requested";
                  const userId = localStorage.getItem("profit-pilot-user-id");
                  const isOwn = userId && String(record.requesterUserId || "") === userId;
                  const showReviewActions = canReviewLeave && isPending && view === "team";
                  const showEditResubmit = isOwn && canEditLeaveRequest(record.status);
                  const showCancel = isOwn && (isPending || isChangesRequested);

                  return (
                    <tr key={id} className="transition-colors hover:bg-gray-50/80">
                      {(canReviewLeave && view === "team") || view === "public" ? (
                        <td className={cn(FINANCE_TD_CLASS, "font-medium text-gray-900")}>
                          {record.requesterName}
                        </td>
                      ) : null}
                      <td className={cn(FINANCE_TD_CLASS, "text-gray-700")}>
                        {leaveTypeLabel(record.leaveType)}
                        {record.isPublic && isOwn ? (
                          <span className="ml-1 text-[10px] font-medium uppercase text-sky-600">Public</span>
                        ) : null}
                      </td>
                      <td className={cn(FINANCE_TD_CLASS, "text-gray-700 tabular-nums whitespace-nowrap")}>
                        {formatLeaveRange(record.startDate, record.endDate, record.dayCount)}
                      </td>
                      <td className={FINANCE_TD_CLASS}>
                        <span
                          className={cn(
                            "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                            leaveStatusClass(record.status),
                          )}
                        >
                          {leaveStatusLabel(record.status)}
                        </span>
                        {record.rejectionNote ? (
                          <div
                            className={cn(
                              "text-xs mt-1 max-w-[180px]",
                              record.status === "changes_requested" ? "text-orange-600" : "text-red-600",
                            )}
                          >
                            {record.rejectionNote}
                          </div>
                        ) : null}
                      </td>
                      <td className={cn(FINANCE_TD_CLASS, "hidden md:table-cell text-gray-600 max-w-[200px] truncate")}>
                        {record.reason || "—"}
                      </td>
                      <td className={cn(FINANCE_TD_CLASS, "hidden lg:table-cell text-gray-600 text-xs")}>
                        {record.reviewedAt ? (
                          <>
                            {record.reviewedByName || "Manager"}
                            <div>{formatFinanceTableDate(record.reviewedAt)}</div>
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className={FINANCE_TD_CLASS}>
                        <div className="flex flex-wrap gap-1">
                          {showReviewActions ? (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-xs text-emerald-700 border-emerald-200"
                                disabled={actingId !== null}
                                onClick={() => void handleApprove(record)}
                              >
                                {actingId === `${id}-approve` ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                                )}
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-xs text-red-700 border-red-200"
                                disabled={actingId !== null}
                                onClick={() => {
                                  setRejectTarget(record);
                                  setRejectionNote("");
                                }}
                              >
                                <XCircle className="h-3.5 w-3.5 mr-1" />
                                Reject
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-xs text-orange-700 border-orange-200"
                                disabled={actingId !== null}
                                onClick={() => {
                                  setChangesTarget(record);
                                  setChangeNote("");
                                }}
                              >
                                <MessageSquareWarning className="h-3.5 w-3.5 mr-1" />
                                Request changes
                              </Button>
                            </>
                          ) : null}
                          {showEditResubmit ? (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-xs text-gray-700"
                                disabled={actingId !== null}
                                onClick={() => openEdit(record)}
                              >
                                <Pencil className="h-3.5 w-3.5 mr-1" />
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-xs text-sky-700 border-sky-200"
                                disabled={actingId !== null}
                                onClick={() => void handleResubmit(record)}
                              >
                                {actingId === `${id}-resubmit` ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <RefreshCw className="h-3.5 w-3.5 mr-1" />
                                )}
                                Resubmit
                              </Button>
                            </>
                          ) : null}
                          {showCancel ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-xs text-gray-600"
                              disabled={actingId !== null}
                              onClick={() => void handleCancel(record)}
                            >
                              {actingId === `${id}-cancel` ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Ban className="h-3.5 w-3.5 mr-1" />
                              )}
                              Cancel
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </DesktopDataTable>

          <MobileDataList>
            {visibleRequests.map((record, index) => {
              const id = leaveId(record);
              const isPending = record.status === "pending";
              const isChangesRequested = record.status === "changes_requested";
              const userId = localStorage.getItem("profit-pilot-user-id");
              const isOwn = userId && String(record.requesterUserId || "") === userId;
              const showEmployee = (canReviewLeave && view === "team") || view === "public";
              const showReviewActions = canReviewLeave && isPending && view === "team";
              const showEditResubmit = isOwn && canEditLeaveRequest(record.status);
              const showCancel = isOwn && (isPending || isChangesRequested);

              return (
                <MobileListCard key={id} index={index}>
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1 space-y-0.5">
                        {showEmployee ? (
                          <div className="text-sm font-semibold text-gray-900">{record.requesterName}</div>
                        ) : null}
                        <div className="text-sm font-medium text-gray-900">
                          {leaveTypeLabel(record.leaveType)}
                          {record.isPublic && isOwn ? (
                            <span className="ml-1 text-[10px] font-medium uppercase text-sky-600">Public</span>
                          ) : null}
                        </div>
                        <div className="text-xs text-gray-600 tabular-nums">
                          {formatLeaveRange(record.startDate, record.endDate, record.dayCount)}
                        </div>
                        <span
                          className={cn(
                            "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                            leaveStatusClass(record.status),
                          )}
                        >
                          {leaveStatusLabel(record.status)}
                        </span>
                        {record.rejectionNote ? (
                          <div
                            className={cn(
                              "text-xs",
                              record.status === "changes_requested" ? "text-orange-600" : "text-red-600",
                            )}
                          >
                            {record.rejectionNote}
                          </div>
                        ) : null}
                        {record.reason ? (
                          <div className="text-xs text-gray-500 line-clamp-2">{record.reason}</div>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {showReviewActions ? (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs text-emerald-700 border-emerald-200"
                            disabled={actingId !== null}
                            onClick={() => void handleApprove(record)}
                          >
                            {actingId === `${id}-approve` ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                            )}
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs text-red-700 border-red-200"
                            disabled={actingId !== null}
                            onClick={() => {
                              setRejectTarget(record);
                              setRejectionNote("");
                            }}
                          >
                            <XCircle className="h-3.5 w-3.5 mr-1" />
                            Reject
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs text-orange-700 border-orange-200"
                            disabled={actingId !== null}
                            onClick={() => {
                              setChangesTarget(record);
                              setChangeNote("");
                            }}
                          >
                            <MessageSquareWarning className="h-3.5 w-3.5 mr-1" />
                            Request changes
                          </Button>
                        </>
                      ) : null}
                      {showEditResubmit ? (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs text-gray-700"
                            disabled={actingId !== null}
                            onClick={() => openEdit(record)}
                          >
                            <Pencil className="h-3.5 w-3.5 mr-1" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs text-sky-700 border-sky-200"
                            disabled={actingId !== null}
                            onClick={() => void handleResubmit(record)}
                          >
                            {actingId === `${id}-resubmit` ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <RefreshCw className="h-3.5 w-3.5 mr-1" />
                            )}
                            Resubmit
                          </Button>
                        </>
                      ) : null}
                      {showCancel ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs text-gray-600"
                          disabled={actingId !== null}
                          onClick={() => void handleCancel(record)}
                        >
                          {actingId === `${id}-cancel` ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Ban className="h-3.5 w-3.5 mr-1" />
                          )}
                          Cancel
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </MobileListCard>
              );
            })}
          </MobileDataList>
          </>
        )}
      </FinanceTableShell>

      <Dialog open={open} onOpenChange={(next) => { if (!next) resetForm(); setOpen(next); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit leave request" : "Request leave"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            {members.length > 0 ? (
              <div>
                <Label>Team profile (optional)</Label>
                <Select value={teamMemberId || "none"} onValueChange={(v) => setTeamMemberId(v === "none" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Link to team member" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Not linked</SelectItem>
                    {members.map((m) => (
                      <SelectItem key={String(m._id || m.id)} value={String(m._id || m.id)}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            <div>
              <Label>Leave type</Label>
              <Select value={leaveType} onValueChange={(v) => setLeaveType(v as LeaveType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LEAVE_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>{leaveTypeLabel(type)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="leave-start">Start date</Label>
                <Input id="leave-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="leave-end">End date</Label>
                <Input id="leave-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>
            <div>
              <Label htmlFor="leave-reason">Reason (optional)</Label>
              <Textarea
                id="leave-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder="Brief note for your manager..."
              />
            </div>
            {mode === "workspace" ? (
              <label className="flex items-start gap-2.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-700">
                <Checkbox
                  checked={isPublic}
                  onCheckedChange={(checked) => setIsPublic(checked === true)}
                  className="mt-0.5"
                />
                <span>
                  <span className="font-medium text-gray-900">Share decision with the team</span>
                  <span className="mt-0.5 block text-xs text-gray-500">
                    If enabled, other members can see the approved or rejected result (not the pending request).
                  </span>
                </span>
              </label>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { resetForm(); setOpen(false); }}>Cancel</Button>
            <Button onClick={() => void handleSave()} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : editing ? (
                <>Save changes</>
              ) : (
                <>
                  <Plus className="mr-1 h-4 w-4" />
                  Submit
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(rejectTarget)} onOpenChange={(next) => { if (!next) setRejectTarget(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reject leave request</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            {rejectTarget
              ? `Reject leave for ${rejectTarget.requesterName} (${formatLeaveRange(rejectTarget.startDate, rejectTarget.endDate, rejectTarget.dayCount)})?`
              : ""}
          </p>
          <div>
            <Label htmlFor="leave-rejection-note">Reason (optional)</Label>
            <Textarea
              id="leave-rejection-note"
              value={rejectionNote}
              onChange={(e) => setRejectionNote(e.target.value)}
              rows={3}
              placeholder="Explain why this leave was rejected..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>Cancel</Button>
            <Button variant="destructive" disabled={actingId !== null} onClick={() => void handleRejectConfirm()}>
              {actingId ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={Boolean(changesTarget)} onOpenChange={(next) => { if (!next) { setChangesTarget(null); setChangeNote(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Request changes</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            {changesTarget
              ? `Ask ${changesTarget.requesterName} to update their leave request (${formatLeaveRange(changesTarget.startDate, changesTarget.endDate, changesTarget.dayCount)})?`
              : ""}
          </p>
          <div>
            <Label htmlFor="leave-change-note">What needs to change? (required)</Label>
            <Textarea
              id="leave-change-note"
              value={changeNote}
              onChange={(e) => setChangeNote(e.target.value)}
              rows={3}
              placeholder="Explain what the employee should update..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setChangesTarget(null); setChangeNote(""); }}>Cancel</Button>
            <Button
              className="bg-orange-600 hover:bg-orange-700"
              disabled={actingId !== null || !changeNote.trim()}
              onClick={() => void handleRequestChangesConfirm()}
            >
              {actingId ? <Loader2 className="h-4 w-4 animate-spin" /> : "Request changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
