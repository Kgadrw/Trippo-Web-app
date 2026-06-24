import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { teamTaskApi, type TeamMemberRecord, type TeamTaskRecord } from "@/lib/api";
import { formatMonthLabel, getMonthKey } from "@/lib/teamConstants";
import { useTranslation } from "@/hooks/useTranslation";
import { Loader2, CheckCircle2, Users, ListTodo } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HelpTip } from "@/components/ui/help-tip";
import { filterSelectClass } from "@/lib/fieldStyles";

interface SummaryData {
  total: number;
  byStatus: { todo: number; in_progress: number; done: number };
  completionRate: number;
  activeMembers: number;
  byMember: Array<{
    assigneeId: string;
    member: TeamMemberRecord | null;
    total: number;
    done: number;
    inProgress: number;
    todo: number;
    progress: number;
  }>;
  recentDone: TeamTaskRecord[];
}

export function TeamOverviewTab() {
  const { t } = useTranslation();
  const [monthKey, setMonthKey] = useState(getMonthKey());
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSummary = useCallback(async () => {
    setLoading(true);
    try {
      const res = await teamTaskApi.getSummary({ monthKey });
      setSummary((res.data as SummaryData) || null);
    } catch {
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [monthKey]);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  const monthOptions = useMemo(() => {
    const options: string[] = [];
    const now = new Date();
    for (let i = -2; i <= 4; i += 1) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      options.push(getMonthKey(d));
    }
    return options;
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-500">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        {t("loading")}
      </div>
    );
  }

  const stats = summary || {
    total: 0,
    byStatus: { todo: 0, in_progress: 0, done: 0 },
    completionRate: 0,
    activeMembers: 0,
    byMember: [],
    recentDone: [],
  };

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5">
            <h2 className="text-lg font-semibold text-gray-900">{t("teamOverviewTitle")}</h2>
            <HelpTip text={t("helpTeamOverview")} />
          </div>
          <p className="text-sm text-gray-600">{t("teamOverviewSubtitle")}</p>
        </div>
        <Select value={monthKey} onValueChange={setMonthKey}>
          <SelectTrigger className={filterSelectClass}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {monthOptions.map((key) => (
              <SelectItem key={key} value={key}>
                {formatMonthLabel(key)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={ListTodo}
          label={t("teamTotalTasks")}
          value={String(stats.total)}
          hint={`${stats.byStatus.todo} ${t("teamStatusTodo")}`}
        />
        <StatCard
          icon={CheckCircle2}
          label={t("teamCompletionRate")}
          value={`${stats.completionRate}%`}
          hint={`${stats.byStatus.done} ${t("teamStatusDone")}`}
        />
        <StatCard
          icon={Users}
          label={t("teamActiveMembers")}
          value={String(stats.activeMembers)}
          hint={t("teamMembersHint")}
        />
        <StatCard
          icon={ListTodo}
          label={t("teamInProgress")}
          value={String(stats.byStatus.in_progress)}
          hint={t("teamInProgressHint")}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h3 className="mb-3 text-sm font-semibold text-gray-900">{t("teamProgressByMember")}</h3>
          {stats.byMember.length === 0 ? (
            <p className="text-sm text-gray-500">{t("teamNoMemberProgress")}</p>
          ) : (
            <div className="divide-y divide-gray-200 border border-gray-200">
              {stats.byMember.map((row) => (
                <div key={row.assigneeId} className="px-4 py-3">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-sm font-medium text-gray-900">
                      {row.member?.name || t("teamUnknownMember")}
                    </span>
                    <span className="text-xs text-gray-500">
                      {row.done}/{row.total} {t("teamStatusDone").toLowerCase()}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100">
                    <div
                      className="h-full bg-emerald-500 transition-all"
                      style={{ width: `${row.progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h3 className="mb-3 text-sm font-semibold text-gray-900">{t("teamRecentCompletions")}</h3>
          {stats.recentDone.length === 0 ? (
            <p className="text-sm text-gray-500">{t("teamNoRecentCompletions")}</p>
          ) : (
            <div className="divide-y divide-gray-200 border border-gray-200">
              {stats.recentDone.map((task) => {
                const assignee =
                  typeof task.assigneeId === "object" ? task.assigneeId?.name : undefined;
                return (
                  <div key={task._id} className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-900">{task.title}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {assignee || t("teamUnknownMember")}
                      {task.completionNote ? ` — ${task.completionNote}` : ""}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <div className="flex flex-wrap gap-3 text-sm">
        <Link to="/team/tasks" className="text-sky-600 hover:underline">
          {t("teamManageTasks")}
        </Link>
        <Link to="/team/members" className="text-sky-600 hover:underline">
          {t("teamManageMembers")}
        </Link>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof ListTodo;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="border border-gray-200 px-4 py-4">
      <div className="flex items-center gap-2 text-gray-500 mb-2">
        <Icon size={16} />
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-2xl font-semibold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{hint}</p>
    </div>
  );
}
