import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  teamMemberApi,
  type TeamMemberProfileData,
} from "@/lib/api";
import { useTranslation } from "@/hooks/useTranslation";
import { useToast } from "@/hooks/use-toast";
import { useWorkspaceCategories } from "@/hooks/useWorkspaceCategories";
import { formatCategoryLabel } from "@/lib/workspaceCategories";
import {
  employmentTypeLabel,
  formatHrDate,
  memberId,
  memberName,
} from "@/lib/hrProfile";
import {
  formatLeaveRange,
  leaveStatusClass,
  leaveStatusLabel,
  leaveTypeLabel,
} from "@/lib/leaveWorkflow";
import { formatCurrency } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Users } from "lucide-react";
import { cn } from "@/lib/utils";

type ProfileTab = "overview" | "leave" | "payroll";

export function TeamEmployeeProfileTab({ memberId: routeMemberId }: { memberId: string }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { categories: departmentCategories } = useWorkspaceCategories("department");
  const [profile, setProfile] = useState<TeamMemberProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<ProfileTab>("overview");

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const res = await teamMemberApi.getProfile(routeMemberId);
      setProfile((res.data as TeamMemberProfileData) || null);
    } catch {
      toast({ title: t("hrProfileLoadFailed"), variant: "destructive" });
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [routeMemberId, toast, t]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        {t("loading")}
      </div>
    );
  }

  if (!profile?.member) {
    return (
      <div className="space-y-4 p-4 lg:p-6">
        <Button asChild variant="outline" className="rounded-none">
          <Link to="/hr/people">
            <ArrowLeft size={16} className="mr-2" />
            {t("hrBackToPeople")}
          </Link>
        </Button>
        <p className="text-sm text-gray-500">{t("hrProfileNotFound")}</p>
      </div>
    );
  }

  const { member, manager, directReports, leaveBalances, recentLeave, recentPayroll, payrollTotal } =
    profile;

  const deptLabel = formatCategoryLabel(
    member.department || "general",
    departmentCategories,
    t,
    "department",
  );

  const tabs: Array<{ id: ProfileTab; label: string }> = [
    { id: "overview", label: t("hrTabOverview") },
    { id: "leave", label: t("hrTabLeave") },
    { id: "payroll", label: t("hrTabPayroll") },
  ];

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <Button asChild variant="outline" className="rounded-none border-gray-300">
        <Link to="/hr/people">
          <ArrowLeft size={16} className="mr-2" />
          {t("hrBackToPeople")}
        </Link>
      </Button>

      <div className="border border-gray-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{member.name}</h1>
            <p className="mt-1 text-sm text-gray-600">
              {[member.jobTitle, deptLabel].filter(Boolean).join(" · ") || deptLabel}
            </p>
            <p className="mt-1 text-xs capitalize text-gray-500">
              {member.status || "active"} · {employmentTypeLabel(member.employmentType, t)}
            </p>
          </div>
          <div className="text-right text-sm text-gray-600">
            {member.employeeNumber ? (
              <p>
                {t("hrEmployeeNumber")}: {member.employeeNumber}
              </p>
            ) : null}
            {member.email ? <p>{member.email}</p> : null}
            {member.phone ? <p>{member.phone}</p> : null}
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="border border-gray-100 bg-gray-50 p-3">
            <p className="text-xs uppercase tracking-wide text-gray-500">{t("hrHireDate")}</p>
            <p className="mt-1 text-sm font-medium text-gray-900">{formatHrDate(member.hireDate)}</p>
          </div>
          <div className="border border-gray-100 bg-gray-50 p-3">
            <p className="text-xs uppercase tracking-wide text-gray-500">{t("hrReportsTo")}</p>
            <p className="mt-1 text-sm font-medium text-gray-900">
              {manager ? (
                <Link to={`/hr/people/${memberId(manager)}`} className="text-sky-700 hover:underline">
                  {memberName(manager)}
                </Link>
              ) : (
                "—"
              )}
            </p>
          </div>
          <div className="border border-gray-100 bg-gray-50 p-3">
            <p className="text-xs uppercase tracking-wide text-gray-500">{t("hrAnnualLeave")}</p>
            <p className="mt-1 text-sm font-medium text-gray-900">
              {leaveBalances.annual.remaining} / {leaveBalances.annual.allowance} {t("hrDaysLeft")}
            </p>
          </div>
          <div className="border border-gray-100 bg-gray-50 p-3">
            <p className="text-xs uppercase tracking-wide text-gray-500">{t("hrSickLeave")}</p>
            <p className="mt-1 text-sm font-medium text-gray-900">
              {leaveBalances.sick.remaining} / {leaveBalances.sick.allowance} {t("hrDaysLeft")}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-gray-200">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cn(
              "border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              tab === item.id
                ? "border-sky-600 text-sky-700"
                : "border-transparent text-gray-500 hover:text-gray-800",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "overview" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="border border-gray-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-gray-900">{t("hrContactDetails")}</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">{t("hrLocation")}</dt>
                <dd className="text-gray-900">{member.location || "—"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">{t("hrEmergencyContact")}</dt>
                <dd className="text-right text-gray-900">
                  {member.emergencyContactName || member.emergencyContactPhone
                    ? [member.emergencyContactName, member.emergencyContactPhone].filter(Boolean).join(" · ")
                    : "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">{t("note")}</dt>
                <dd className="text-right text-gray-900">{member.notes || "—"}</dd>
              </div>
            </dl>
          </div>

          <div className="border border-gray-200 bg-white p-4">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-gray-500" />
              <h2 className="text-sm font-semibold text-gray-900">{t("hrDirectReports")}</h2>
            </div>
            {directReports.length === 0 ? (
              <p className="mt-3 text-sm text-gray-500">{t("hrNoDirectReports")}</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {directReports.map((report) => (
                  <li key={report._id}>
                    <Link
                      to={`/hr/people/${report._id}`}
                      className="text-sm font-medium text-sky-700 hover:underline"
                    >
                      {report.name}
                    </Link>
                    {report.jobTitle ? (
                      <span className="text-sm text-gray-500"> · {report.jobTitle}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}

      {tab === "leave" ? (
        <div className="border border-gray-200 bg-white">
          {recentLeave.length === 0 ? (
            <p className="p-6 text-sm text-gray-500">{t("hrNoLeaveHistory")}</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {recentLeave.map((leave) => (
                <div key={leave._id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {leaveTypeLabel(leave.leaveType)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatLeaveRange(leave.startDate, leave.endDate, leave.dayCount)}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "rounded-full border px-2.5 py-0.5 text-xs font-medium",
                      leaveStatusClass(leave.status),
                    )}
                  >
                    {leaveStatusLabel(leave.status)}
                  </span>
                </div>
              ))}
            </div>
          )}
          <div className="border-t border-gray-100 px-4 py-3">
            <Button asChild variant="outline" size="sm" className="rounded-none">
              <Link to="/hr/leave">{t("hrOpenLeave")}</Link>
            </Button>
          </div>
        </div>
      ) : null}

      {tab === "payroll" ? (
        <div className="space-y-4">
          <div className="border border-gray-200 bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">{t("hrRecentPayrollTotal")}</p>
            <p className="mt-1 text-lg font-semibold text-gray-900">{formatCurrency(payrollTotal)}</p>
          </div>
          <div className="border border-gray-200 bg-white">
            {recentPayroll.length === 0 ? (
              <p className="p-6 text-sm text-gray-500">{t("hrNoPayrollHistory")}</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {recentPayroll.map((row) => (
                  <div key={row._id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{row.period}</p>
                      <p className="text-xs text-gray-500">{formatHrDate(row.paymentDate)}</p>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">{formatCurrency(row.amount)}</p>
                  </div>
                ))}
              </div>
            )}
            <div className="border-t border-gray-100 px-4 py-3">
              <Button asChild variant="outline" size="sm" className="rounded-none">
                <Link to="/finance/payroll">{t("hrOpenPayroll")}</Link>
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
