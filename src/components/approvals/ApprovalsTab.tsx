import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { approvalApi, teamReportApi } from "@/lib/api";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, CheckCircle2, XCircle, MessageSquareWarning } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/currency";
import {
  entityTypeLabel,
  financePathForEntity,
  type ApprovalQueueItem,
} from "@/lib/approvalWorkflow";
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
import { approvalStatusClass, approvalStatusLabel } from "@/lib/approvalWorkflow";

function dispatchFinanceRefresh() {
  window.dispatchEvent(new CustomEvent("approvals-should-refresh"));
  window.dispatchEvent(new CustomEvent("expenses-should-refresh"));
  window.dispatchEvent(new CustomEvent("finance-should-refresh"));
  window.dispatchEvent(new CustomEvent("profit-pilot-data-changed"));
  window.dispatchEvent(new CustomEvent("notifications-should-refresh"));
}

export function ApprovalsTab() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { mode, isWorkspaceAdmin } = useWorkspace();
  const [items, setItems] = useState<ApprovalQueueItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filter, setFilter] = useState<
    "pending_approval" | "changes_requested" | "rejected" | "all"
  >("pending_approval");
  const [rejectTarget, setRejectTarget] = useState<ApprovalQueueItem | null>(null);
  const [changesTarget, setChangesTarget] = useState<ApprovalQueueItem | null>(null);
  const [rejectionNote, setRejectionNote] = useState("");
  const [changeNote, setChangeNote] = useState("");
  const [actingId, setActingId] = useState<string | null>(null);

  const loadQueue = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const response = await approvalApi.getQueue(filter === "all" ? undefined : { status: filter });
      const queue = ((response.data || []) as ApprovalQueueItem[]).filter((item) => {
        // Team reports go only to people listed as "Reporting to".
        if (item.entityType === "team_report") return Boolean(item.canApprove);
        return true;
      });
      setItems(queue);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Could not load approvals.";
      toast({ title: t("error"), description: message, variant: "destructive" });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [filter, t, toast]);

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  useEffect(() => {
    const onRefresh = () => void loadQueue(true);
    window.addEventListener("approvals-should-refresh", onRefresh);
    return () => window.removeEventListener("approvals-should-refresh", onRefresh);
  }, [loadQueue]);

  const handleApprove = async (item: ApprovalQueueItem) => {
    const key = `${item.entityType}-${item.id}-approve`;
    setActingId(key);
    try {
      if (item.entityType === "team_report") {
        await teamReportApi.review(item.id);
        toast({ title: "Reviewed", description: `${item.title} was marked as reviewed.` });
      } else {
        await approvalApi.approve(item.entityType, item.id);
        toast({ title: "Approved", description: `${item.title} was approved.` });
      }
      dispatchFinanceRefresh();
      await loadQueue(true);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Could not approve record.";
      toast({ title: t("error"), description: message, variant: "destructive" });
    } finally {
      setActingId(null);
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectTarget) return;
    const key = `${rejectTarget.entityType}-${rejectTarget.id}-reject`;
    setActingId(key);
    try {
      if (rejectTarget.entityType === "team_report") {
        await teamReportApi.reject(rejectTarget.id, {
          reviewNote: rejectionNote.trim() || undefined,
        });
      } else {
        await approvalApi.reject(rejectTarget.entityType, rejectTarget.id, {
          rejectionNote: rejectionNote.trim() || undefined,
        });
      }
      toast({ title: "Rejected", description: `${rejectTarget.title} was rejected.` });
      setRejectTarget(null);
      setRejectionNote("");
      dispatchFinanceRefresh();
      await loadQueue(true);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Could not reject record.";
      toast({ title: t("error"), description: message, variant: "destructive" });
    } finally {
      setActingId(null);
    }
  };

  const handleRequestChangesConfirm = async () => {
    if (!changesTarget) return;
    const note = changeNote.trim();
    if (!note) {
      toast({
        title: "Note required",
        description: "Explain what the submitter should change.",
        variant: "destructive",
      });
      return;
    }
    const key = `${changesTarget.entityType}-${changesTarget.id}-changes`;
    setActingId(key);
    try {
      if (changesTarget.entityType === "team_report") {
        await teamReportApi.requestChanges(changesTarget.id, { note });
      } else {
        await approvalApi.requestChanges(changesTarget.entityType, changesTarget.id, { note });
      }
      toast({
        title: "Changes requested",
        description: `${changesTarget.title} was returned to the submitter with your note.`,
      });
      setChangesTarget(null);
      setChangeNote("");
      dispatchFinanceRefresh();
      await loadQueue(true);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Could not request changes.";
      toast({ title: t("error"), description: message, variant: "destructive" });
    } finally {
      setActingId(null);
    }
  };

  if (mode !== "workspace") {
    return (
      <div className="rounded-lg border bg-white px-6 py-16 text-center text-sm text-gray-500">
        Approval workflows are enabled in workspace mode. Switch to a workspace to review team submissions.
      </div>
    );
  }

  const renderActionButtons = (item: ApprovalQueueItem, compact = false) => {
    const rowKey = `${item.entityType}-${item.id}`;
    const isPending = item.approvalStatus === "pending_approval";
    const canActOnItem =
      item.entityType === "team_report"
        ? Boolean(item.canApprove)
        : Boolean(isWorkspaceAdmin || item.canApprove);
    return (
      <div className={cn("flex flex-wrap items-center gap-1", compact && "justify-end")}>
        <Button asChild size="sm" variant="ghost" className="h-7 px-2 text-xs">
          <Link to={financePathForEntity(item.entityType)}>View</Link>
        </Button>
        {canActOnItem && isPending ? (
          <>
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs text-emerald-700 border-emerald-200"
              disabled={actingId !== null}
              onClick={() => void handleApprove(item)}
            >
              {actingId === `${rowKey}-approve` ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
              )}
              {compact ? null : "Approve"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs text-orange-700 border-orange-200"
              disabled={actingId !== null}
              onClick={() => {
                setChangesTarget(item);
                setChangeNote("");
              }}
            >
              <MessageSquareWarning className="h-3.5 w-3.5 mr-1" />
              {compact ? null : "Request changes"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs text-red-700 border-red-200"
              disabled={actingId !== null}
              onClick={() => {
                setRejectTarget(item);
                setRejectionNote("");
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
    <>
      <div className="mb-3 flex flex-wrap gap-2">
        {(["pending_approval", "changes_requested", "rejected", "all"] as const).map((value) => (
          <Button
            key={value}
            size="sm"
            variant={filter === value ? "default" : "outline"}
            onClick={() => setFilter(value)}
          >
            {value === "pending_approval"
              ? "Pending"
              : value === "changes_requested"
                ? "Changes requested"
                : value === "rejected"
                  ? "Rejected"
                  : "All"}
          </Button>
        ))}
      </div>

      <FinanceTableShell
        title="Approvals"
        onRefresh={() => {
          setIsRefreshing(true);
          void loadQueue(true);
        }}
        isRefreshing={isRefreshing}
        showAdd={false}
      >
        {isLoading ? (
          <FinanceTableLoading />
        ) : items.length === 0 ? (
          <div className="px-4 py-16 text-center text-sm text-gray-500">
            {filter === "pending_approval"
              ? "No items waiting for approval."
              : "No approval records match this filter."}
          </div>
        ) : (
          <>
          <DesktopDataTable>
            <table className="w-full min-w-[960px] border-collapse">
              <thead>
                <tr>
                  <th className={FINANCE_TH_CLASS}>Submitted</th>
                  <th className={FINANCE_TH_CLASS}>Type</th>
                  <th className={FINANCE_TH_CLASS}>Title</th>
                  <th className={FINANCE_TH_CLASS}>Amount</th>
                  <th className={FINANCE_TH_CLASS}>Status</th>
                  <th className={cn(FINANCE_TH_CLASS, "hidden md:table-cell")}>Submitted by</th>
                  <th className={FINANCE_TH_CLASS}>Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {items.map((item) => {
                  const rowKey = `${item.entityType}-${item.id}`;
                  const dateValue = item.date || item.dueDate || item.paymentDate;
                  const noteClass =
                    item.approvalStatus === "changes_requested" ? "text-orange-700" : "text-red-600";
                  return (
                    <tr key={rowKey} className="transition-colors hover:bg-gray-50/80">
                      <td className={cn(FINANCE_TD_CLASS, "tabular-nums text-gray-700")}>
                        {item.submittedAt ? formatFinanceTableDate(item.submittedAt) : "—"}
                      </td>
                      <td className={cn(FINANCE_TD_CLASS, "text-gray-600")}>{entityTypeLabel(item.entityType)}</td>
                      <td className={cn(FINANCE_TD_CLASS, "font-medium text-gray-900 max-w-[220px]")}>
                        <div className="truncate">{item.title}</div>
                        {item.entityType === "team_report" ? (
                          <div className="mt-0.5 text-xs text-gray-500">
                            {item.reportType
                              ? `${item.reportType.charAt(0).toUpperCase()}${item.reportType.slice(1)} report`
                              : "Team report"}
                            {item.reportTo?.length ? ` · To ${item.reportTo.join(", ")}` : ""}
                          </div>
                        ) : null}
                        {dateValue ? (
                          <div className="text-xs text-gray-500 mt-0.5">{formatFinanceTableDate(dateValue)}</div>
                        ) : null}
                        {item.rejectionNote ? (
                          <div className={cn("text-xs mt-1 line-clamp-2", noteClass)}>{item.rejectionNote}</div>
                        ) : null}
                      </td>
                      <td className={cn(FINANCE_TD_CLASS, "tabular-nums font-medium")}>
                        {item.amount == null ? "—" : formatCurrency(item.amount)}
                      </td>
                      <td className={FINANCE_TD_CLASS}>
                        <span
                          className={cn(
                            "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                            approvalStatusClass(item.approvalStatus),
                          )}
                        >
                          {approvalStatusLabel(item.approvalStatus)}
                        </span>
                      </td>
                      <td className={cn(FINANCE_TD_CLASS, "hidden md:table-cell text-gray-600")}>
                        {item.submittedByName || "—"}
                      </td>
                      <td className={FINANCE_TD_CLASS}>{renderActionButtons(item)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </DesktopDataTable>

          <MobileDataList>
            {items.map((item, index) => {
              const rowKey = `${item.entityType}-${item.id}`;
              const dateValue = item.date || item.dueDate || item.paymentDate;
              return (
                <FinanceMobileRow
                  key={rowKey}
                  index={index}
                  title={<span className="truncate">{item.title}</span>}
                  subtitle={entityTypeLabel(item.entityType)}
                  meta={
                    <span className="inline-flex flex-wrap items-center gap-1.5">
                      {item.submittedAt ? formatFinanceTableDate(item.submittedAt) : "—"}
                      {item.submittedByName ? <span>· {item.submittedByName}</span> : null}
                      <span
                        className={cn(
                          "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                          approvalStatusClass(item.approvalStatus),
                        )}
                      >
                        {approvalStatusLabel(item.approvalStatus)}
                      </span>
                      {dateValue ? (
                        <span className="normal-case">{formatFinanceTableDate(dateValue)}</span>
                      ) : null}
                      {item.rejectionNote ? (
                        <span
                          className={cn(
                            "normal-case line-clamp-1",
                            item.approvalStatus === "changes_requested" ? "text-orange-700" : "text-red-600",
                          )}
                        >
                          {item.rejectionNote}
                        </span>
                      ) : null}
                    </span>
                  }
                  amount={item.amount == null ? "—" : formatCurrency(item.amount)}
                  actions={renderActionButtons(item, true)}
                />
              );
            })}
          </MobileDataList>
          </>
        )}
      </FinanceTableShell>

      <Dialog open={Boolean(rejectTarget)} onOpenChange={(open) => { if (!open) setRejectTarget(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reject submission</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            {rejectTarget ? `Reject "${rejectTarget.title}"? The submitter can edit and resubmit.` : ""}
          </p>
          <div>
            <Label htmlFor="rejection-note">Reason (optional)</Label>
            <Textarea
              id="rejection-note"
              value={rejectionNote}
              onChange={(e) => setRejectionNote(e.target.value)}
              rows={3}
              placeholder="Explain why this was rejected..."
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

      <Dialog open={Boolean(changesTarget)} onOpenChange={(open) => { if (!open) setChangesTarget(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Request changes</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            {changesTarget
              ? `Ask the submitter to revise "${changesTarget.title}". They will be notified and can edit, then resubmit.`
              : ""}
          </p>
          <div>
            <Label htmlFor="change-note">What should change?</Label>
            <Textarea
              id="change-note"
              value={changeNote}
              onChange={(e) => setChangeNote(e.target.value)}
              rows={3}
              placeholder="Describe the required changes..."
              required
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChangesTarget(null)}>Cancel</Button>
            <Button disabled={actingId !== null || !changeNote.trim()} onClick={() => void handleRequestChangesConfirm()}>
              {actingId ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
