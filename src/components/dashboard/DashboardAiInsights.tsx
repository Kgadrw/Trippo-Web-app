import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, RefreshCw, ArrowRight } from "lucide-react";
import {
  aiApi,
  productApi,
  teamMemberApi,
  projectApi,
  leaveRequestApi,
  scheduleApi,
  type OverviewInsightIdea,
  type OverviewInsightsResult,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  Bar,
  BarChart,
  XAxis,
  YAxis,
} from "recharts";

type FinanceSlice = {
  incomes: Array<{ date: string; amount: number }>;
  expenses: Array<{ date: string; amount: number }>;
  bills: Array<{ dueDate: string; amount: number; status?: string }>;
  payrolls: Array<{ paymentDate: string; amount: number; status?: string }>;
  taxes: Array<{ dueDate: string; amount: number; status?: string }>;
  invoices: Array<{ dueDate: string; amount: number; status?: string }>;
  sales: Array<{ date?: string; timestamp?: string; revenue: number; profit?: number }>;
  bankDeposits: Array<{ depositDate: string; amount: number }>;
  loans: Array<{ remainingBalance?: number; status?: string; nextDueDate?: string }>;
};

type ModulePulse = {
  inventory: number;
  finance: number;
  hr: number;
  projects: number;
  calendar: number;
  sales: number;
};

const CACHE_KEY = "trippo-overview-ai-insights";

const AREA_COLORS: Record<string, string> = {
  inventory: "#d97706",
  finance: "#0284c7",
  hr: "#0d9488",
  projects: "#7c3aed",
  calendar: "#ea580c",
  sales: "#059669",
  general: "#64748b",
};

function cacheKeyForDay() {
  return `${CACHE_KEY}:${new Date().toISOString().slice(0, 10)}`;
}

function readCache(): OverviewInsightsResult | null {
  try {
    const raw = sessionStorage.getItem(cacheKeyForDay());
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OverviewInsightsResult;
    if (!parsed || parsed.fallback) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(result: OverviewInsightsResult) {
  try {
    sessionStorage.setItem(cacheKeyForDay(), JSON.stringify(result));
  } catch {
    /* ignore */
  }
}

function sum(rows: Array<{ amount?: number; revenue?: number }>, field: "amount" | "revenue" = "amount") {
  return rows.reduce((total, row) => total + (Number(row[field]) || 0), 0);
}

function isPending(status?: string) {
  const s = String(status || "pending").toLowerCase();
  return s === "pending" || s === "unpaid" || s === "due" || s === "open";
}

function isOverdue(dueDate: string, status?: string) {
  if (!isPending(status)) return false;
  const due = new Date(dueDate).getTime();
  if (!Number.isFinite(due)) return false;
  return due < Date.now() - 24 * 60 * 60 * 1000;
}

function areaLabel(area: string) {
  switch (area) {
    case "inventory":
      return "Stock";
    case "finance":
      return "Finance";
    case "hr":
      return "HR";
    case "projects":
      return "Projects";
    case "calendar":
      return "Calendar";
    case "sales":
      return "Sales";
    default:
      return "General";
  }
}

type DashboardAiInsightsProps = FinanceSlice & {
  enabled?: boolean;
};

export function DashboardAiInsights({
  enabled = true,
  incomes,
  expenses,
  bills,
  payrolls,
  taxes,
  invoices,
  sales,
  bankDeposits,
  loans,
}: DashboardAiInsightsProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<OverviewInsightsResult | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [modulePulse, setModulePulse] = useState<ModulePulse | null>(null);
  const requestIdRef = useRef(0);
  const loadedOnceRef = useRef(false);

  const financeSnapshot = useMemo(() => {
    const overdueBills = bills.filter((b) => isOverdue(b.dueDate, b.status));
    const overdueTaxes = taxes.filter((t) => isOverdue(t.dueDate, t.status));
    const unpaidInvoices = invoices.filter((i) => isPending(i.status));
    return {
      moneyInApprox: Math.round(sum(incomes) + sum(sales, "revenue") + sum(bankDeposits)),
      moneyOutApprox: Math.round(sum(expenses) + sum(payrolls)),
      salesCount: sales.length,
      salesProfitApprox: Math.round(sales.reduce((s, row) => s + (Number(row.profit) || 0), 0)),
      overdueBillsCount: overdueBills.length,
      overdueBillsAmount: Math.round(sum(overdueBills)),
      overdueTaxesCount: overdueTaxes.length,
      unpaidInvoicesCount: unpaidInvoices.length,
      unpaidInvoicesAmount: Math.round(sum(unpaidInvoices)),
      openLoansCount: loans.filter((l) => String(l.status || "").toLowerCase() !== "paid").length,
      loanBalanceApprox: Math.round(
        loans.reduce((s, row) => s + (Number(row.remainingBalance) || 0), 0),
      ),
    };
  }, [incomes, expenses, bills, payrolls, taxes, invoices, sales, bankDeposits, loans]);

  const cashFlowChart = useMemo(() => {
    const moneyIn = financeSnapshot.moneyInApprox;
    const moneyOut = financeSnapshot.moneyOutApprox;
    return [
      { name: "In", value: moneyIn, fill: "#059669" },
      { name: "Out", value: moneyOut, fill: "#e11d48" },
    ];
  }, [financeSnapshot]);

  const buildSnapshot = useCallback(async () => {
    const [productsRes, teamRes, projectsRes, leaveRes, schedulesRes] = await Promise.all([
      productApi.getAll().catch(() => null),
      teamMemberApi.getAll().catch(() => null),
      projectApi.getAll().catch(() => null),
      leaveRequestApi.getAll({ status: "pending" }).catch(() => null),
      scheduleApi.getAll({ upcoming: "1" }).catch(() => null),
    ]);

    const products = Array.isArray(productsRes?.data) ? productsRes.data : [];
    const team = Array.isArray(teamRes?.data) ? teamRes.data : [];
    const projects = Array.isArray(projectsRes?.data) ? projectsRes.data : [];
    const leavePending = Array.isArray(leaveRes?.data) ? leaveRes.data : [];
    const schedules = Array.isArray(schedulesRes?.data) ? schedulesRes.data : [];

    const lowStock = products.filter((p: Record<string, unknown>) => {
      const stock = Number(p.stock ?? p.quantity ?? 0);
      const min = Number(p.minStock ?? p.reorderLevel ?? 5);
      return Number.isFinite(stock) && stock <= min;
    });

    const openProjects = projects.filter((p: Record<string, unknown>) => {
      const status = String(p.status || "").toLowerCase();
      return status !== "completed" && status !== "cancelled" && status !== "archived";
    });

    const pulse: ModulePulse = {
      inventory: lowStock.length,
      finance:
        financeSnapshot.overdueBillsCount +
        financeSnapshot.overdueTaxesCount +
        Math.min(3, Math.floor(financeSnapshot.unpaidInvoicesCount / 2)),
      hr: leavePending.length,
      projects: openProjects.length,
      calendar: schedules.length,
      sales: Math.min(5, Math.ceil(sales.length / 10)),
    };
    setModulePulse(pulse);

    return {
      country: "RW",
      modules: ["inventory", "finance", "hr", "projects", "calendar", "sales"],
      finance: financeSnapshot,
      inventory: {
        productCount: products.length,
        lowStockCount: lowStock.length,
        lowStockNames: lowStock
          .slice(0, 8)
          .map((p: Record<string, unknown>) => String(p.name || p.title || "Item")),
      },
      hr: {
        teamCount: team.length,
        pendingLeaveCount: leavePending.length,
      },
      projects: {
        projectCount: projects.length,
        openProjectCount: openProjects.length,
      },
      calendar: {
        upcomingScheduleCount: schedules.length,
      },
    };
  }, [financeSnapshot, sales.length]);

  const runInsights = useCallback(
    async (force = false) => {
      if (!enabled) return;

      if (!force) {
        const cached = readCache();
        if (cached) {
          setInsights(cached);
          setUnavailable(false);
          // Still refresh pulse metrics in the background.
          void buildSnapshot();
          return;
        }
      }

      const requestId = ++requestIdRef.current;
      setLoading(true);
      try {
        const snapshot = await buildSnapshot();
        const result = await aiApi.getOverviewInsights(snapshot);
        if (requestId !== requestIdRef.current) return;

        if (!result) {
          setInsights(null);
          setUnavailable(true);
          return;
        }

        writeCache(result);
        setInsights(result);
        setUnavailable(false);
      } catch {
        if (requestId !== requestIdRef.current) return;
        setInsights(null);
        setUnavailable(true);
      } finally {
        if (requestId === requestIdRef.current) setLoading(false);
      }
    },
    [buildSnapshot, enabled],
  );

  useEffect(() => {
    if (!enabled || loadedOnceRef.current) return;
    loadedOnceRef.current = true;
    void runInsights(false);
  }, [enabled, runInsights]);

  const focusChart = useMemo(() => {
    const ideas = insights?.ideas || [];
    if (ideas.length > 0) {
      const counts = new Map<string, number>();
      for (const idea of ideas) {
        const key = idea.area || "general";
        counts.set(key, (counts.get(key) || 0) + 1);
      }
      return [...counts.entries()].map(([name, value]) => ({
        name: areaLabel(name),
        key: name,
        value,
        fill: AREA_COLORS[name] || AREA_COLORS.general,
      }));
    }

    if (!modulePulse) return [];
    return (Object.keys(modulePulse) as Array<keyof ModulePulse>)
      .map((key) => ({
        name: areaLabel(key),
        key,
        value: Math.max(0, modulePulse[key]),
        fill: AREA_COLORS[key] || AREA_COLORS.general,
      }))
      .filter((row) => row.value > 0);
  }, [insights, modulePulse]);

  if (!enabled) return null;

  const ideas: OverviewInsightIdea[] = insights?.ideas || [];
  const showEmptyQuiet = unavailable && !loading && !insights;

  if (showEmptyQuiet) {
    return (
      <div className="mt-2 space-y-2 px-0 py-2">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            AI review unavailable right now
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => void runInsights(true)}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Try again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-2 space-y-4 px-0 py-1">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-900">AI review</h3>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Cross-module read of stock, finance, HR, projects, and schedules
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 shrink-0 gap-1.5 text-xs text-sky-700 hover:bg-sky-50 hover:text-sky-800"
          disabled={loading}
          onClick={() => void runInsights(true)}
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Refresh
        </Button>
      </div>

      {loading && !insights ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="h-44 animate-pulse rounded-xl bg-sky-50/70" />
          <div className="space-y-2">
            <div className="h-4 w-3/4 animate-pulse rounded bg-sky-50/80" />
            <div className="h-14 animate-pulse rounded-xl bg-sky-50/60" />
            <div className="h-14 animate-pulse rounded-xl bg-sky-50/60" />
          </div>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
          <div className="space-y-4">
            {(cashFlowChart[0].value > 0 || cashFlowChart[1].value > 0) && (
              <div>
                <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-gray-400">
                  Money pulse
                </p>
                <div className="h-36 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={cashFlowChart} barCategoryGap="28%">
                      <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#6b7280", fontSize: 11 }}
                      />
                      <YAxis hide />
                      <Tooltip
                        cursor={{ fill: "rgba(14,165,233,0.06)" }}
                        formatter={(value: number) =>
                          `Rwf ${Math.round(Number(value) || 0).toLocaleString()}`
                        }
                        contentStyle={{
                          border: "none",
                          borderRadius: 12,
                          boxShadow: "none",
                          background: "rgba(255,255,255,0.95)",
                          fontSize: 12,
                        }}
                      />
                      <Bar dataKey="value" radius={[10, 10, 4, 4]}>
                        {cashFlowChart.map((entry) => (
                          <Cell key={entry.name} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {focusChart.length > 0 ? (
              <div>
                <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-gray-400">
                  Attention map
                </p>
                <div className="flex items-center gap-3">
                  <div className="h-40 w-40 shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={focusChart}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={38}
                          outerRadius={62}
                          paddingAngle={3}
                          stroke="none"
                        >
                          {focusChart.map((entry) => (
                            <Cell key={entry.key} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            border: "none",
                            borderRadius: 12,
                            boxShadow: "none",
                            background: "rgba(255,255,255,0.95)",
                            fontSize: 12,
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <ul className="min-w-0 flex-1 space-y-1.5">
                    {focusChart.map((entry) => (
                      <li key={entry.key} className="flex items-center gap-2 text-xs text-gray-600">
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: entry.fill }}
                        />
                        <span className="min-w-0 flex-1 truncate">{entry.name}</span>
                        <span className="tabular-nums text-gray-400">{entry.value}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : null}
          </div>

          <div className="min-w-0 space-y-3">
            {insights?.summary ? (
              <p className="text-sm leading-relaxed text-gray-700">{insights.summary}</p>
            ) : null}

            {ideas.length > 0 ? (
              <ol className="space-y-2.5">
                {ideas.map((idea, index) => {
                  const color = AREA_COLORS[idea.area] || AREA_COLORS.general;
                  return (
                    <li key={`${idea.title}-${index}`}>
                      <button
                        type="button"
                        onClick={() => navigate(idea.actionPath || "/")}
                        className="group flex w-full items-start gap-3 rounded-xl bg-transparent px-0 py-1.5 text-left transition hover:bg-sky-50/50"
                      >
                        <span
                          className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white"
                          style={{ backgroundColor: color }}
                        >
                          {index + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-gray-900">{idea.title}</p>
                            <span
                              className={cn(
                                "rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                                "bg-transparent text-gray-500",
                              )}
                              style={{ color }}
                            >
                              {areaLabel(idea.area)}
                            </span>
                          </div>
                          {idea.why ? (
                            <p className="mt-0.5 text-xs leading-relaxed text-gray-500">{idea.why}</p>
                          ) : null}
                        </div>
                        <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-gray-300 transition group-hover:text-sky-500" />
                      </button>
                    </li>
                  );
                })}
              </ol>
            ) : !loading ? (
              <p className="text-sm text-gray-500">
                No suggestions yet — keep recording activity to unlock insights.
              </p>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
