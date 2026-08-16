import {
  contributionLevelClass,
  taskStatusLabel,
  type ProjectAchievementItem,
  type ProjectContributionDay,
  type ProjectReminderItem,
  type ProjectsSummary,
} from "@/lib/projectWorkflow";
import { useTranslation } from "@/hooks/useTranslation";
import { HelpTip } from "@/components/ui/help-tip";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Bell, Loader2, Trophy } from "lucide-react";
import { formatFinanceTableDate } from "@/components/finance/financeTable";
import { Link } from "react-router-dom";
import { useCallback, useEffect, useMemo, useState } from "react";
import { projectApi } from "@/lib/api";

const CELL = 10;
const GAP = 3;
const WEEK_W = CELL + GAP;
/** Mon / Wed / Fri labels for a Sunday-start week (GitHub layout). */
const WEEKDAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""];

function localDayKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function buildContributionWeeks(days: ProjectContributionDay[]) {
  if (!days.length) return [] as ProjectContributionDay[][];

  const byDate = new Map(days.map((day) => [day.date, day]));
  const first = new Date(`${days[0].date}T12:00:00`);
  const last = new Date(`${days[days.length - 1].date}T12:00:00`);

  // Pad to Sunday start so the grid aligns like GitHub.
  const cursor = new Date(first);
  cursor.setDate(cursor.getDate() - cursor.getDay());

  const end = new Date(last);
  end.setDate(end.getDate() + (6 - end.getDay()));

  const weeks: ProjectContributionDay[][] = [];
  let week: ProjectContributionDay[] = [];

  while (cursor <= end) {
    const key = localDayKey(cursor);
    week.push(
      byDate.get(key) || {
        date: key,
        hours: 0,
        tasks: 0,
        count: 0,
        level: 0,
      },
    );
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return weeks;
}

function formatGraphDate(iso: string) {
  const date = new Date(`${iso}T12:00:00`);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function cellTitle(day: ProjectContributionDay) {
  const when = formatGraphDate(day.date);
  if (day.count <= 0 && day.level <= 0) return `No contributions on ${when}`;
  const n = day.count || day.level;
  const detail =
    day.tasks > 0 || day.hours > 0
      ? ` (${day.tasks} done${day.hours > 0 ? `, ${day.hours}h logged` : ""})`
      : "";
  return `${n} contribution${n === 1 ? "" : "s"} on ${when}${detail}`;
}

function ContributionGraph({
  days,
  emptyLabel,
}: {
  days: ProjectContributionDay[];
  emptyLabel: string;
}) {
  const weeks = useMemo(() => buildContributionWeeks(days), [days]);
  const monthLabels = useMemo(() => {
    const labels: Array<{ index: number; label: string }> = [];
    let lastLabeledWeek = -Infinity;
    weeks.forEach((week, index) => {
      const firstOfMonth = week.find((day) => {
        const d = new Date(`${day.date}T12:00:00`);
        return d.getDate() === 1;
      });
      if (!firstOfMonth) return;
      // GitHub skips a month label when weeks are too close to overlap.
      if (index - lastLabeledWeek < 2) return;
      labels.push({
        index,
        label: new Date(`${firstOfMonth.date}T12:00:00`).toLocaleDateString(undefined, {
          month: "short",
        }),
      });
      lastLabeledWeek = index;
    });
    return labels;
  }, [weeks]);

  if (!weeks.length) {
    return <p className="py-10 text-center text-sm text-muted-foreground">{emptyLabel}</p>;
  }

  const hasActivity = days.some((day) => day.level > 0);

  return (
    <div className="overflow-x-auto">
      <div className="inline-block min-w-max">
        <div className="mb-1 flex" style={{ paddingLeft: 28 }}>
          {weeks.map((_, index) => {
            const label = monthLabels.find((row) => row.index === index);
            return (
              <div
                key={`m-${index}`}
                className="text-[9px] leading-none text-muted-foreground"
                style={{ width: WEEK_W }}
              >
                {label?.label || ""}
              </div>
            );
          })}
        </div>
        <div className="flex gap-1">
          <div className="flex flex-col" style={{ gap: GAP, width: 24 }}>
            {WEEKDAY_LABELS.map((label, i) => (
              <div
                key={`d-${i}`}
                className="text-[9px] leading-none text-muted-foreground"
                style={{ height: CELL }}
              >
                {label}
              </div>
            ))}
          </div>
          <div className="flex" style={{ gap: GAP }}>
            {weeks.map((week, weekIndex) => (
              <div key={`w-${weekIndex}`} className="flex flex-col" style={{ gap: GAP }}>
                {week.map((day) => (
                  <div
                    key={day.date}
                    title={cellTitle(day)}
                    className={contributionLevelClass(day.level)}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="mt-3 flex items-center justify-end gap-1 text-[10px] text-muted-foreground">
          <span>Less</span>
          {[0, 1, 2, 3, 4].map((level) => (
            <span key={level} className={contributionLevelClass(level)} />
          ))}
          <span>More</span>
        </div>
        {!hasActivity ? (
          <p className="mt-3 text-center text-sm text-muted-foreground">{emptyLabel}</p>
        ) : null}
      </div>
    </div>
  );
}

export function ProjectsOverviewTab() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<ProjectsSummary | null>(null);
  const [graphProjectId, setGraphProjectId] = useState<string>("");

  const loadSummary = useCallback(async (projectId?: string) => {
    setLoading(true);
    try {
      const res = await projectApi.getSummary(projectId ? { projectId } : undefined);
      const data = (res.data as ProjectsSummary) || null;
      setSummary(data);
      const nextId =
        data?.contributionGraph?.projectId || data?.projectOptions?.[0]?._id || "";
      setGraphProjectId((prev) => prev || nextId);
    } catch {
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  const onSelectGraphProject = (projectId: string) => {
    setGraphProjectId(projectId);
    void loadSummary(projectId);
  };

  const contributionDays = summary?.contributionGraph?.days || [];
  const reminders = summary?.reminders || [];
  const achievements = summary?.achievements || [];
  const taskStatus = summary?.taskStatus || { todo: 0, in_progress: 0, done: 0 };
  const taskStatusTotal = taskStatus.todo + taskStatus.in_progress + taskStatus.done;
  const graphOptions = useMemo(
    () =>
      (summary?.projectOptions || []).map((row) => ({
        id: row._id,
        name: row.name,
      })),
    [summary],
  );

  const selectedGraphProjectId = useMemo(() => {
    if (graphOptions.some((option) => option.id === graphProjectId)) {
      return graphProjectId;
    }
    return graphOptions[0]?.id || "";
  }, [graphOptions, graphProjectId]);

  if (loading && !summary) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        {t("loading")}
      </div>
    );
  }

  return (
    <div className="space-y-5 p-4 lg:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5">
            <h2 className="text-lg font-semibold text-foreground">{t("projectOverviewTitle")}</h2>
            <HelpTip text={t("helpProjectOverview")} />
          </div>
          <p className="text-sm text-muted-foreground">{t("projectOverviewSubtitle")}</p>
        </div>
        <Button asChild size="sm">
          <Link to="/projects/all">{t("projectViewAll")}</Link>
        </Button>
      </div>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-foreground">{t("projectTaskStatusTitle")}</h3>
          <p className="text-xs text-muted-foreground">{t("projectTaskStatusSubtitle")}</p>
          <div className="mt-4 space-y-3">
            {(["todo", "in_progress", "done"] as const).map((status) => {
              const count = taskStatus[status] || 0;
              const pct = taskStatusTotal ? Math.round((count / taskStatusTotal) * 100) : 0;
              return (
                <div key={status}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{taskStatusLabel(status, t)}</span>
                    <span className="font-medium text-foreground">{count}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        status === "todo" && "bg-slate-400",
                        status === "in_progress" && "bg-sky-500",
                        status === "done" && "bg-emerald-500",
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {taskStatusTotal === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                {t("projectTaskStatusEmpty")}
              </p>
            ) : null}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-4 sm:p-5">
          <div className="mb-1 flex items-center gap-2">
            <Bell className="h-4 w-4 text-amber-600 dark:text-amber-300" />
            <h3 className="text-sm font-semibold text-foreground">{t("projectRemindersTitle")}</h3>
          </div>
          <p className="text-xs text-muted-foreground">{t("projectRemindersSubtitle")}</p>
          {reminders.length === 0 ? (
            <p className="mt-6 py-4 text-center text-sm text-muted-foreground">
              {t("projectRemindersEmpty")}
            </p>
          ) : (
            <ul className="mt-4 max-h-64 space-y-2 overflow-y-auto">
              {reminders.map((item: ProjectReminderItem) => (
                <li key={item.id}>
                  <Link
                    to={item.projectId ? `/projects/${item.projectId}` : "/projects"}
                    className={cn(
                      "block rounded-md border px-3 py-2 transition-colors",
                      "border-border bg-muted/40 text-foreground",
                      "hover:border-amber-500/40 hover:bg-amber-500/10",
                      "dark:bg-amber-500/10 dark:hover:bg-amber-500/20 dark:hover:border-amber-400/40",
                    )}
                  >
                    <p className="text-sm font-medium text-foreground">{item.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.type === "overdue_task"
                        ? t("projectReminderOverdueTask")
                        : item.type === "due_soon_task"
                          ? t("projectReminderDueSoonTask")
                          : t("projectReminderOverdueMilestone")}
                      {item.projectName ? ` · ${item.projectName}` : ""}
                      {item.dueDate ? ` · ${formatFinanceTableDate(item.dueDate)}` : ""}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-lg border border-border bg-card p-4 sm:p-5">
          <div className="mb-1 flex items-center gap-2">
            <Trophy className="h-4 w-4 text-emerald-600 dark:text-emerald-300" />
            <h3 className="text-sm font-semibold text-foreground">{t("projectAchievementsTitle")}</h3>
          </div>
          <p className="text-xs text-muted-foreground">{t("projectAchievementsSubtitle")}</p>
          {achievements.length === 0 ? (
            <p className="mt-6 py-4 text-center text-sm text-muted-foreground">
              {t("projectAchievementsEmpty")}
            </p>
          ) : (
            <ul className="mt-4 max-h-64 space-y-2 overflow-y-auto">
              {achievements.map((item: ProjectAchievementItem) => (
                <li
                  key={item.id}
                  className={cn(
                    "rounded-md border px-3 py-2",
                    "border-emerald-200/80 bg-emerald-50/60 text-foreground",
                    "dark:border-emerald-500/30 dark:bg-emerald-500/15",
                  )}
                >
                  <p className="text-sm font-medium text-foreground">
                    {item.type === "tasks_completed_week"
                      ? t("projectAchievementTasksWeek").replace("{count}", String(item.count || 0))
                      : item.type === "milestones_completed_week"
                        ? t("projectAchievementMilestonesWeek").replace(
                            "{count}",
                            String(item.count || 0),
                          )
                        : item.type === "project_completed"
                          ? t("projectAchievementProjectDone").replace(
                              "{name}",
                              item.title || item.projectName || "",
                            )
                          : t("projectAchievementMilestoneDone")
                              .replace("{title}", item.title)
                              .replace("{project}", item.projectName || "")}
                  </p>
                  {item.completedAt ? (
                    <p className="text-xs text-muted-foreground">
                      {formatFinanceTableDate(item.completedAt)}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">{t("projectContributionTitle")}</h3>
            <p className="text-xs text-muted-foreground">{t("projectContributionSubtitle")}</p>
          </div>
          {graphOptions.length > 0 ? (
            <Select value={selectedGraphProjectId} onValueChange={onSelectGraphProject}>
              <SelectTrigger className="w-[220px] shadow-none">
                <SelectValue placeholder={t("projectSelectProject")} />
              </SelectTrigger>
              <SelectContent>
                {graphOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {t("loading")}
          </div>
        ) : (
          <ContributionGraph
            days={contributionDays}
            emptyLabel={t("projectContributionEmpty")}
          />
        )}
      </section>
    </div>
  );
}
