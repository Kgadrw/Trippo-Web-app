import {
  Home,
  Briefcase,
  Archive,
  UserRound,
  CalendarClock,
  BadgeDollarSign,
  HandCoins,
  BarChart3,
  Receipt,
  SlidersHorizontal,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type SidebarNavIconProps = {
  className?: string;
  size?: number;
};

function SidebarIcon({
  icon: Icon,
  className,
  size = 20,
}: SidebarNavIconProps & { icon: LucideIcon }) {
  return (
    <Icon
      size={size}
      strokeWidth={1.75}
      className={cn("shrink-0 max-xl:h-[18px] max-xl:w-[18px]", className)}
    />
  );
}

export function SidebarDashboardIcon(props: SidebarNavIconProps) {
  return <SidebarIcon icon={Home} {...props} />;
}

export function SidebarServicesIcon(props: SidebarNavIconProps) {
  return <SidebarIcon icon={Briefcase} {...props} />;
}

export function SidebarInventoriesIcon(props: SidebarNavIconProps) {
  return <SidebarIcon icon={Archive} {...props} />;
}

export function SidebarWorkersIcon(props: SidebarNavIconProps) {
  return <SidebarIcon icon={UserRound} {...props} />;
}

export function SidebarBookingsIcon(props: SidebarNavIconProps) {
  return <SidebarIcon icon={CalendarClock} {...props} />;
}

export function SidebarSalesIcon(props: SidebarNavIconProps) {
  return <SidebarIcon icon={BadgeDollarSign} {...props} />;
}

export function SidebarExpensesIcon(props: SidebarNavIconProps) {
  return <SidebarIcon icon={HandCoins} {...props} />;
}

export function SidebarReportsIcon(props: SidebarNavIconProps) {
  return <SidebarIcon icon={BarChart3} {...props} />;
}

export function SidebarBillingIcon(props: SidebarNavIconProps) {
  return <SidebarIcon icon={Receipt} {...props} />;
}

export function SidebarSettingsIcon(props: SidebarNavIconProps) {
  return <SidebarIcon icon={SlidersHorizontal} {...props} />;
}
