import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  FileText,
  Wallet,
  UserRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks/useTranslation";
import { useSubdomain } from "@/hooks/useSubdomain";

const getMenuItems = (t: (key: string) => string, language: string) => {
  return [
    { icon: LayoutDashboard, label: t("dashboard"), path: "/dashboard" },
    { 
      icon: Package, 
      label: language === "rw" ? "Serivisi" : language === "fr" ? "Services" : "Services",
      path: "/products" 
    },
    { 
      icon: UserRound, 
      label: language === "rw" ? "Umwogoshi" : language === "fr" ? "Coiffeurs" : "Barbers",
      path: "/barbers" 
    },
    { icon: ShoppingCart, label: t("sales"), path: "/sales" },
    { 
      icon: Wallet, 
      label: language === "rw" ? "Ibikiguzi" : language === "fr" ? "Dépenses" : "Expenses",
      path: "/expenses" 
    },
    { icon: FileText, label: t("reports"), path: "/reports" },
  ];
};

export function BottomNav() {
  const location = useLocation();
  const { t, language } = useTranslation();
  const subdomain = useSubdomain();
  const menuItems = getMenuItems(t, language);

  return (
    <>
      <nav 
        className="fixed bottom-4 left-3 right-3 z-40 rounded-2xl border border-blue-500/40 bg-blue-600 shadow-md shadow-blue-900/20 lg:hidden"
        style={{ 
          paddingBottom: 'max(0.5rem, calc(env(safe-area-inset-bottom) + 0.25rem))',
        }}
      >
        <div className="flex h-14 items-center justify-around px-1.5">
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
                  "flex flex-1 flex-col items-center justify-center gap-0.5 py-1.5 transition-all duration-300 ease-in-out relative",
                  isActive 
                    ? "text-white" 
                    : "text-blue-200/90 hover:text-white"
                )}
              >
                <div className="relative">
                  <item.icon 
                    size={20} 
                    fill={isActive ? "currentColor" : "none"}
                    className={cn(
                      "transition-all duration-300 ease-in-out",
                      isActive 
                        ? "scale-105 text-white" 
                        : "scale-100 text-blue-200"
                    )} 
                  />
                </div>
                <span className={cn(
                  "text-[11px] leading-tight transition-all duration-300 ease-in-out",
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
