import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  FileText,
  Calendar,
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
    { icon: Calendar, label: "Schedules", path: "/schedules", showNew: showNewBanner },
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
        className="fixed bottom-4 left-4 right-4 z-40 bg-white/80 backdrop-blur-md border border-gray-200/50 lg:hidden rounded-3xl shadow-lg"
        style={{ 
          paddingBottom: 'max(0.5rem, calc(env(safe-area-inset-bottom) + 0.25rem))',
        }}
      >
        <div className="flex items-center justify-around h-14 px-2">
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
                  "flex flex-col items-center justify-center gap-1 flex-1 h-full transition-all duration-300 ease-in-out relative",
                  isActive 
                    ? "text-blue-600" 
                    : "text-gray-500 hover:text-gray-700"
                )}
              >
                <div className="relative">
                  <item.icon 
                    size={22} 
                    fill={isActive ? "currentColor" : "none"}
                    className={cn(
                      "transition-all duration-300 ease-in-out",
                      isActive 
                        ? "text-blue-600 scale-110" 
                        : "text-gray-500 scale-100"
                    )} 
                  />
                  {item.showNew && item.path === "/schedules" && (
                    <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-bold px-1 rounded">
                      NEW
                    </span>
                  )}
                </div>
                <span className={cn(
                  "text-xs transition-all duration-300 ease-in-out",
                  isActive 
                    ? "text-blue-600 font-bold" 
                    : "text-gray-500 font-medium"
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
