import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type ReportChartCardProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
  titleClassName?: string;
};

export function ReportChartCard({
  title,
  subtitle,
  children,
  className,
  action,
  titleClassName,
}: ReportChartCardProps) {
  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className={cn("text-sm font-semibold text-gray-800", titleClassName)}>{title}</h3>
          {subtitle ? <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div>{children}</div>
    </div>
  );
}
