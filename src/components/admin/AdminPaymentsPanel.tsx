import { useCallback, useEffect, useState } from "react";
import { adminApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  CreditCard,
  Loader2,
  RefreshCw,
  Search,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

type PaymentStats = {
  pending: number;
  successful: number;
  failed: number;
  withIssues: number;
  stuckCount: number;
  recent24h: number;
  successfulAmount: number;
  days: number;
};

type SyncIssue = {
  code: string;
  message?: string;
  at?: string;
};

type AdminPaymentRow = {
  _id: string;
  referenceId: string;
  userId: string;
  user?: {
    _id: string;
    name: string;
    email?: string;
    phone?: string;
    businessName?: string;
  } | null;
  amount: number;
  currency: string;
  msisdn: string;
  status: string;
  providerStatus?: string;
  financialTransactionId?: string;
  createdAt: string;
  paidAt?: string | null;
  lastSyncAt?: string | null;
  syncIssues?: SyncIssue[];
  sync?: { latestIssue?: SyncIssue | null };
};

function statusBadge(status: string) {
  const normalized = status.toUpperCase();
  if (normalized === "SUCCESSFUL") {
    return (
      <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200">
        <CheckCircle2 className="h-3 w-3 mr-1" />
        Successful
      </Badge>
    );
  }
  if (normalized === "FAILED") {
    return (
      <Badge variant="destructive" className="bg-red-100 text-red-800 hover:bg-red-100 border-red-200">
        <XCircle className="h-3 w-3 mr-1" />
        Failed
      </Badge>
    );
  }
  return (
    <Badge className="bg-amber-100 text-amber-900 hover:bg-amber-100 border-amber-200">
      <Clock className="h-3 w-3 mr-1" />
      Pending
    </Badge>
  );
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMoney(amount: number, currency = "RWF") {
  return `${Number(amount || 0).toLocaleString()} ${currency}`;
}

export function AdminPaymentsPanel() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [payments, setPayments] = useState<AdminPaymentRow[]>([]);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState("all");
  const [issuesOnly, setIssuesOnly] = useState(false);
  const [days, setDays] = useState("30");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [resyncingId, setResyncingId] = useState<string | null>(null);
  const [reconciling, setReconciling] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailPayment, setDetailPayment] = useState<AdminPaymentRow | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailRelated, setDetailRelated] = useState<AdminPaymentRow[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, listRes] = await Promise.all([
        adminApi.getSubscriptionPaymentStats(Number(days)),
        adminApi.listSubscriptionPayments({
          days: Number(days),
          status: statusFilter,
          hasIssues: issuesOnly,
          search: search || undefined,
          limit: 50,
        }),
      ]);
      setStats((statsRes.data as PaymentStats) || null);
      const listData = listRes.data as { payments: AdminPaymentRow[]; total: number };
      setPayments(listData.payments || []);
      setTotal(listData.total || 0);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to load payments";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [days, issuesOnly, search, statusFilter, toast]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const openDetail = async (row: AdminPaymentRow) => {
    setDetailPayment(row);
    setDetailOpen(true);
    setDetailLoading(true);
    try {
      const res = await adminApi.getSubscriptionPayment(row._id);
      const data = res.data as {
        payment: AdminPaymentRow;
        relatedPayments?: AdminPaymentRow[];
      };
      setDetailPayment(data.payment);
      setDetailRelated(data.relatedPayments || []);
    } catch {
      setDetailRelated([]);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleResync = async (paymentId: string) => {
    setResyncingId(paymentId);
    try {
      const res = await adminApi.resyncSubscriptionPayment(paymentId);
      toast({
        title: "Re-synced",
        description: (res as { message?: string }).message || "Payment checked with Paypack.",
      });
      if (detailOpen && detailPayment?._id === paymentId) {
        const data = res.data as { payment: AdminPaymentRow };
        setDetailPayment(data.payment);
      }
      await loadData();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Re-sync failed";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setResyncingId(null);
    }
  };

  const handleReconcileAll = async () => {
    setReconciling(true);
    try {
      const res = await adminApi.reconcileStuckSubscriptionPayments();
      toast({
        title: "Reconciliation complete",
        description: (res as { message?: string }).message || "Stuck payments checked.",
      });
      await loadData();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Reconciliation failed";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setReconciling(false);
    }
  };

  const handleMarkUserPaid = async (userId: string) => {
    try {
      await adminApi.markUserPaid(userId);
      toast({ title: "Marked paid", description: "User subscription activated manually." });
      await loadData();
      setDetailOpen(false);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Could not mark paid";
      toast({ title: "Error", description: message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Subscription payments
          </h2>
          <p className="text-sm text-muted-foreground">
            Monitor MoMo payments, sync issues, and stuck transactions.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => void loadData()} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4 mr-1", loading && "animate-spin")} />
            Refresh
          </Button>
          <Button size="sm" onClick={() => void handleReconcileAll()} disabled={reconciling}>
            {reconciling ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
            Reconcile stuck
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {loading && !stats ? (
          Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24" />)
        ) : (
          <>
            <Card className="lg:bg-white bg-white/80">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">Pending</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold text-amber-700">{stats?.pending ?? 0}</div>
                <p className="text-xs text-muted-foreground">{stats?.stuckCount ?? 0} stuck (&gt;2 min)</p>
              </CardContent>
            </Card>
            <Card className="lg:bg-white bg-white/80">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">Failed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold text-red-700">{stats?.failed ?? 0}</div>
                <p className="text-xs text-muted-foreground">Last {stats?.days ?? 30} days</p>
              </CardContent>
            </Card>
            <Card className="lg:bg-white bg-white/80">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">Successful</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold text-green-700">{stats?.successful ?? 0}</div>
                <p className="text-xs text-muted-foreground">
                  {formatMoney(stats?.successfulAmount ?? 0)}
                </p>
              </CardContent>
            </Card>
            <Card className="lg:bg-white bg-white/80">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">With issues</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold text-orange-700">{stats?.withIssues ?? 0}</div>
                <p className="text-xs text-muted-foreground">Logged sync problems</p>
              </CardContent>
            </Card>
            <Card className="lg:bg-white bg-white/80 col-span-2 lg:col-span-1">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">Last 24h</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">{stats?.recent24h ?? 0}</div>
                <p className="text-xs text-muted-foreground">New attempts</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <Card className="lg:bg-white bg-white/80">
        <CardHeader>
          <CardTitle className="font-normal">Payment attempts</CardTitle>
          <CardDescription>
            {total} record{total === 1 ? "" : "s"} matching filters
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col lg:flex-row gap-3">
            <form
              className="flex flex-1 gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                setSearch(searchInput.trim());
              }}
            >
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search user, email, phone, ref…"
                  className="pl-9"
                />
              </div>
              <Button type="submit" variant="secondary">
                Search
              </Button>
            </form>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full lg:w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="FAILED">Failed</SelectItem>
                <SelectItem value="SUCCESSFUL">Successful</SelectItem>
              </SelectContent>
            </Select>
            <Select value={days} onValueChange={setDays}>
              <SelectTrigger className="w-full lg:w-[120px]">
                <SelectValue placeholder="Period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 days</SelectItem>
                <SelectItem value="30">30 days</SelectItem>
                <SelectItem value="90">90 days</SelectItem>
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant={issuesOnly ? "default" : "outline"}
              onClick={() => setIssuesOnly((v) => !v)}
              className="shrink-0"
            >
              <AlertTriangle className="h-4 w-4 mr-1" />
              Issues only
            </Button>
          </div>

          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : payments.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No payments found.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr className="text-left">
                    <th className="p-3 font-medium">User</th>
                    <th className="p-3 font-medium">MoMo</th>
                    <th className="p-3 font-medium">Amount</th>
                    <th className="p-3 font-medium">Status</th>
                    <th className="p-3 font-medium">Created</th>
                    <th className="p-3 font-medium">Issue</th>
                    <th className="p-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((row) => {
                    const latestIssue =
                      row.sync?.latestIssue ||
                      (row.syncIssues?.length ? row.syncIssues[row.syncIssues.length - 1] : null);
                    return (
                      <tr key={row._id} className="border-t hover:bg-muted/30">
                        <td className="p-3">
                          <button
                            type="button"
                            className="text-left hover:underline"
                            onClick={() => void openDetail(row)}
                          >
                            <div className="font-medium">{row.user?.name || "Unknown"}</div>
                            <div className="text-xs text-muted-foreground truncate max-w-[180px]">
                              {row.user?.email || row.userId}
                            </div>
                          </button>
                        </td>
                        <td className="p-3 tabular-nums">{row.msisdn}</td>
                        <td className="p-3 tabular-nums">{formatMoney(row.amount, row.currency)}</td>
                        <td className="p-3">{statusBadge(row.status)}</td>
                        <td className="p-3 text-muted-foreground whitespace-nowrap">
                          {formatDateTime(row.createdAt)}
                        </td>
                        <td className="p-3">
                          {latestIssue ? (
                            <span
                              className="text-xs text-orange-800 bg-orange-50 border border-orange-200 rounded px-2 py-0.5 inline-block max-w-[160px] truncate"
                              title={latestIssue.message || latestIssue.code}
                            >
                              {latestIssue.code}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={resyncingId === row._id}
                            onClick={() => void handleResync(row._id)}
                          >
                            {resyncingId === row._id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <RefreshCw className="h-4 w-4" />
                            )}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Payment detail</DialogTitle>
            <DialogDescription>
              {detailPayment?.referenceId ? `Ref: ${detailPayment.referenceId}` : ""}
            </DialogDescription>
          </DialogHeader>

          {detailLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : detailPayment ? (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-muted-foreground text-xs">User</p>
                  <p className="font-medium">{detailPayment.user?.name}</p>
                  <p className="text-xs text-muted-foreground">{detailPayment.user?.email}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Status</p>
                  <div className="mt-1">{statusBadge(detailPayment.status)}</div>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">MoMo number</p>
                  <p className="font-medium tabular-nums">{detailPayment.msisdn}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Amount</p>
                  <p className="font-medium">{formatMoney(detailPayment.amount, detailPayment.currency)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Created</p>
                  <p>{formatDateTime(detailPayment.createdAt)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Last sync</p>
                  <p>{formatDateTime(detailPayment.lastSyncAt)}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground text-xs">Provider status</p>
                  <p>{detailPayment.providerStatus || "—"}</p>
                </div>
                {detailPayment.financialTransactionId ? (
                  <div className="col-span-2">
                    <p className="text-muted-foreground text-xs">Financial transaction ID</p>
                    <p className="font-mono text-xs break-all">{detailPayment.financialTransactionId}</p>
                  </div>
                ) : null}
              </div>

              {(detailPayment.syncIssues?.length ?? 0) > 0 ? (
                <div>
                  <p className="font-medium mb-2 flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                    Sync issues
                  </p>
                  <ul className="space-y-2 max-h-40 overflow-y-auto rounded border p-2 bg-muted/30">
                    {detailPayment.syncIssues!.map((issue, i) => (
                      <li key={`${issue.code}-${i}`} className="text-xs border-b last:border-0 pb-2">
                        <span className="font-semibold text-orange-800">{issue.code}</span>
                        {issue.message ? <span className="text-muted-foreground"> — {issue.message}</span> : null}
                        <div className="text-muted-foreground">{formatDateTime(issue.at)}</div>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {detailRelated.length > 0 ? (
                <div>
                  <p className="font-medium mb-2">Other attempts (same user)</p>
                  <ul className="text-xs space-y-1 text-muted-foreground">
                    {detailRelated.map((p) => (
                      <li key={p._id}>
                        {formatDateTime(p.createdAt)} — {p.status} — {formatMoney(p.amount, p.currency)}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {detailPayment && detailPayment.status !== "SUCCESSFUL" ? (
              <Button
                variant="outline"
                onClick={() => void handleMarkUserPaid(detailPayment.userId)}
              >
                Mark user paid (manual)
              </Button>
            ) : null}
            {detailPayment ? (
              <Button
                onClick={() => void handleResync(detailPayment._id)}
                disabled={resyncingId === detailPayment._id}
              >
                {resyncingId === detailPayment._id ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-1" />
                )}
                Re-sync with Paypack
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
