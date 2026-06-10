import { cn } from "@/lib/utils";

type TableBreakpoint = "md" | "lg";

const breakpointClasses: Record<TableBreakpoint, { desktop: string; mobile: string }> = {
  md: { desktop: "hidden md:block", mobile: "md:hidden" },
  lg: { desktop: "hidden lg:block", mobile: "lg:hidden" },
};

type MobileListCardProps = {
  children: React.ReactNode;
  className?: string;
  index?: number;
};

export function MobileListCard({ children, className, index }: MobileListCardProps) {
  return (
    <div
      className={cn(
        "border-b border-gray-200 px-4 py-3",
        index != null && index % 2 === 1 && "bg-gray-50",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function DesktopDataTable({
  children,
  className,
  breakpoint = "md",
}: {
  children: React.ReactNode;
  className?: string;
  breakpoint?: TableBreakpoint;
}) {
  return (
    <div className={cn(breakpointClasses[breakpoint].desktop, "overflow-x-auto", className)}>
      {children}
    </div>
  );
}

export function MobileDataList({
  children,
  className,
  breakpoint = "md",
}: {
  children: React.ReactNode;
  className?: string;
  breakpoint?: TableBreakpoint;
}) {
  return (
    <div
      className={cn(
        breakpointClasses[breakpoint].mobile,
        "divide-y divide-gray-200 border-t border-gray-200",
        className,
      )}
    >
      {children}
    </div>
  );
}
