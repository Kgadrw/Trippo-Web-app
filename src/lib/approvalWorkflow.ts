export type ApprovalStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "rejected"
  | "changes_requested";

export type ApprovalFields = {
  approvalStatus?: ApprovalStatus;
  submittedByName?: string;
  submittedByUserId?: string;
  approvedByName?: string;
  approvedAt?: string;
  rejectionNote?: string;
};

export function isApprovedForReporting(record?: { approvalStatus?: string | null }) {
  const status = record?.approvalStatus;
  return !status || status === "approved";
}

export function approvalStatusLabel(status?: string | null) {
  switch (status) {
    case "pending_approval":
      return "Pending approval";
    case "rejected":
      return "Rejected";
    case "changes_requested":
      return "Changes requested";
    case "draft":
      return "Draft";
    case "approved":
    default:
      return "Approved";
  }
}

export function approvalStatusClass(status?: string | null) {
  switch (status) {
    case "pending_approval":
      return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/25 dark:text-amber-200 dark:border-amber-500/40";
    case "rejected":
      return "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/25 dark:text-red-200 dark:border-red-500/40";
    case "changes_requested":
      return "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-500/25 dark:text-orange-200 dark:border-orange-500/40";
    case "draft":
      return "bg-gray-50 text-gray-600 border-gray-200 dark:bg-white/10 dark:text-zinc-200 dark:border-transparent";
    default:
      return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/25 dark:text-emerald-200 dark:border-emerald-500/40";
  }
}

export function shouldShowApprovalStatus(status?: string | null) {
  return Boolean(status && status !== "approved");
}

export function canRequesterEditApproval(status?: string | null) {
  return status === "rejected" || status === "changes_requested" || status === "draft";
}

export function canResubmitApproval(status?: string | null) {
  return status === "rejected" || status === "changes_requested" || status === "draft";
}

export type ApprovalQueueItem = {
  entityType: "expense" | "bill" | "payroll" | "team_report" | "project_close" | "deadline_extension";
  id: string;
  title: string;
  amount: number | null;
  date?: string;
  dueDate?: string;
  paymentDate?: string;
  approvalStatus: ApprovalStatus;
  submittedByName?: string;
  submittedByUserId?: string;
  submittedAt?: string;
  rejectionNote?: string;
  category?: string;
  vendor?: string;
  employeeName?: string;
  period?: string;
  status?: string;
  reportType?: "daily" | "weekly" | "monthly";
  reportTo?: string[];
  canApprove?: boolean;
  proposedEndDate?: string;
  originalEndDate?: string;
  note?: string;
  responseNote?: string;
  projectApprovalId?: string;
  projectName?: string;
};

export function entityTypeLabel(entityType: ApprovalQueueItem["entityType"]) {
  switch (entityType) {
    case "expense":
      return "Expense";
    case "bill":
      return "Bill";
    case "payroll":
      return "Payroll";
    case "team_report":
      return "Team report";
    case "project_close":
      return "Close project";
    case "deadline_extension":
      return "Deadline extension";
  }
}

export function financePathForEntity(entityType: ApprovalQueueItem["entityType"]) {
  switch (entityType) {
    case "expense":
      return "/finance/expenditure";
    case "bill":
      return "/finance/bills";
    case "payroll":
      return "/finance/payroll";
    case "team_report":
      return "/reports";
    case "project_close":
    case "deadline_extension":
      return "/team";
  }
}
