import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { projectApi } from "@/lib/api";
import { formatWeekLabel, type ProjectsSummary } from "@/lib/projectWorkflow";
import { useTranslation } from "@/hooks/useTranslation";
import { HelpTip } from "@/components/ui/help-tip";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function ProjectsOverviewTab() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<ProjectsSummary | null>(null);

  const loadSummary = useCallback(async () => {
    setLoading(true);
    try {
      const res = await projectApi.getSummary();
      setSummary((res.data as ProjectsSummary) || null);
    } catch {
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  const tasksChartData = useMemo(
    () =>
      (summary?.tasksCompletedWeekly || []).map((row) => ({
        label: formatWeekLabel(row.weekStart),
        value: row.value,
      })),
    [summary],
  );

  const hoursChartData = useMemo(
    () =>
      (summary?.hoursLoggedWeekly || []).map((row) => ({
        label: formatWeekLabel(row.weekStart),
        value: row.value,
      })),
    [summary],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        {t("loading")}
      </div>
    );
  }

  const stats = summary || {
    totalProjects: 0,
    byStatus: { planning: 0, active: 0, on_hold: 0, completed: 0, cancelled: 0 },
    overdueMilestones: 0,
    openTasks: 0,
    tasksCompletedWeekly: [],
    hoursLoggedWeekly: [],
  };

  return (
    <div className="space-y-5 p-4 lg:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5">
            <h2 className="text-lg font-semibold text-gray-900">{t("projectOverviewTitle")}</h2>
            <HelpTip text={t("helpProjectOverview")} />
          </div>
          <p className="text-sm text-gray-500">{t("projectOverviewSubtitle")}</p>
        </div>
        <Button asChild size="sm">
          <Link to="/projects/all">{t("projectViewAll")}</Link>
        </Button>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">{t("projectTotalProjects")}</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">{stats.totalProjects}</p>
          <p className="mt-1 text-xs text-gray-500">
            {stats.byStatus.active} {t("projectStatusActive").toLowerCase()}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">{t("projectOpenTasks")}</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">{stats.openTasks}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">{t("projectOverdueMilestones")}</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">{stats.overdueMilestones}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">{t("projectCompletedCount")}</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">{stats.byStatus.completed}</p>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-gray-900">{t("projectVelocityTasks")}</h3>
          <p className="text-xs text-gray-500">{t("projectVelocityTasksHint")}</p>
          <div className="mt-4 h-56">
            {tasksChartData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={tasksChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-10 text-center text-sm text-gray-500">{t("projectNoVelocityData")}</p>
            )}
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-gray-900">{t("projectVelocityHours")}</h3>
          <p className="text-xs text-gray-500">{t("projectVelocityHoursHint")}</p>
          <div className="mt-4 h-56">
            {hoursChartData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hoursChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-10 text-center text-sm text-gray-500">{t("projectNoVelocityData")}</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
