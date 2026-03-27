import { useState, useEffect, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { MobileHeader } from "./MobileHeader";
import { MobileFixedBackground } from "./MobileFixedBackground";
import { cn } from "@/lib/utils";
import { useSubdomain } from "@/hooks/useSubdomain";
import { LayoutDashboard, Package, UserRound, ShoppingCart, Wallet, FileText, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { usePinAuth } from "@/hooks/usePinAuth";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";

interface AppLayoutProps {
  children: React.ReactNode;
  title: string;
}

const desktopMenuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: Package, label: "Services", path: "/products" },
  { icon: UserRound, label: "Barbers", path: "/barbers" },
  { icon: ShoppingCart, label: "Sales", path: "/sales" },
  { icon: Wallet, label: "Expenses", path: "/expenses" },
  { icon: FileText, label: "Reports", path: "/reports" },
  { icon: Settings, label: "Settings", path: "/settings" },
];

export function AppLayout({ children, title }: AppLayoutProps) {
  const location = useLocation();
  const subdomain = useSubdomain();
  const navigate = useNavigate();
  const { clearAuth } = usePinAuth();
  const { toast } = useToast();
  const { t, language } = useTranslation();

  const getDesktopNavLabel = (item: { label: string; path: string }) => {
    if (item.path === "/products")
      return language === "rw" ? "Serivisi" : language === "fr" ? "Services" : "Services";
    if (item.path === "/barbers")
      return language === "rw" ? "Umwogoshi" : language === "fr" ? "Coiffeurs" : "Barbers";
    if (item.path === "/expenses")
      return language === "rw" ? "Ibikiguzi" : language === "fr" ? "Dépenses" : "Expenses";
    if (item.path === "/dashboard") return t("dashboard");
    if (item.path === "/sales") return t("sales");
    if (item.path === "/reports") return t("reports");
    if (item.path === "/settings") return t("settings");
    return item.label;
  };

  /** Hide bottom bar on user dashboard subdomain; keep other areas unchanged. */
  const showBottomNav = useMemo(() => {
    if (subdomain === "dashboard") {
      return false;
    }
    return true;
  }, [subdomain, location.pathname]);

  // Load sidebar collapsed state from localStorage
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem("profit-pilot-sidebar-collapsed");
    return saved === "true";
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const [showArrow, setShowArrow] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileSidebarExpanded, setMobileSidebarExpanded] = useState(false);

  // Save sidebar collapsed state to localStorage whenever it changes (only on desktop)
  useEffect(() => {
    if (!isMobile) {
      localStorage.setItem("profit-pilot-sidebar-collapsed", String(sidebarCollapsed));
    }
  }, [sidebarCollapsed, isMobile]);

  // Minimum swipe distance
  const minSwipeDistance = 50;

  // Handle responsive sidebar - always collapsed on mobile
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) {
        // Only force collapse on mobile, don't save to localStorage
        setSidebarCollapsed(true);
        setMobileMenuOpen(false);
      } else {
        // On desktop, restore saved state
        const saved = localStorage.getItem("profit-pilot-sidebar-collapsed");
        if (saved !== null) {
          setSidebarCollapsed(saved === "true");
        }
      }
    };

    // Set initial state
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Handle scroll detection to hide arrow
  useEffect(() => {
    let scrollTimeout: NodeJS.Timeout;
    let lastScrollTop = 0;

    const handleScroll = () => {
      if (window.innerWidth >= 1024) return; // Only on mobile

      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      
      // Hide arrow when scrolling
      setIsScrolling(true);
      setShowArrow(false);

      // Show arrow after scrolling stops
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        setIsScrolling(false);
        setShowArrow(true);
      }, 1000);

      lastScrollTop = scrollTop;
    };

    // Only add scroll listener on mobile
    if (window.innerWidth < 1024) {
      window.addEventListener("scroll", handleScroll, { passive: true });
    }

    return () => {
      window.removeEventListener("scroll", handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, []);

  const handleMenuToggle = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

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

  // Handle touch end and detect swipe
  const onTouchEnd = () => {
    // Only handle on mobile
    if (window.innerWidth >= 1024) return;
    
    if (!touchStart || !touchEnd) return;

    const distanceX = touchStart.x - touchEnd.x;
    const distanceY = touchStart.y - touchEnd.y;
    const isLeftSwipe = distanceX > minSwipeDistance;
    const isRightSwipe = distanceX < -minSwipeDistance;
    const isVerticalSwipe = Math.abs(distanceY) > Math.abs(distanceX);

    // Only handle horizontal swipes
    if (isVerticalSwipe) return;

    // Swipe from left edge (within 30px) to right to open
    if (isRightSwipe && touchStart.x < 30 && !mobileMenuOpen) {
      setMobileMenuOpen(true);
    }
  };

  return (
    <div
      className="relative min-h-screen w-full bg-transparent lg:bg-background"
      style={{ minHeight: "100vh" }}
    >
      <MobileFixedBackground />
      {/* Mobile Header - Only visible on mobile */}
      <div className="lg:hidden">
        <MobileHeader />
      </div>

      {/* Desktop top navigation header (replaces left sidebar) */}
      <div className="hidden lg:block fixed top-0 left-0 right-0 z-50 border-b border-blue-700 bg-blue-600 shadow-sm">
        <div className="h-16 px-4 flex items-center gap-4">
          <Link to={subdomain === "dashboard" ? "/" : "/dashboard"} className="flex items-center gap-2 shrink-0">
            <img src="/logo.png" alt="Trippo Logo" className="h-7 w-7 object-contain" />
            <span className="text-lg font-normal text-white lowercase">trippo</span>
          </Link>
          <nav className="ml-auto flex items-center gap-2 overflow-x-auto">
            {desktopMenuItems.map((item) => {
              const isDashboardItem = item.path === "/dashboard";
              const isDashboardSubdomainRoot = subdomain === "dashboard" && location.pathname === "/";
              const isActive = location.pathname === item.path || (isDashboardItem && isDashboardSubdomainRoot);
              const path = isDashboardItem && subdomain === "dashboard" ? "/" : item.path;
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={path}
                  className={cn(
                    "h-9 px-3 rounded-md inline-flex items-center gap-2 text-sm whitespace-nowrap transition-colors",
                    isActive ? "bg-white text-blue-700" : "text-blue-100 hover:bg-blue-700 hover:text-white"
                  )}
                >
                  <Icon size={16} />
                  <span>{getDesktopNavLabel(item)}</span>
                </Link>
              );
            })}
            <button
              type="button"
              onClick={async () => {
                clearAuth();
                localStorage.removeItem("profit-pilot-user-id");
                localStorage.removeItem("profit-pilot-user-name");
                localStorage.removeItem("profit-pilot-user-email");
                localStorage.removeItem("profit-pilot-business-name");
                localStorage.removeItem("profit-pilot-is-admin");
                localStorage.removeItem("profit-pilot-authenticated");
                sessionStorage.clear();
                try {
                  const { clearAllStores } = await import("@/lib/indexedDB");
                  await clearAllStores();
                } catch (error) {
                  console.error("Error clearing IndexedDB on logout:", error);
                }
                window.dispatchEvent(new Event("pin-auth-changed"));
                toast({
                  title:
                    language === "rw"
                      ? "Yasohotse"
                      : language === "fr"
                      ? "Déconnecté"
                      : "Logged Out",
                  description:
                    language === "rw"
                      ? "Wagiye mu buryo bwiza."
                      : language === "fr"
                      ? "Vous avez été déconnecté avec succès."
                      : "You have been successfully logged out.",
                });
                navigate("/", { replace: true });
              }}
              className="h-9 px-3 rounded-md inline-flex items-center gap-2 text-sm whitespace-nowrap transition-colors text-blue-100 hover:bg-red-600 hover:text-white"
            >
              <span>{t("logout")}</span>
            </button>
          </nav>
        </div>
      </div>

      {/* Bottom Navigation - dashboard subdomain: only on home `/`; admin & main domain: all pages */}
      {showBottomNav && (
        <div className="lg:hidden">
          <BottomNav />
        </div>
      )}

      {/* Main content */}
      <div
        className={cn(
          "relative z-10",
          // On mobile, no margin (bottom nav instead of sidebar), add top padding for header
          // On desktop, adjust based on sidebar state
          // Use transition only for sidebar changes, not initial load
          isMobile
            ? cn("ml-0 pt-4", showBottomNav ? "pb-24" : "pb-6")
            : "lg:ml-0 lg:pt-20 transition-all duration-300"
        )}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{ touchAction: 'pan-y' }}
      >
        <main className={cn("p-6", isMobile ? "pt-3" : "pt-6")}>{children}</main>
      </div>
    </div>
  );
}
