import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { approvalApi } from "@/lib/api";
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
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
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
} from "@/components/finance/financeTable";
import { approvalStatusClass, approvalStatusLabel } from "@/lib/approvalWorkflow";

function dispatchFinanceRefresh() {
  window.dispatchEvent(new CustomEvent("approvals-should-refresh"));
  window.dispatchEvent(new CustomEvent("expenses-should-refresh"));
  window.dispatchEvent(new CustomEvent("finance-should-refresh"));
  window.dispatchEvent(new CustomEvent("profit-pilot-data-changed"));
}

export function ApprovalsTab() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { mode, isWorkspaceAdmin } = useWorkspace();
  const [items, setItems] = useState<ApprovalQueueItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filter, setFilter] = useState<"pending_approval" | "rejected" | "all">("pending_approval");
  const [rejectTarget, setRejectTarget] = useState<ApprovalQueueItem | null>(null);
  const [rejectionNote, setRejectionNote] = useState("");
  const [actingId, setActingId] = useState<string | null>(null);

  const loadQueue = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const response = await approvalApi.getQueue(filter === "all" ? undefined : { status: filter });
      setItems((response.data || []) as ApprovalQueueItem[]);
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

  const pendingCount = useMemo(
    () => items.filter((item) => item.approvalStatus === "pending_approval").length,
    [items],
  );

  const handleApprove = async (item: ApprovalQueueItem) => {
    const key = `${item.entityType}-${item.id}-approve`;
    setActingId(key);
    try {
      await approvalApi.approve(item.entityType, item.id);
      toast({ title: "Approved", description: `${item.title} was approved.` });
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
      await approvalApi.reject(rejectTarget.entityType, rejectTarget.id, {
        rejectionNote: rejectionNote.trim() || undefined,
      });
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

  if (mode !== "workspace") {
    return (
      <div className="rounded-lg border bg-white px-6 py-16 text-center text-sm text-gray-500">
        Approval workflows are enabled in workspace mode. Switch to a workspace to review team submissions.
      </div>
    );
  }

  return (
    <>
      <div className="mb-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-lg border bg-white px-4 py-3">
          <p className="text-xs text-gray-500">Pending your review</p>
          <p className="text-lg font-semibold text-gray-900">{pendingCount}</p>
        </div>
        <div className="rounded-lg border bg-white px-4 py-3 sm:col-span-2">
          <p className="text-xs text-gray-500">How it works</p>
          <p className="text-sm text-gray-700 mt-1">
            Workspace members submit expenses, bills, and payroll for review. Owners and admins approve or reject before records affect reports and payments.
          </p>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        {(["pending_approval", "rejected", "all"] as const).map((value) => (
          <Button
            key={value}
            size="sm"
            variant={filter === value ? "default" : "outline"}
            onClick={() => setFilter(value)}
          >
            {value === "pending_approval" ? "Pending" : value === "rejected" ? "Rejected" : "All"}
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
          <div className="overflow-x-auto">
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
                  const isPending = item.approvalStatus === "pending_approval";
                  const dateValue = item.date || item.dueDate || item.paymentDate;
                  return (
                    <tr key={rowKey} className="transition-colors hover:bg-gray-50/80">
                      <td className={cn(FINANCE_TD_CLASS, "tabular-nums text-gray-700")}>
                        {item.submittedAt ? formatFinanceTableDate(item.submittedAt) : "—"}
                      </td>
                      <td className={cn(FINANCE_TD_CLASS, "text-gray-600")}>{entityTypeLabel(item.entityType)}</td>
                      <td className={cn(FINANCE_TD_CLASS, "font-medium text-gray-900 max-w-[220px]")}>
                        <div className="truncate">{item.title}</div>
                        {dateValue ? (
                          <div className="text-xs text-gray-500 mt-0.5">{formatFinanceTableDate(dateValue)}</div>
                        ) : null}
                        {item.rejectionNote ? (
                          <div className="text-xs text-red-600 mt-1 line-clamp-2">{item.rejectionNote}</div>
                        ) : null}
                      </td>
                      <td className={cn(FINANCE_TD_CLASS, "tabular-nums font-medium")}>
                        {formatCurrency(item.amount)}
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
                      <td className={FINANCE_TD_CLASS}>
                        <div className="flex flex-wrap items-center gap-1">
                          <Button asChild size="sm" variant="ghost" className="h-7 px-2 text-xs">
                            <Link to={financePathForEntity(item.entityType)}>View</Link>
                          </Button>
                          {isWorkspaceAdmin && isPending ? (
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
                                Approve
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
                                Reject
                              </Button>
                            </>
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
    </>
  );
}
