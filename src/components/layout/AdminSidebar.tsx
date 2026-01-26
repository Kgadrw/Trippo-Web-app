import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Activity,
  Server,
  Calendar,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
} from "lucide-react";
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

const adminMenuItems = [
  { icon: LayoutDashboard, label: "Overview", section: "overview" },
  { icon: Users, label: "Users", section: "users" },
  { icon: Activity, label: "Activity", section: "activity" },
  { icon: Calendar, label: "Schedules", section: "schedules" },
  { icon: Server, label: "System Health", section: "health" },
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
  mobileExpanded = false
}: AdminSidebarProps) {
  const navigate = useNavigate();
  const { clearAuth } = usePinAuth();
  const { toast } = useToast();
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Minimum swipe distance
  const minSwipeDistance = 50;

  // Detect mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handleNavClick = (section: string) => {
    onSectionChange(section);
  };

  const handleLogoutClick = () => {
    setLogoutDialogOpen(true);
  };

  const handleLogoutConfirm = () => {
    // Clear authentication state
    clearAuth();
    
    // Clear user ID
    localStorage.removeItem("profit-pilot-user-id");
    
    // Clear session storage
    sessionStorage.clear();
    
    // Clear admin flag and authentication
    localStorage.removeItem("profit-pilot-is-admin");
    localStorage.removeItem("profit-pilot-authenticated");
    
    // Show logout confirmation
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out.",
    });
    
    // Redirect to homepage
    navigate("/");
    setLogoutDialogOpen(false);
  };

  // Determine if sidebar should appear expanded (hover overrides collapsed state on desktop)
  // On mobile, use mobileExpanded state
  const isExpanded = isMobile ? mobileExpanded : (isHovered || !collapsed);

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
    const sidebarWidth = 224; // 56 * 4 = 224px (w-56)
    if (isLeftSwipe && touchStart.x > sidebarWidth - 30 && onMobileClose) {
      onMobileClose();
    }
  };

  return (
    <aside
      className={cn(
        "hidden lg:flex fixed z-50 bg-blue-500 transition-all duration-300 flex-col shadow-lg overflow-hidden",
        "left-2 top-2 h-[calc(100vh-1rem)]",
        // Desktop: based on expanded state
        isExpanded ? "w-56" : "w-16",
        "lg:border lg:border-blue-600 lg:rounded-lg"
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
      <div className="flex items-center justify-between h-16 px-4 bg-blue-500 lg:rounded-t-lg">
        {isExpanded && (
          <span className="text-lg font-bold text-white">
            Admin
          </span>
        )}
        <div className="flex items-center gap-2">
          {onMobileToggle && (
            <button
              onClick={onMobileToggle}
              className="p-2 hover:bg-blue-600 text-white transition-colors rounded lg:hidden"
            >
              <Menu size={20} />
            </button>
          )}
          <button
            onClick={onToggle}
            className={cn(
              "p-2 hover:bg-blue-600 text-white transition-colors rounded",
              isMobile ? "block" : "hidden lg:block"
            )}
            title={isMobile 
              ? (mobileExpanded ? "Collapse sidebar" : "Expand sidebar")
              : (collapsed ? "Expand sidebar" : "Collapse sidebar")
            }
          >
            {isMobile ? (
              <ChevronLeft 
                size={18} 
                className={cn(
                  "transition-transform duration-300",
                  mobileExpanded ? "rotate-180" : "rotate-0"
                )}
              />
            ) : (
              collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />
            )}
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto scrollbar-thin">
        {adminMenuItems.map((item) => {
          const isActive = activeSection === item.section;
          return (
            <button
              key={item.section}
              onClick={() => handleNavClick(item.section)}
              className={cn(
                "flex items-center gap-3 px-4 py-3 w-full text-left text-white hover:bg-blue-600 transition-colors cursor-pointer rounded-md",
                isActive && "bg-blue-700 text-white font-semibold shadow-sm",
                !isExpanded && "justify-center px-0"
              )}
              title={!isExpanded ? item.label : undefined}
            >
              <item.icon size={20} className="text-white" />
              {isExpanded && (
                <span className={cn(
                  "text-white",
                  // Mobile: smaller text with medium font weight (like bottom nav bars)
                  isMobile ? "text-xs font-medium" : "text-sm"
                )}>{item.label}</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-2 border-t border-blue-600 lg:rounded-b-lg">
        <button
          onClick={handleLogoutClick}
          className={cn(
            "sidebar-item w-full hover:bg-red-600 hover:text-white transition-colors text-white",
            !isExpanded && "justify-center px-0"
          )}
          title={!isExpanded ? "Logout" : undefined}
        >
          <LogOut size={20} />
          {isExpanded && (
            <span className={cn(
              // Mobile: smaller text with medium font weight (like bottom nav bars)
              isMobile ? "text-xs font-medium" : "text-sm"
            )}>Logout</span>
          )}
        </button>
      </div>

      {/* Logout Confirmation Dialog */}
      <AlertDialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Logout</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to logout? You will need to login again to access the admin dashboard.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLogoutConfirm}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Logout
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </aside>
  );
}
