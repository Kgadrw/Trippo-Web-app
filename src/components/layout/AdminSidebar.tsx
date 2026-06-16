import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Users,
  Activity,
  UserCog,
  Bell,
  CreditCard,
  Globe,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { clearAppSession } from "@/lib/session";
import { getSubdomainUrl } from "@/hooks/useSubdomain";
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

type AdminNavItem = {
  icon: typeof LayoutDashboard;
  label: string;
  section: string;
};

type AdminNavGroup = {
  label: string;
  items: AdminNavItem[];
};

const adminMenuGroups: AdminNavGroup[] = [
  {
    label: "Dashboard",
    items: [{ icon: LayoutDashboard, label: "Overview", section: "overview" }],
  },
  {
    label: "Users & access",
    items: [
      { icon: Users, label: "Users", section: "users" },
      { icon: UserCog, label: "Accounts", section: "accounts" },
      { icon: Activity, label: "Activity", section: "activity" },
    ],
  },
  {
    label: "Operations",
    items: [
      { icon: Bell, label: "Notifications", section: "notifications" },
      { icon: CreditCard, label: "Payments", section: "payments" },
    ],
  },
  {
    label: "Content",
    items: [{ icon: Globe, label: "Homepage", section: "homepage" }],
  },
  {
    label: "System",
    items: [{ icon: Settings, label: "Settings", section: "settings" }],
  },
];

interface AdminSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  onMobileClose?: () => void;
  onMobileToggle?: () => void;
  onHoverChange?: (isHovered: boolean) => void;
  activeSection: string;
  onSectionChange: (section: string) => void;
  mobileExpanded?: boolean;
}

export function AdminSidebar({
  collapsed,
  onToggle,
  onMobileClose,
  onMobileToggle,
  onHoverChange,
  activeSection,
  onSectionChange,
  mobileExpanded = false,
}: AdminSidebarProps) {
  const { toast } = useToast();
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  const minSwipeDistance = 50;

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handleLogoutConfirm = () => {
    clearAppSession();
    setLogoutDialogOpen(false);

    toast({
      title: "Logged Out",
      description: "You have been signed out of the admin portal.",
    });

    window.location.replace(getSubdomainUrl("admin", "/login"));
  };

  const isExpanded = isMobile ? mobileExpanded : isHovered || !collapsed;

  const onTouchStart = (e: React.TouchEvent) => {
    if (window.innerWidth >= 1024) return;

    setTouchEnd(null);
    setTouchStart({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    });
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (window.innerWidth >= 1024) return;

    setTouchEnd({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    });
  };

  const onTouchEnd = () => {
    if (window.innerWidth >= 1024) return;
    if (!touchStart || !touchEnd) return;

    const distanceX = touchStart.x - touchEnd.x;
    const distanceY = touchStart.y - touchEnd.y;
    const isLeftSwipe = distanceX > minSwipeDistance;
    const isVerticalSwipe = Math.abs(distanceY) > Math.abs(distanceX);

    if (isVerticalSwipe) return;

    const sidebarWidth = 224;
    if (isLeftSwipe && touchStart.x > sidebarWidth - 30 && onMobileClose) {
      onMobileClose();
    }
  };

  return (
    <aside
      className={cn(
        "hidden lg:flex fixed z-50 bg-sidebar transition-all duration-300 flex-col",
        "left-0 top-0 h-screen",
        isExpanded ? "w-56" : "w-16",
      )}
      onMouseEnter={() => {
        if (window.innerWidth >= 1024 && collapsed && !isMobile) {
          setIsHovered(true);
          onHoverChange?.(true);
        }
      }}
      onMouseLeave={() => {
        if (window.innerWidth >= 1024 && !isMobile) {
          setIsHovered(false);
          onHoverChange?.(false);
        }
      }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{ touchAction: "pan-y" }}
    >
      <div
        className={cn(
          "flex items-center justify-between h-16 px-4 bg-sidebar",
          !isExpanded && "justify-start px-2",
        )}
      >
        {isExpanded && (
          <span className="text-lg font-normal text-white lowercase truncate">Admin</span>
        )}
        <div className="flex items-center gap-2">
          {onMobileToggle && (
            <button
              onClick={onMobileToggle}
              className="p-2 hover:bg-white/15 text-white/90 hover:text-white transition-colors rounded lg:hidden"
            >
              <Menu size={20} />
            </button>
          )}
          <button
            onClick={onToggle}
            className={cn(
              "p-2 hover:bg-white/15 text-white/90 hover:text-white transition-colors rounded",
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
              <ChevronLeft
                size={18}
                className={cn("transition-transform duration-300", mobileExpanded ? "rotate-180" : "rotate-0")}
              />
            ) : collapsed ? (
              <ChevronRight size={18} />
            ) : (
              <ChevronLeft size={18} />
            )}
          </button>
        </div>
      </div>

      <nav className="flex-1 px-2 py-4 space-y-4 overflow-y-auto scrollbar-thin">
        {adminMenuGroups.map((group) => (
          <div key={group.label} className="space-y-1">
            {isExpanded ? (
              <p className="px-3 pt-1 pb-1 text-[10px] font-normal uppercase tracking-wider text-white/45">
                {group.label}
              </p>
            ) : (
              <div className="h-px bg-white/10 mx-2 my-2 first:hidden" aria-hidden />
            )}
            {group.items.map((item) => {
              const isActive = activeSection === item.section;
              return (
                <button
                  key={item.section}
                  onClick={() => onSectionChange(item.section)}
                  className={cn(
                    "sidebar-item w-full",
                    isActive && "sidebar-item-active",
                    !isExpanded && "justify-start px-2",
                  )}
                  title={!isExpanded ? item.label : undefined}
                >
                  <item.icon
                    size={20}
                    strokeWidth={2.5}
                    className={isActive ? "text-white" : "text-white/85"}
                  />
                  {isExpanded && (
                    <span
                      className={cn(
                        "flex-1 text-left",
                        isActive ? "text-white" : "text-white/90",
                        isMobile ? "text-xs font-normal" : "text-sm font-normal",
                      )}
                    >
                      {item.label}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="p-2 border-t border-white/10">
        <button
          onClick={() => setLogoutDialogOpen(true)}
          className={cn(
            "sidebar-item w-full hover:bg-red-500/20 hover:text-red-200 transition-colors",
            !isExpanded && "justify-start px-2",
          )}
          title={!isExpanded ? "Logout" : undefined}
        >
          <LogOut size={20} className="text-white/85" />
          {isExpanded && (
            <span className={cn(isMobile ? "text-xs font-normal" : "text-sm font-normal", "text-left")}>
              Logout
            </span>
          )}
        </button>
      </div>

      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-px bg-white/15" aria-hidden />

      <AlertDialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out of admin?</AlertDialogTitle>
            <AlertDialogDescription>
              You will need to sign in again to access the admin dashboard.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogoutConfirm} className="bg-red-600 hover:bg-red-700 text-white">
              Sign out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </aside>
  );
}
