import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LogOut,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import {
  SidebarDashboardIcon,
  SidebarServicesIcon,
  SidebarWorkersIcon,
  SidebarSalesIcon,
  SidebarExpensesIcon,
  SidebarReportsIcon,
  SidebarBillingIcon,
  SidebarSettingsIcon,
} from "./sidebar-nav-icons";
import { cn } from "@/lib/utils";
import { usePinAuth } from "@/hooks/usePinAuth";
import { useToast } from "@/hooks/use-toast";
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
import { useTranslation } from "@/hooks/useTranslation";
import { useSubdomain } from "@/hooks/useSubdomain";
import { PlusBanner } from "@/components/dashboard/PlusBanner";
import { clearAllStores } from '@/lib/indexedDB';

type SidebarMenuItem = {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  path: string;
};

const getMenuItems = (t: (key: string) => string): SidebarMenuItem[] => [
  { icon: SidebarDashboardIcon, label: t("dashboard"), path: "/dashboard" },
  { icon: SidebarServicesIcon, label: t("services"), path: "/products" },
  { icon: SidebarWorkersIcon, label: t("workers"), path: "/barbers" },
  { icon: SidebarSalesIcon, label: t("sales"), path: "/sales" },
  { icon: SidebarExpensesIcon, label: t("expenses"), path: "/expenses" },
  { icon: SidebarReportsIcon, label: t("reports"), path: "/reports" },
  { icon: SidebarBillingIcon, label: t("billing"), path: "/billing" },
  { icon: SidebarSettingsIcon, label: t("settings"), path: "/settings" },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  onMobileClose?: () => void;
  onMobileToggle?: () => void;
  onHoverChange?: (isHovered: boolean) => void;
  mobileExpanded?: boolean;
}

export function Sidebar({ collapsed, onToggle, onMobileClose, onMobileToggle, onHoverChange, mobileExpanded = false }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { clearAuth } = usePinAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const subdomain = useSubdomain();
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [menuItems, setMenuItems] = useState(getMenuItems(t));
  const [isHovered, setIsHovered] = useState(false);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  
  // Detect mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);
  
  // Determine if sidebar should appear expanded (hover overrides collapsed state on desktop)
  // On mobile, use mobileExpanded state
  const isExpanded = isMobile ? mobileExpanded : (isHovered || !collapsed);
  
  const [prevIsExpanded, setPrevIsExpanded] = useState(isExpanded);

  // Minimum swipe distance
  const minSwipeDistance = 50;

  // Update menu items when language changes
  useEffect(() => {
    setMenuItems(getMenuItems(t));
  }, [t]);

  const handleNavClick = () => {
    // Close mobile menu when navigating on mobile
    if (window.innerWidth < 1024 && onMobileClose) {
      onMobileClose();
    }
  };

  const handleLogoutClick = () => {
    // Close mobile menu when clicking logout on mobile
    if (window.innerWidth < 1024 && onMobileClose) {
      onMobileClose();
    }
    setLogoutDialogOpen(true);
  };

  const handleLogoutConfirm = async () => {
    // Clear authentication state
    clearAuth();
    
    // Clear user ID and all user data
    localStorage.removeItem("profit-pilot-user-id");
    localStorage.removeItem("profit-pilot-user-name");
    localStorage.removeItem("profit-pilot-user-email");
    localStorage.removeItem("profit-pilot-business-name");
    localStorage.removeItem("profit-pilot-is-admin");
    localStorage.removeItem("profit-pilot-authenticated");
    
    // Clear session storage completely
    sessionStorage.clear();
    
    // Clear IndexedDB data (for complete data isolation)
    try {
      /* converted to static import */;
      await clearAllStores();
    } catch (error) {
      console.error("Error clearing IndexedDB on logout:", error);
    }
    
    // Dispatch authentication change event
    window.dispatchEvent(new Event("pin-auth-changed"));
    
    // Show logout confirmation
    toast({
      title: t("loggedOutTitle"),
      description: t("loggedOutDescWithData"),
    });
    
    // Clear browser history and redirect to homepage
    // This prevents back button from accessing protected pages
    window.history.replaceState(null, "", "/");
    
    setLogoutDialogOpen(false);
    
    // Navigate to home page (don't force reload immediately to allow login)
    navigate("/", { replace: true });
  };

  useEffect(() => {
    setPrevIsExpanded(isExpanded);
  }, [isExpanded]);

  // Handle touch start for swipe detection
  const onTouchStart = (e: React.TouchEvent) => {
    // Only handle on mobile
    if (window.innerWidth >= 1024) return;
    
    setTouchEnd(null);
    setTouchStart({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    });
  };

  // Handle touch move for swipe detection
  const onTouchMove = (e: React.TouchEvent) => {
    // Only handle on mobile
    if (window.innerWidth >= 1024) return;
    
    setTouchEnd({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    });
  };

  // Handle touch end and detect swipe to close
  const onTouchEnd = () => {
    // Only handle on mobile
    if (window.innerWidth >= 1024) return;
    
    if (!touchStart || !touchEnd) return;

    const distanceX = touchStart.x - touchEnd.x;
    const distanceY = touchStart.y - touchEnd.y;
    const isLeftSwipe = distanceX > minSwipeDistance;
    const isVerticalSwipe = Math.abs(distanceY) > Math.abs(distanceX);

    // Only handle horizontal swipes
    if (isVerticalSwipe) return;

    // Swipe from right edge of sidebar (within 30px from right) to left to close
    const sidebarWidth = 208; // w-52
    if (isLeftSwipe && touchStart.x > sidebarWidth - 30 && onMobileClose) {
      onMobileClose();
    }
  };

  return (
    <aside
      className={cn(
        "hidden lg:flex fixed z-50 bg-sidebar transition-all duration-300 flex-col shadow-lg",
        "left-0 top-0 h-screen",
        // Desktop: based on expanded state
        isExpanded ? "w-52" : "w-14",
        "lg:shadow-none"
      )}
      onMouseEnter={() => {
        // Only auto-expand on desktop when collapsed (not on mobile)
        if (window.innerWidth >= 1024 && collapsed && !isMobile) {
          setIsHovered(true);
          onHoverChange?.(true);
        }
      }}
      onMouseLeave={() => {
        // Only auto-collapse on desktop if it was auto-expanded (not on mobile)
        if (window.innerWidth >= 1024 && !isMobile) {
          setIsHovered(false);
          onHoverChange?.(false);
        }
      }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{ touchAction: 'pan-y' }}
    >
      {/* Logo */}
        <div
          className={cn(
            "flex bg-sidebar shrink-0",
            isExpanded
              ? "items-center justify-between h-14 px-3"
              : "flex-col items-center gap-1.5 py-2 px-1",
          )}
        >
        {isExpanded ? (
          <div className="flex items-center gap-1.5 min-w-0">
            <img
              src="/logo.png"
              alt="Trippo Logo"
              className="h-8 w-8 object-contain shrink-0"
            />
            <span className="text-xl font-normal text-white lowercase truncate">trippo</span>
          </div>
        ) : (
          <img
            src="/logo.png"
            alt="Trippo Logo"
            className="h-8 w-8 object-contain"
          />
        )}
        <button
          onClick={onToggle}
          className={cn(
            "p-1.5 hover:bg-white/20 text-white/90 hover:text-white transition-colors rounded",
            isMobile ? "block" : "hidden lg:block",
          )}
          title={
            isMobile
              ? mobileExpanded
                ? "Collapse sidebar"
                : "Expand sidebar"
              : collapsed
                ? "Expand sidebar"
                : "Collapse sidebar"
          }
        >
          {isMobile ? (
            mobileExpanded ? (
              <ChevronsLeft size={18} />
            ) : (
              <ChevronsRight size={18} />
            )
          ) : collapsed ? (
            <ChevronsRight size={18} />
          ) : (
            <ChevronsLeft size={18} />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-1.5 py-2 xl:py-4 overflow-y-auto scrollbar-thin min-h-0">
        <div className="space-y-1.5 xl:space-y-2">
          {menuItems.map((item) => {
            const isDashboardItem = item.path === "/dashboard";
            const isDashboardSubdomainRoot =
              subdomain === "dashboard" && location.pathname === "/";
            const isActive =
              location.pathname === item.path ||
              (isDashboardItem && isDashboardSubdomainRoot);
            const dashboardPath =
              isDashboardItem && subdomain === "dashboard" ? "/" : item.path;

            return (
              <Link
                key={item.path}
                to={dashboardPath}
                onClick={handleNavClick}
                className={cn(
                  "sidebar-item w-full",
                  isActive && "sidebar-item-active",
                  !isExpanded && "justify-center px-0",
                )}
                title={!isExpanded ? item.label : undefined}
              >
                <item.icon
                  size={20}
                  className={isActive ? "text-white" : "text-white/85"}
                />
                {isExpanded && (
                  <span
                    className={cn(
                      "flex-1",
                      isActive ? "text-white" : "text-white/90",
                      isMobile
                        ? "text-sm font-normal"
                        : "text-base font-normal max-xl:text-sm max-xl:leading-snug",
                    )}
                  >
                    {item.label}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      <PlusBanner variant="sidebar" expanded={isExpanded} />

      {/* Logout */}
        <div className="p-1.5 xl:p-2 shrink-0">
        <button
          onClick={handleLogoutClick}
          className={cn(
            "sidebar-item w-full font-normal hover:bg-red-500/20 hover:text-red-200 transition-colors text-white/90",
            !isExpanded && "justify-center px-0"
          )}
          title={!isExpanded ? t("logout") : undefined}
        >
          <LogOut size={20} className="shrink-0 max-xl:h-[18px] max-xl:w-[18px]" />
                 {isExpanded && (
                   <span className={cn(
                     isMobile ? "text-sm font-normal" : "text-base font-normal max-xl:text-sm max-xl:leading-snug"
                   )}>{t("logout")}</span>
                 )}
        </button>
      </div>

      <div
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-px bg-white/25"
        aria-hidden
      />

      {/* Logout Confirmation Dialog */}
      <AlertDialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
                 <AlertDialogTitle>{t("logout")}</AlertDialogTitle>
                 <AlertDialogDescription>
                   {t("logoutConfirmDesc")}
                 </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLogoutConfirm}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {t("logout")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </aside>
  );
}
