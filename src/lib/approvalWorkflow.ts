export type ApprovalStatus = "draft" | "pending_approval" | "approved" | "rejected";

export type ApprovalFields = {
  approvalStatus?: ApprovalStatus;
  submittedByName?: string;
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
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "rejected":
      return "bg-red-50 text-red-700 border-red-200";
    case "draft":
      return "bg-gray-50 text-gray-600 border-gray-200";
    default:
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }
}

export function shouldShowApprovalStatus(status?: string | null) {
  return Boolean(status && status !== "approved");
}

export type ApprovalQueueItem = {
  entityType: "expense" | "bill" | "payroll";
  id: string;
  title: string;
  amount: number;
  date?: string;
  dueDate?: string;
  paymentDate?: string;
  approvalStatus: ApprovalStatus;
  submittedByName?: string;
  submittedAt?: string;
  rejectionNote?: string;
  category?: string;
  vendor?: string;
  employeeName?: string;
  period?: string;
  status?: string;
};

export function entityTypeLabel(entityType: ApprovalQueueItem["entityType"]) {
  switch (entityType) {
    case "expense":
      return "Expense";
    case "bill":
      return "Bill";
    case "payroll":
      return "Payroll";
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
  }
}
