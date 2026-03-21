import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  FileText,
  Mail,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks/useTranslation";
import { useSubdomain } from "@/hooks/useSubdomain";

const getMenuItems = (t: (key: string) => string) => {
  // Calculate if NEW banner should show (for one month from today)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const oneMonthLater = new Date(today);
  oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);
  const showNewBanner = new Date() <= oneMonthLater;
  
  return [
    { icon: LayoutDashboard, label: t("dashboard"), path: "/dashboard" },
    { icon: Package, label: t("products"), path: "/products" },
    { icon: ShoppingCart, label: t("sales"), path: "/sales" },
    { icon: Mail, label: "Automate", path: "/schedules", showNew: showNewBanner },
    { icon: FileText, label: t("reports"), path: "/reports" },
  ];
};

export function BottomNav() {
  const location = useLocation();
  const { t, language } = useTranslation();
  const subdomain = useSubdomain();
  const menuItems = getMenuItems(t);

  return (
    <>
      <nav 
        className="fixed bottom-3 left-3 right-3 z-40 rounded-2xl border border-blue-500/40 bg-blue-600 shadow-md shadow-blue-900/20 lg:hidden"
        style={{ 
          paddingBottom: 'max(0.35rem, calc(env(safe-area-inset-bottom) + 0.15rem))',
        }}
      >
        <div className="flex h-11 items-center justify-around px-1">
          {menuItems.map((item) => {
            // For dashboard item: active if path matches OR if on dashboard subdomain root
            const isDashboardItem = item.path === "/dashboard";
            const isDashboardSubdomainRoot = subdomain === 'dashboard' && location.pathname === "/";
            const isActive = location.pathname === item.path || (isDashboardItem && isDashboardSubdomainRoot);
            
            // For dashboard item on dashboard subdomain, navigate to "/" (homepage)
            // Otherwise, use the normal path
            const dashboardPath = isDashboardItem && subdomain === 'dashboard' ? "/" : item.path;
            
            return (
              <Link
                key={item.path}
                to={dashboardPath}
                className={cn(
                  "flex flex-1 flex-col items-center justify-center gap-0.5 py-1 transition-all duration-300 ease-in-out relative",
                  isActive 
                    ? "text-white" 
                    : "text-blue-200/90 hover:text-white"
                )}
              >
                <div className="relative">
                  <item.icon 
                    size={18} 
                    fill={isActive ? "currentColor" : "none"}
                    className={cn(
                      "transition-all duration-300 ease-in-out",
                      isActive 
                        ? "scale-105 text-white" 
                        : "scale-100 text-blue-200"
                    )} 
                  />
                  {item.showNew && item.path === "/schedules" && (
                    <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-bold px-1 rounded">
                      NEW
                    </span>
                  )}
                </div>
                <span className={cn(
                  "text-[10px] leading-tight transition-all duration-300 ease-in-out",
                  isActive 
                    ? "font-bold text-white" 
                    : "font-medium text-blue-200"
                )}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
