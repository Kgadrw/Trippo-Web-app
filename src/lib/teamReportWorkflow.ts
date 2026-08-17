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
    submitted: "Waiting for review",
    reviewed: "Reviewed",
    changes_requested: "Changes requested",
    rejected: "Rejected",
  };
  return map[status || "submitted"] || status || "Waiting for review";
}

/** Status copy shown to the person who submitted the report. */
export function teamReportSubmitterStatusLabel(status: TeamReportStatus | string | undefined) {
  switch (status) {
    case "reviewed":
      return "Reviewed";
    case "rejected":
      return "Rejected";
    case "changes_requested":
      return "Changes requested";
    default:
      return "Waiting for review";
  }
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

/** Only the submitter can edit — locked once reviewed. */
export function canEditTeamReport(status: TeamReportStatus | string | undefined) {
  return status === "submitted" || status === "changes_requested" || status === "rejected";
}

/** After changes/rejection, saving should resubmit into the review queue. */
export function shouldResubmitTeamReport(status: TeamReportStatus | string | undefined) {
  return status === "changes_requested" || status === "rejected";
}

/** Only the submitter can delete — allowed in any status (including reviewed). */
export function canDeleteTeamReport(_status?: TeamReportStatus | string) {
  return true;
}

/** True when the current user is listed in this report's "Reporting to" recipients. */
export function isTeamReportRecipient(
  report: TeamReportRecord,
  userId: string | null | undefined,
  myMemberId?: string | null,
) {
  const recipients = report.reportTo || [];
  if (!recipients.length) return false;
  return recipients.some((recipient) => {
    if (userId && recipient.userId && String(recipient.userId) === String(userId)) {
      return true;
    }
    if (myMemberId && String(recipient.memberId) === String(myMemberId)) {
      return true;
    }
    return false;
  });
}

/** Review / request changes / reject — only for people this report was sent to. */
export function canReviewTeamReport(
  report: TeamReportRecord,
  userId: string | null | undefined,
  myMemberId?: string | null,
) {
  return isTeamReportRecipient(report, userId, myMemberId);
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
