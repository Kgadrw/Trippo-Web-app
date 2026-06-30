export type LeaveType = "annual" | "sick" | "unpaid" | "personal" | "other";
export type LeaveStatus = "pending" | "approved" | "rejected" | "cancelled";

export type LeaveRequestRecord = {
  id?: string;
  _id?: string;
  teamMemberId?: string;
  requesterUserId?: string;
  requesterName: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  reason?: string;
  status: LeaveStatus;
  reviewedByName?: string;
  reviewedAt?: string;
  rejectionNote?: string;
  dayCount?: number;
  createdAt?: string;
};

export function leaveId(record: LeaveRequestRecord): string {
  return String(record._id ?? record.id ?? "");
}

export function leaveTypeLabel(type: LeaveType | string | undefined) {
  const map: Record<string, string> = {
    annual: "Annual leave",
    sick: "Sick leave",
    unpaid: "Unpaid leave",
    personal: "Personal leave",
    other: "Other",
  };
  return map[type || "annual"] || type || "Leave";
}

export function leaveStatusLabel(status: LeaveStatus | string | undefined) {
  const map: Record<string, string> = {
    pending: "Pending",
    approved: "Approved",
    rejected: "Rejected",
    cancelled: "Cancelled",
  };
  return map[status || "pending"] || status || "Pending";
}

export function leaveStatusClass(status: LeaveStatus | string | undefined) {
  switch (status) {
    case "approved":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "rejected":
      return "bg-red-50 text-red-700 border-red-200";
    case "cancelled":
      return "bg-gray-50 text-gray-600 border-gray-200";
    default:
      return "bg-amber-50 text-amber-700 border-amber-200";
  }
}

export function formatLeaveRange(startDate: string, endDate: string, dayCount?: number) {
  const start = startDate?.split("T")[0] || startDate;
  const end = endDate?.split("T")[0] || endDate;
  if (start === end) {
    return dayCount ? `${start} (${dayCount} day)` : start;
  }
  return dayCount ? `${start} → ${end} (${dayCount} days)` : `${start} → ${end}`;
}
