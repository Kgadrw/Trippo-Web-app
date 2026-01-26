import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  FileText,
  Settings,
  Calendar,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks/useTranslation";
import { usePinAuth } from "@/hooks/usePinAuth";
import { useToast } from "@/hooks/use-toast";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
    { icon: Settings, label: t("settings"), path: "/settings" },
  ];
};

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t, language } = useTranslation();
  const { clearAuth } = usePinAuth();
  const { clearUser } = useCurrentUser();
  const { toast } = useToast();
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const menuItems = getMenuItems(t);

  const handleLogoutClick = () => {
    setLogoutDialogOpen(true);
  };

  const handleLogoutConfirm = async () => {
    try {
      // Clear IndexedDB
      const { clearStore } = await import("@/lib/indexedDB");
      await clearStore("products");
      await clearStore("sales");
      await clearStore("clients");
      await clearStore("schedules");
      await clearStore("settings");
      await clearStore("syncQueue");
    } catch (error) {
      console.error("Error clearing IndexedDB on logout:", error);
    }

    // Clear authentication state
    clearAuth();
    clearUser();
    
    // Clear user ID
    localStorage.removeItem("profit-pilot-user-id");
    
    // Clear session storage
    sessionStorage.clear();
    
    // Show logout confirmation
    toast({
      title: t("logout"),
      description: language === "rw" 
        ? "Wagiye neza." 
        : "You have been successfully logged out.",
    });
    
    // Redirect to homepage
    navigate("/");
    setLogoutDialogOpen(false);
  };

  return (
    <>
      <nav 
        className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 lg:hidden"
        style={{ 
          paddingBottom: 'max(1rem, calc(env(safe-area-inset-bottom) + 0.5rem))',
        }}
      >
        <div className="flex items-center justify-around h-16 px-2">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors",
                  isActive 
                    ? "text-blue-600" 
                    : "text-gray-500 hover:text-gray-700"
                )}
              >
                <div className="relative">
                  <item.icon 
                    size={22} 
                    className={cn(
                      "transition-colors",
                      isActive ? "text-blue-600" : "text-gray-500"
                    )} 
                  />
                  {item.showNew && item.path === "/schedules" && (
                    <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-bold px-1 rounded">
                      NEW
                    </span>
                  )}
                </div>
                <span className={cn(
                  "text-xs font-medium transition-colors",
                  isActive ? "text-blue-600" : "text-gray-500"
                )}>
                  {item.label}
                </span>
              </Link>
            );
          })}
          
          {/* Logout Button */}
          <button
            onClick={handleLogoutClick}
            className="flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors text-red-600 hover:text-red-800 hover:bg-red-50"
          >
            <LogOut size={22} className="transition-colors" />
            <span className="text-xs font-medium transition-colors">
              {t("logout")}
            </span>
          </button>
        </div>
      </nav>

      {/* Logout Confirmation Dialog */}
      <AlertDialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("logout")}</AlertDialogTitle>
            <AlertDialogDescription>
              {language === "rw"
                ? "Uzi neza ko ushaka gusohoka? Uzakenera kwinjira nanone kugirango wongere kugera kuri dashboard yawe."
                : "Are you sure you want to logout? You will need to login again to access your dashboard."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{language === "rw" ? "Guhagarika" : "Cancel"}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLogoutConfirm}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {t("logout")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
