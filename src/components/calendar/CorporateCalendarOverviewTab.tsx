import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { corporateCalendarApi } from "@/lib/api";
import type { CorporateCalendarSummary } from "@/lib/calendarWorkflow";
import { useTranslation } from "@/hooks/useTranslation";
import { HelpTip } from "@/components/ui/help-tip";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export function CorporateCalendarOverviewTab() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<CorporateCalendarSummary | null>(null);

  const loadSummary = useCallback(async () => {
    setLoading(true);
    try {
      const res = await corporateCalendarApi.getSummary();
      setSummary((res.data as CorporateCalendarSummary) || null);
    } catch {
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        {t("loading")}
      </div>
    );
  }

  const stats = summary || {
    upcomingMeetings: 0,
    activeAnnouncements: 0,
    pendingAutomations: 0,
    approvedLeaveWindows: 0,
    upcomingMilestones: 0,
    clientMeetings: 0,
  };

  return (
    <div className="space-y-5 p-4 lg:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5">
            <h2 className="text-lg font-semibold text-gray-900">{t("corpCalOverviewTitle")}</h2>
            <HelpTip text={t("helpCorpCalOverview")} />
          </div>
          <p className="text-sm text-gray-500">{t("corpCalOverviewSubtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline">
            <Link to="/calendar/view">{t("corpCalOpenCalendar")}</Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/calendar/announcements">{t("corpCalOpenAnnouncements")}</Link>
          </Button>
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">{t("corpCalUpcomingMeetings")}</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">{stats.upcomingMeetings}</p>
          <p className="text-xs text-gray-500">{stats.clientMeetings} {t("corpCalClientMeetings").toLowerCase()}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">{t("corpCalLeaveWindows")}</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">{stats.approvedLeaveWindows}</p>
          <p className="text-xs text-gray-500">{t("corpCalLeaveHint")}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">{t("corpCalMilestones")}</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">{stats.upcomingMilestones}</p>
          <p className="text-xs text-gray-500">{t("corpCalMilestoneHint")}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">{t("corpCalAnnouncements")}</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">{stats.activeAnnouncements}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">{t("corpCalAutomations")}</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">{stats.pendingAutomations}</p>
          <p className="text-xs text-gray-500">{t("corpCalAutomationHint")}</p>
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-gray-900">{t("corpCalAlignmentTitle")}</h3>
        <p className="mt-2 text-sm text-gray-600">{t("corpCalAlignmentBody")}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline">
            <Link to="/calendar/view">{t("corpCalOpenCalendar")}</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link to="/calendar/schedules">{t("corpCalOpenAutomations")}</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link to="/hr/leave">{t("corpCalOpenLeave")}</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link to="/projects">{t("corpCalOpenProjects")}</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
