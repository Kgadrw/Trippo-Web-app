import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { teamMemberApi, leaveRequestApi, type TeamMemberRecord } from "@/lib/api";
import { useTranslation } from "@/hooks/useTranslation";
import { Button } from "@/components/ui/button";
import { HelpTip } from "@/components/ui/help-tip";
import { Loader2 } from "lucide-react";

export function HrOverviewTab() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [activeEmployeeCount, setActiveEmployeeCount] = useState(0);
  const [pendingLeaveCount, setPendingLeaveCount] = useState(0);

  const loadSummary = useCallback(async () => {
    setLoading(true);
    try {
      const [membersRes, leaveRes] = await Promise.all([
        teamMemberApi.getAll({ status: "active" }),
        leaveRequestApi.getSummary(),
      ]);
      setActiveEmployeeCount(((membersRes.data as TeamMemberRecord[]) || []).length);
      const leaveSummary = leaveRes.data as { pendingCount?: number };
      setPendingLeaveCount(leaveSummary?.pendingCount ?? 0);
    } catch {
      setActiveEmployeeCount(0);
      setPendingLeaveCount(0);
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

  return (
    <div className="space-y-5 p-4 lg:p-6">
      <div>
        <div className="flex items-center gap-1.5">
          <h2 className="text-lg font-semibold text-gray-900">{t("hrOverviewTitle")}</h2>
          <HelpTip text={t("helpHrOverview")} />
        </div>
        <p className="text-sm text-gray-500">{t("hrOverviewSubtitle")}</p>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">{t("hrActiveEmployees")}</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">{activeEmployeeCount}</p>
          <Button asChild variant="link" className="mt-2 h-auto p-0 text-sky-700">
            <Link to="/hr/people">{t("hrViewPeople")}</Link>
          </Button>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">{t("hrPendingLeaveRequests")}</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">{pendingLeaveCount}</p>
          <Button asChild variant="link" className="mt-2 h-auto p-0 text-sky-700">
            <Link to="/hr/leave">{t("hrOpenLeave")}</Link>
          </Button>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">{t("hrOrgChart")}</p>
          <p className="mt-2 text-sm text-gray-600">{t("hrOrgChartSubtitle")}</p>
          <Button asChild variant="link" className="mt-2 h-auto p-0 text-sky-700">
            <Link to="/hr/org-chart">{t("hrViewOrgChart")}</Link>
          </Button>
        </div>
      </section>

      <section className="rounded-lg border border-dashed border-gray-200 bg-gray-50/80 p-5">
        <p className="text-sm font-medium text-gray-800">{t("hrComingSoonTitle")}</p>
        <p className="mt-1 text-sm text-gray-600">{t("hrComingSoonBody")}</p>
        <ul className="mt-3 list-inside list-disc text-sm text-gray-600">
          <li>{t("hrComingSoonRecruitment")}</li>
          <li>{t("hrComingSoonAttendance")}</li>
          <li>{t("hrComingSoonContracts")}</li>
        </ul>
      </section>
    </div>
  );
}
