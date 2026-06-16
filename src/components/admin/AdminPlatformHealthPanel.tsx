import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Database,
  RefreshCw,
  Server,
  XCircle,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ADMIN_CARD_CLASS, ADMIN_TITLE_CLASS } from "@/components/admin/adminStyles";

export type PlatformCheckStatus = "ok" | "warning" | "error";

export interface PlatformCheck {
  id: string;
  label: string;
  status: PlatformCheckStatus;
  detail: string;
}

export interface SystemHealthData {
  database: string;
  timestamp: string;
  uptime: number;
  serverStartTime?: string;
  memory: { used: number; total: number };
  platform?: {
    status: "healthy" | "degraded" | "critical";
    environment: string;
    nodeVersion: string;
    checks: PlatformCheck[];
    payments: {
      failed24h: number;
      withSyncIssues: number;
      stuckPending: number;
    };
    api: {
      totalErrors24h: number;
      clientErrors24h: number;
      serverErrors24h: number;
      failingEndpoints: number;
      slowEndpoints: number;
    };
  };
}

export interface ApiRequestError {
  id: string;
  method: string;
  path: string;
  endpoint: string;
  timestamp: string;
  statusCode: number;
  responseTime: number;
}

export interface EndpointHealthRow {
  endpoint: string;
  count: number;
  avgResponseTime: number;
  errors: number;
  errorRate: number;
  isSlow: boolean;
  status: "healthy" | "degraded" | "critical";
}

export interface ApiStatsData {
  totalRequests: number;
  recentRequests: number;
  dailyRequests: number;
  avgResponseTime: number;
  statusCodeDistribution: Record<string, number>;
  errorSummary?: {
    totalErrors24h: number;
    clientErrors24h: number;
    serverErrors24h: number;
    failingEndpoints: number;
    slowEndpoints: number;
  };
  recentErrors?: ApiRequestError[];
  endpointHealth?: EndpointHealthRow[];
}

import { ADMIN_ADMIN_CARD_CLASS, ADMIN_PANEL_CLASS, ADMIN_ADMIN_TITLE_CLASS } from "@/components/admin/adminStyles";

function formatUptime(seconds: number) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  } catch {
    return iso;
  }
}

function statusBadge(status: PlatformCheckStatus) {
  if (status === "ok") {
    return (
      <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700 gap-1">
        <CheckCircle2 className="h-3 w-3" />
        OK
      </Badge>
    );
  }
  if (status === "warning") {
    return (
      <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700 gap-1">
        <AlertTriangle className="h-3 w-3" />
        Warning
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700 gap-1">
      <XCircle className="h-3 w-3" />
      Error
    </Badge>
  );
}

function endpointStatusBadge(status: EndpointHealthRow["status"]) {
  if (status === "critical") {
    return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Critical</Badge>;
  }
  if (status === "degraded") {
    return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">Degraded</Badge>;
  }
  return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Healthy</Badge>;
}

function httpStatusClass(code: number) {
  if (code >= 500) return "text-red-600 font-medium";
  if (code >= 400) return "text-amber-600 font-medium";
  return "text-muted-foreground";
}

interface AdminPlatformHealthPanelProps {
  health: SystemHealthData | null;
  apiStats: ApiStatsData | null;
  onRefresh?: () => void;
  refreshing?: boolean;
}

export function AdminPlatformHealthPanel({
  health,
  apiStats,
  onRefresh,
  refreshing = false,
}: AdminPlatformHealthPanelProps) {
  const platform = health?.platform;
  const errorSummary = apiStats?.errorSummary ?? platform?.api;
  const recentErrors = apiStats?.recentErrors ?? [];
  const endpointHealth = apiStats?.endpointHealth ?? [];
  const platformStatus = platform?.status ?? (health?.database === "connected" ? "healthy" : "critical");

  const statusConfig = {
    healthy: {
      label: "All systems operational",
      description: "No critical issues detected across API, database, or payments.",
      className: "border-green-200 bg-green-50",
      icon: CheckCircle2,
      iconClass: "text-green-600",
    },
    degraded: {
      label: "Degraded performance",
      description: "Some endpoints or services need attention before users report problems.",
      className: "border-amber-200 bg-amber-50",
      icon: AlertTriangle,
      iconClass: "text-amber-600",
    },
    critical: {
      label: "Critical issues detected",
      description: "Server errors or database problems require immediate action.",
      className: "border-red-200 bg-red-50",
      icon: XCircle,
      iconClass: "text-red-600",
    },
  }[platformStatus];

  const StatusIcon = statusConfig.icon;

  const statusCodes = apiStats?.statusCodeDistribution
    ? Object.entries(apiStats.statusCodeDistribution).sort(([a], [b]) => Number(a) - Number(b))
    : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 px-1">
        <div>
          <h2 className="text-base font-normal tracking-tight text-gray-800">System health</h2>
          <p className="text-sm text-muted-foreground">
            Monitor failures, slow endpoints, and platform issues in real time
          </p>
        </div>
        {onRefresh && (
          <Button variant="outline" size="sm" onClick={onRefresh} disabled={refreshing} className="gap-2">
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            Refresh
          </Button>
        )}
      </div>

      <Card className={cn(ADMIN_CARD_CLASS, statusConfig.className)}>
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <StatusIcon className={cn("h-6 w-6 mt-0.5 shrink-0", statusConfig.iconClass)} />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900">{statusConfig.label}</p>
              <p className="text-sm text-muted-foreground mt-0.5">{statusConfig.description}</p>
              {health && (
                <p className="text-xs text-muted-foreground mt-2">
                  Last checked {formatTime(health.timestamp)} · Uptime {formatUptime(health.uptime)}
                  {platform?.environment ? ` · ${platform.environment}` : ""}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className={ADMIN_CARD_CLASS}>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className={cn("text-xs text-muted-foreground", ADMIN_TITLE_CLASS)}>Errors (24h)</CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className={cn("text-2xl", (errorSummary?.totalErrors24h ?? 0) > 0 && "text-amber-600")}>
              {errorSummary?.totalErrors24h ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">{errorSummary?.serverErrors24h ?? 0} server (5xx)</p>
          </CardContent>
        </Card>

        <Card className={ADMIN_CARD_CLASS}>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className={cn("text-xs text-muted-foreground", ADMIN_TITLE_CLASS)}>Failing endpoints</CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className={cn("text-2xl", (errorSummary?.failingEndpoints ?? 0) > 0 && "text-red-600")}>
              {errorSummary?.failingEndpoints ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">{errorSummary?.slowEndpoints ?? 0} slow (&gt;2s)</p>
          </CardContent>
        </Card>

        <Card className={ADMIN_CARD_CLASS}>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className={cn("text-xs text-muted-foreground flex items-center gap-1", ADMIN_TITLE_CLASS)}>
              <Database className="h-3 w-3" />
              Database
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  health?.database === "connected" ? "bg-green-500" : "bg-red-500"
                )}
              />
              <span className="text-sm capitalize">{health?.database ?? "Unknown"}</span>
            </div>
          </CardContent>
        </Card>

        <Card className={ADMIN_CARD_CLASS}>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className={cn("text-xs text-muted-foreground flex items-center gap-1", ADMIN_TITLE_CLASS)}>
              <Zap className="h-3 w-3" />
              API (1h)
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="text-2xl">{apiStats?.recentRequests ?? 0}</div>
            <p className="text-xs text-muted-foreground">{apiStats?.avgResponseTime ?? 0}ms avg</p>
          </CardContent>
        </Card>

        <Card className={ADMIN_CARD_CLASS}>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className={cn("text-xs text-muted-foreground flex items-center gap-1", ADMIN_TITLE_CLASS)}>
              <Server className="h-3 w-3" />
              Memory
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="text-2xl">{health?.memory.used ?? 0} MB</div>
            <p className="text-xs text-muted-foreground">
              {health ? Math.round((health.memory.used / health.memory.total) * 100) : 0}% used
            </p>
          </CardContent>
        </Card>

        <Card className={ADMIN_CARD_CLASS}>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className={cn("text-xs text-muted-foreground flex items-center gap-1", ADMIN_TITLE_CLASS)}>
              <Clock className="h-3 w-3" />
              Payments
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className={cn("text-2xl", (platform?.payments.failed24h ?? 0) > 0 && "text-amber-600")}>
              {platform?.payments.failed24h ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {(platform?.payments.withSyncIssues ?? 0) + (platform?.payments.stuckPending ?? 0)} sync/stuck
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className={ADMIN_CARD_CLASS}>
          <CardHeader>
            <CardTitle className={cn("flex items-center gap-2 text-sm", ADMIN_TITLE_CLASS)}>
              <XCircle className="h-4 w-4 text-red-500" />
              Recent failures
            </CardTitle>
            <CardDescription>Latest API errors (4xx / 5xx) — catch issues before users report them</CardDescription>
          </CardHeader>
          <CardContent>
            {recentErrors.length > 0 ? (
              <div className="max-h-72 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2 pr-2 font-normal">Time</th>
                      <th className="pb-2 pr-2 font-normal">Endpoint</th>
                      <th className="pb-2 pr-2 font-normal">Status</th>
                      <th className="pb-2 font-normal text-right">Ms</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentErrors.slice(0, 20).map((req) => (
                      <tr key={req.id} className="border-b border-gray-100 last:border-0">
                        <td className="py-2 pr-2 text-xs text-muted-foreground whitespace-nowrap">
                          {formatTime(req.timestamp)}
                        </td>
                        <td className="py-2 pr-2 font-mono text-xs truncate max-w-[180px]" title={req.endpoint}>
                          {req.endpoint}
                        </td>
                        <td className={cn("py-2 pr-2", httpStatusClass(req.statusCode))}>{req.statusCode}</td>
                        <td className="py-2 text-right text-muted-foreground">{req.responseTime}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-8 text-center text-sm text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500 opacity-60" />
                No API errors recorded in the last 24 hours
              </div>
            )}
          </CardContent>
        </Card>

        <Card className={ADMIN_CARD_CLASS}>
          <CardHeader>
            <CardTitle className={cn("flex items-center gap-2 text-sm", ADMIN_TITLE_CLASS)}>
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Endpoints needing attention
            </CardTitle>
            <CardDescription>High error rate or slow average response time</CardDescription>
          </CardHeader>
          <CardContent>
            {endpointHealth.length > 0 ? (
              <div className="max-h-72 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2 pr-2 font-normal">Endpoint</th>
                      <th className="pb-2 pr-2 font-normal">Errors</th>
                      <th className="pb-2 pr-2 font-normal">Rate</th>
                      <th className="pb-2 pr-2 font-normal">Avg ms</th>
                      <th className="pb-2 font-normal">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {endpointHealth.slice(0, 15).map((row) => (
                      <tr key={row.endpoint} className="border-b border-gray-100 last:border-0">
                        <td className="py-2 pr-2 font-mono text-xs truncate max-w-[140px]" title={row.endpoint}>
                          {row.endpoint}
                        </td>
                        <td className="py-2 pr-2">{row.errors}</td>
                        <td className="py-2 pr-2">{row.errorRate}%</td>
                        <td className={cn("py-2 pr-2", row.isSlow && "text-amber-600")}>{row.avgResponseTime}</td>
                        <td className="py-2">{endpointStatusBadge(row.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-8 text-center text-sm text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500 opacity-60" />
                All tracked endpoints are performing normally
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className={ADMIN_CARD_CLASS}>
          <CardHeader>
            <CardTitle className={cn("flex items-center gap-2 text-sm", ADMIN_TITLE_CLASS)}>
              <Activity className="h-4 w-4" />
              Platform checks
            </CardTitle>
            <CardDescription>Database, API, payments, and server resources</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(platform?.checks ?? []).length > 0 ? (
              platform!.checks.map((check) => (
                <div key={check.id} className="flex items-start justify-between gap-3 py-1">
                  <div className="min-w-0">
                    <p className="text-sm">{check.label}</p>
                    <p className="text-xs text-muted-foreground truncate">{check.detail}</p>
                  </div>
                  {statusBadge(check.status)}
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Platform check data unavailable</p>
            )}
          </CardContent>
        </Card>

        <Card className={ADMIN_CARD_CLASS}>
          <CardHeader>
            <CardTitle className={cn("text-sm", ADMIN_TITLE_CLASS)}>HTTP status breakdown (24h)</CardTitle>
            <CardDescription>Distribution of response status codes</CardDescription>
          </CardHeader>
          <CardContent>
            {statusCodes.length > 0 ? (
              <div className="space-y-2">
                {statusCodes.map(([code, count]) => {
                  const numCode = Number(code);
                  const isError = numCode >= 400;
                  const total = apiStats?.dailyRequests || 1;
                  const pct = Math.round((count / total) * 100);
                  return (
                    <div key={code} className="flex items-center gap-3">
                      <span className={cn("text-sm w-12", isError && "text-red-600 font-medium")}>{code}</span>
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={cn("h-full rounded-full", isError ? "bg-red-400" : "bg-blue-400")}
                          style={{ width: `${Math.max(pct, 2)}%` }}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground w-16 text-right">
                        {count} ({pct}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">No request data in the last 24 hours</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
