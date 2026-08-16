import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  CalendarDays,
  CheckSquare,
  FileText,
  Loader2,
  MessageSquare,
  ClipboardCheck,
  RefreshCw,
} from "lucide-react";
import {
  approvalApi,
  corporateCalendarApi,
  documentApi,
  teamTaskApi,
  workspaceApi,
  type OverviewInsightIdea,
} from "@/lib/api";
import type { UpcomingReminderItem } from "@/lib/workReminders";
import { UpcomingRemindersCard } from "@/components/reminders/UpcomingRemindersCard";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/hooks/useWorkspace";

type OpsAction = {
  id: string;
  title: string;
  reason: string;
  href: string;
  priority: "high" | "medium" | "low";
  source: "calendar" | "tasks" | "documents" | "messages" | "approvals" | "ai";
};

type TaskRow = {
  _id?: string;
  id?: string;
  title?: string;
  status?: string;
  dueDate?: string | null;
  priority?: string;
};

type DocRow = {
  _id?: string;
  id?: string;
  title?: string;
  name?: string;
  expiryDate?: string | null;
  registryStatus?: string | null;
};

const AI_CACHE_PREFIX = "trippo-overview-ai-insights:";

function readCachedAiIdeas(): OverviewInsightIdea[] {
  try {
    const raw = sessionStorage.getItem(`${AI_CACHE_PREFIX}${new Date().toISOString().slice(0, 10)}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { ideas?: OverviewInsightIdea[] };
    return Array.isArray(parsed?.ideas) ? parsed.ideas.slice(0, 4) : [];
  } catch {
    return [];
  }
}

function asArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of ["data", "items", "tasks", "documents", "queue", "reminders"]) {
      if (Array.isArray(record[key])) return record[key] as T[];
    }
  }
  return [];
}

function daysUntil(iso?: string | null) {
  if (!iso) return Number.POSITIVE_INFINITY;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return Number.POSITIVE_INFINITY;
  return Math.ceil((t - Date.now()) / (24 * 60 * 60 * 1000));
}

function isOpenTask(status?: string) {
  const s = String(status || "todo").toLowerCase();
  return s !== "done" && s !== "completed" && s !== "cancelled" && s !== "canceled";
}

const QUICK_LINKS = [
  { label: "Calendar", href: "/calendar", icon: CalendarDays, hint: "Meetings & schedules" },
  { label: "Messages", href: "/messages", icon: MessageSquare, hint: "Team chat" },
  { label: "Tasks", href: "/team/tasks", icon: CheckSquare, hint: "Work board" },
  { label: "Documents", href: "/documents", icon: FileText, hint: "Files & registry" },
  { label: "Approvals", href: "/approvals", icon: ClipboardCheck, hint: "Pending decisions" },
  { label: "Reports", href: "/reports", icon: ArrowRight, hint: "Business insight" },
] as const;

export function OperationsHub() {
  const navigate = useNavigate();
  const { workspaces } = useWorkspace();
  const hasJoinedOrgs = workspaces.length > 0;
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reminders, setReminders] = useState<UpcomingReminderItem[]>([]);
  const [actions, setActions] = useState<OpsAction[]>([]);
  const [aiIdeas, setAiIdeas] = useState<OverviewInsightIdea[]>([]);
  const [stats, setStats] = useState({
    unread: 0,
    openTasks: 0,
    dueSoonTasks: 0,
    expiringDocs: 0,
    pendingApprovals: 0,
  });

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [remindersRes, tasksRes, docsRes, approvalsRes, unreadRes] = await Promise.all([
        corporateCalendarApi.getReminders({ days: 7, limit: 12 }).catch(() => null),
        teamTaskApi.getAll().catch(() => null),
        documentApi.getAll().catch(() => null),
        approvalApi.getSummary().catch(() => null),
        hasJoinedOrgs
          ? workspaceApi.getAllChatUnreadSummary().catch(() => null)
          : Promise.resolve(null),
      ]);

      const reminderItems = asArray<UpcomingReminderItem>(
        (remindersRes as { data?: unknown } | null)?.data ?? remindersRes,
      ).filter((item) => item && typeof item.id === "string" && typeof item.href === "string");
      setReminders(reminderItems.slice(0, 8));

      const tasks = asArray<TaskRow>(
        (tasksRes as { data?: unknown } | null)?.data ?? tasksRes,
      );
      const openTasks = tasks.filter((task) => isOpenTask(task.status));
      const dueSoonTasks = openTasks.filter((task) => {
        const d = daysUntil(task.dueDate);
        return d <= 3;
      });

      const docs = asArray<DocRow>((docsRes as { data?: unknown } | null)?.data ?? docsRes);
      const expiringDocs = docs.filter((doc) => {
        const d = daysUntil(doc.expiryDate);
        return d >= 0 && d <= 14;
      });

      const approvalSummary =
        ((approvalsRes as { data?: Record<string, unknown> } | null)?.data ??
          approvalsRes) as Record<string, unknown> | null;
      const pendingApprovals = Number(
        approvalSummary?.pending ??
          approvalSummary?.pendingCount ??
          approvalSummary?.totalPending ??
          0,
      );

      const unreadPayload =
        ((unreadRes as { data?: Record<string, unknown> } | null)?.data ??
          unreadRes) as Record<string, unknown> | null;
      const unread = Number(
        unreadPayload?.totalUnread ??
          unreadPayload?.unread ??
          unreadPayload?.total ??
          0,
      );

      setStats({
        unread: Number.isFinite(unread) ? unread : 0,
        openTasks: openTasks.length,
        dueSoonTasks: dueSoonTasks.length,
        expiringDocs: expiringDocs.length,
        pendingApprovals: Number.isFinite(pendingApprovals) ? pendingApprovals : 0,
      });

      const nextActions: OpsAction[] = [];

      for (const task of dueSoonTasks.slice(0, 5)) {
        const id = String(task._id || task.id || "");
        const due = daysUntil(task.dueDate);
        nextActions.push({
          id: `task-${id}`,
          title: task.title?.trim() || "Open task",
          reason:
            due < 0
              ? "Overdue — needs attention"
              : due === 0
                ? "Due today"
                : `Due in ${due} day${due === 1 ? "" : "s"}`,
          href: "/team/tasks",
          priority: due < 0 ? "high" : due === 0 ? "high" : "medium",
          source: "tasks",
        });
      }

      for (const doc of expiringDocs.slice(0, 4)) {
        const id = String(doc._id || doc.id || "");
        const due = daysUntil(doc.expiryDate);
        nextActions.push({
          id: `doc-${id}`,
          title: doc.title?.trim() || doc.name?.trim() || "Document",
          reason: due === 0 ? "Expires today" : `Expires in ${due} day${due === 1 ? "" : "s"}`,
          href: id ? `/documents/${id}` : "/documents",
          priority: due <= 3 ? "high" : "medium",
          source: "documents",
        });
      }

      if (pendingApprovals > 0) {
        nextActions.push({
          id: "approvals-pending",
          title: `${pendingApprovals} approval${pendingApprovals === 1 ? "" : "s"} waiting`,
          reason: "Review so work can keep moving",
          href: "/approvals",
          priority: "high",
          source: "approvals",
        });
      }

      if (unread > 0) {
        nextActions.push({
          id: "messages-unread",
          title: `${unread} unread message${unread === 1 ? "" : "s"}`,
          reason: "Catch up with your team",
          href: "/messages",
          priority: unread > 5 ? "high" : "medium",
          source: "messages",
        });
      }

      for (const reminder of reminderItems.slice(0, 3)) {
        nextActions.push({
          id: `cal-${reminder.id}`,
          title: reminder.title || "Upcoming calendar item",
          reason: reminder.subtitle || "On your calendar this week",
          href: reminder.href || "/calendar",
          priority: "low",
          source: "calendar",
        });
      }

      const priorityRank = { high: 0, medium: 1, low: 2 } as const;
      nextActions.sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority]);
      setActions(nextActions.slice(0, 10));
      setAiIdeas(readCachedAiIdeas());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [hasJoinedOrgs]);

  useEffect(() => {
    void load(false);
  }, [load]);

  const pulseCards = useMemo(
    () => [
      {
        label: "Due soon",
        value: stats.dueSoonTasks,
        href: "/team/tasks",
        tone: "text-amber-700 bg-amber-50",
      },
      {
        label: "Open tasks",
        value: stats.openTasks,
        href: "/team/tasks",
        tone: "text-sky-700 bg-sky-50",
      },
      {
        label: "Unread",
        value: stats.unread,
        href: "/messages",
        tone: "text-violet-700 bg-violet-50",
      },
      {
        label: "Expiring docs",
        value: stats.expiringDocs,
        href: "/documents",
        tone: "text-rose-700 bg-rose-50",
      },
      {
        label: "Approvals",
        value: stats.pendingApprovals,
        href: "/approvals",
        tone: "text-emerald-700 bg-emerald-50",
      },
    ],
    [stats],
  );

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Loading operations…
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Operations</h1>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Run the business day from one place — calendar, tasks, messages, documents, and approvals —
            without jumping between separate tools.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={refreshing}
          onClick={() => void load(true)}
          className="gap-1.5"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {pulseCards.map((card) => (
          <button
            key={card.label}
            type="button"
            onClick={() => navigate(card.href)}
            className="rounded-xl border border-gray-200 bg-white p-3 text-left transition-colors hover:border-sky-200 hover:bg-sky-50/40"
          >
            <div className={cn("inline-flex rounded-md px-2 py-0.5 text-[11px] font-medium", card.tone)}>
              {card.label}
            </div>
            <div className="mt-2 text-2xl font-semibold tabular-nums text-gray-900">{card.value}</div>
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Recommended next actions</h2>
              <p className="text-xs text-gray-500">Deterministic priorities from your live workspace data</p>
            </div>
          </div>
          {actions.length === 0 ? (
            <p className="rounded-lg bg-gray-50 px-3 py-8 text-center text-sm text-gray-500">
              You&apos;re clear for now. Use the shortcuts below to keep work moving.
            </p>
          ) : (
            <ul className="space-y-2">
              {actions.map((action) => (
                <li key={action.id}>
                  <Link
                    to={action.href}
                    className="flex items-start justify-between gap-3 rounded-lg border border-gray-100 px-3 py-2.5 transition-colors hover:border-sky-200 hover:bg-sky-50/50"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                            action.priority === "high" && "bg-rose-50 text-rose-700",
                            action.priority === "medium" && "bg-amber-50 text-amber-700",
                            action.priority === "low" && "bg-slate-100 text-slate-600",
                          )}
                        >
                          {action.priority}
                        </span>
                        <span className="text-[10px] uppercase tracking-wide text-gray-400">
                          {action.source}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-sm font-medium text-gray-900">{action.title}</p>
                      <p className="text-xs text-gray-500">{action.reason}</p>
                    </div>
                    <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-gray-400" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <UpcomingRemindersCard
          items={reminders}
          title="This week"
          subtitle="Meetings and deadlines"
          emptyText="No reminders in the next 7 days."
        />
      </div>

      {aiIdeas.length > 0 ? (
        <section className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="mb-3">
            <h2 className="text-sm font-semibold text-gray-900">Suggested focus</h2>
            <p className="text-xs text-gray-500">
              Optional ideas from Overview AI review (cached for today) — open Overview to refresh them
            </p>
          </div>
          <ul className="grid gap-2 sm:grid-cols-2">
            {aiIdeas.map((idea, index) => (
              <li key={`${idea.title}-${index}`}>
                <Link
                  to={idea.actionPath || "/"}
                  className="block rounded-lg border border-gray-100 px-3 py-2.5 transition-colors hover:border-sky-200 hover:bg-sky-50/50"
                >
                  <p className="text-sm font-medium text-gray-900">{idea.title}</p>
                  {idea.why ? <p className="mt-0.5 text-xs text-gray-500">{idea.why}</p> : null}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Business toolkit</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {QUICK_LINKS.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                to={item.href}
                className="rounded-xl border border-gray-200 bg-white p-3 transition-colors hover:border-sky-200 hover:bg-sky-50/40"
              >
                <Icon className="h-4 w-4 text-sky-600" />
                <p className="mt-2 text-sm font-medium text-gray-900">{item.label}</p>
                <p className="text-xs text-gray-500">{item.hint}</p>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
