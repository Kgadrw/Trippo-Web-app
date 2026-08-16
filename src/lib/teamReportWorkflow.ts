export type TeamReportType = "daily" | "weekly" | "monthly";
export type TeamReportStatus = "submitted" | "reviewed" | "changes_requested" | "rejected";

export type TeamReportRecord = {
  id?: string;
  _id?: string;
  submitterUserId?: string;
  submitterName: string;
  title: string;
  reportType: TeamReportType;
  periodStart: string;
  periodEnd: string;
  accomplishments: string;
  blockers?: string;
  nextSteps?: string;
  attachmentUrl?: string;
  attachmentName?: string;
  reportTo?: Array<{
    memberId: string;
    userId?: string;
    name: string;
  }>;
  canReview?: boolean;
  status: TeamReportStatus;
  reviewedByName?: string;
  reviewedAt?: string;
  reviewNote?: string;
  createdAt?: string;
  updatedAt?: string;
};

export function teamReportId(record: TeamReportRecord): string {
  return String(record._id ?? record.id ?? "");
}

export function teamReportTypeLabel(type: TeamReportType | string | undefined) {
  if (type === "monthly") return "Monthly";
  if (type === "weekly") return "Weekly";
  return "Daily";
}

export function teamReportStatusLabel(status: TeamReportStatus | string | undefined) {
  const map: Record<string, string> = {
    submitted: "Submitted",
    reviewed: "Reviewed",
    changes_requested: "Changes requested",
    rejected: "Rejected",
  };
  return map[status || "submitted"] || status || "Submitted";
}

export function teamReportStatusClass(status: TeamReportStatus | string | undefined) {
  switch (status) {
    case "reviewed":
      return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/25 dark:text-emerald-200 dark:border-emerald-500/40";
    case "rejected":
      return "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/25 dark:text-red-200 dark:border-red-500/40";
    case "changes_requested":
      return "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-500/25 dark:text-orange-200 dark:border-orange-500/40";
    default:
      return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/25 dark:text-amber-200 dark:border-amber-500/40";
  }
}

export function canEditTeamReport(status: TeamReportStatus | string | undefined) {
  return status === "changes_requested" || status === "rejected";
}

export function formatReportPeriod(start?: string, end?: string) {
  const startDate = start ? new Date(start) : null;
  const endDate = end ? new Date(end) : null;
  const fmt = (d: Date | null) =>
    d && !Number.isNaN(d.getTime())
      ? d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
      : "—";
  if (startDate && endDate && startDate.toDateString() === endDate.toDateString()) {
    return fmt(startDate);
  }
  return `${fmt(startDate)} → ${fmt(endDate)}`;
}

export function defaultPeriodForType(type: TeamReportType): { start: string; end: string } {
  const end = new Date();
  const start = new Date(end);
  if (type === "weekly") {
    start.setDate(start.getDate() - 6);
  }
  if (type === "monthly") {
    start.setDate(1);
  }
  const toInput = (d: Date) => d.toISOString().slice(0, 10);
  return { start: toInput(start), end: toInput(end) };
}
