import { cn } from "@/lib/utils";
import {
  approvalStatusClass,
  approvalStatusLabel,
  shouldShowApprovalStatus,
} from "@/lib/approvalWorkflow";

type ApprovalStatusBadgeProps = {
  status?: string | null;
  className?: string;
};

export function ApprovalStatusBadge({ status, className }: ApprovalStatusBadgeProps) {
  if (!shouldShowApprovalStatus(status)) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
        approvalStatusClass(status),
        className,
      )}
    >
      {approvalStatusLabel(status)}
    </span>
  );
}
