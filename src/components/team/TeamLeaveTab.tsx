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
} from "@/components/finance/financeTable";
import { Loader2, Plus, CheckCircle2, XCircle, Ban } from "lucide-react";
import { cn } from "@/lib/utils";
import {
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
}

export function TeamLeaveTab() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { mode, isWorkspaceAdmin } = useWorkspace();

  const [requests, setRequests] = useState<LeaveRequestRecord[]>([]);
  const [members, setMembers] = useState<TeamMemberRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [view, setView] = useState<"mine" | "team">("mine");

  const [open, setOpen] = useState(false);
  const [leaveType, setLeaveType] = useState<LeaveType>("annual");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [teamMemberId, setTeamMemberId] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const [rejectTarget, setRejectTarget] = useState<LeaveRequestRecord | null>(null);
  const [rejectionNote, setRejectionNote] = useState("");
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
    if (isWorkspaceAdmin && view === "team") return requests;
    const userId = localStorage.getItem("profit-pilot-user-id");
    if (!userId) return requests;
    return requests.filter((r) => String(r.requesterUserId || "") === userId);
  }, [requests, isWorkspaceAdmin, view]);

  const pendingTeamCount = useMemo(
    () => requests.filter((r) => r.status === "pending").length,
    [requests],
  );

  const resetForm = () => {
    setLeaveType("annual");
    setStartDate("");
    setEndDate("");
    setReason("");
    setTeamMemberId("");
  };

  const openCreate = () => {
    resetForm();
    const today = new Date().toISOString().split("T")[0];
    setStartDate(today);
    setEndDate(today);
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
      await leaveRequestApi.create({
        leaveType,
        startDate,
        endDate,
        reason: reason.trim() || undefined,
        teamMemberId: teamMemberId || undefined,
      });
      toast({
        title: "Leave requested",
        description:
          mode === "workspace" && !isWorkspaceAdmin
            ? "Your manager will review this request."
            : "Leave request saved.",
      });
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
    if (!rejectTarget) return;
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
      <div className="mb-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-lg border bg-white px-4 py-3">
          <p className="text-xs text-gray-500">Pending review</p>
          <p className="text-lg font-semibold text-gray-900">{pendingTeamCount}</p>
        </div>
        <div className="rounded-lg border bg-white px-4 py-3 sm:col-span-2">
          <p className="text-xs text-gray-500">Leave requests</p>
          <p className="text-sm text-gray-700 mt-1">
            Team members submit leave here. Workspace owners and admins approve or reject requests before time off is confirmed.
          </p>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        {isWorkspaceAdmin ? (
          <>
            <Button size="sm" variant={view === "mine" ? "default" : "outline"} onClick={() => setView("mine")}>
              My requests
            </Button>
            <Button size="sm" variant={view === "team" ? "default" : "outline"} onClick={() => setView("team")}>
              Team requests
            </Button>
          </>
        ) : null}
        {(["all", "pending", "approved", "rejected"] as const).map((value) => (
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
            No leave requests yet. Click &quot;Request leave&quot; to submit time off.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse">
              <thead>
                <tr>
                  {isWorkspaceAdmin && view === "team" ? (
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
                  const userId = localStorage.getItem("profit-pilot-user-id");
                  const isOwn = userId && String(record.requesterUserId || "") === userId;

                  return (
                    <tr key={id} className="transition-colors hover:bg-gray-50/80">
                      {isWorkspaceAdmin && view === "team" ? (
                        <td className={cn(FINANCE_TD_CLASS, "font-medium text-gray-900")}>
                          {record.requesterName}
                        </td>
                      ) : null}
                      <td className={cn(FINANCE_TD_CLASS, "text-gray-700")}>
                        {leaveTypeLabel(record.leaveType)}
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
                          <div className="text-xs text-red-600 mt-1 max-w-[180px]">{record.rejectionNote}</div>
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
                          {isWorkspaceAdmin && isPending && view === "team" ? (
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
                            </>
                          ) : null}
                          {isPending && isOwn ? (
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
          </div>
        )}
      </FinanceTableShell>

      <Dialog open={open} onOpenChange={(next) => { if (!next) resetForm(); setOpen(next); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Request leave</DialogTitle>
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { resetForm(); setOpen(false); }}>Cancel</Button>
            <Button onClick={() => void handleSave()} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="mr-1 h-4 w-4" />Submit</>}
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
    </>
  );
}
