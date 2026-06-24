import { useState, useEffect } from "react";
import { Link, useLocation, Navigate } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { MobileHeader } from "./MobileHeader";
import { DesktopHeader } from "./DesktopHeader";
import { MobileFixedBackground } from "./MobileFixedBackground";
import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Wallet, FileText, Settings } from "lucide-react";
import { LowStockAlertDock } from "@/components/dashboard/LowStockAlert";
import { MobilePageSearchBar } from "@/components/layout/PageSearchBar";
import { usePageSearch } from "@/hooks/usePageSearch";
import { useNavigate } from "react-router-dom";
import { usePinAuth } from "@/hooks/usePinAuth";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";
import { WorkspacePageGuard } from "@/components/workspace/WorkspacePageGuard";

interface AppLayoutProps {
  children: React.ReactNode;
  title: string;
}

const desktopMenuItems = [
  { icon: LayoutDashboard, label: "Overview", path: "/" },
  { icon: Wallet, label: "Finance", path: "/finance/income", matchPrefix: "/finance" },
  { icon: FileText, label: "Reports", path: "/reports" },
  { icon: Settings, label: "Settings", path: "/settings" },
];

export function AppLayout({ children, title }: AppLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { clearAuth } = usePinAuth();
  const { toast } = useToast();
  const { t, language } = useTranslation();
  const { loading: subLoading, hasAccess, isLocked } = useSubscriptionAccess();
  const { enabled: pageSearchEnabled } = usePageSearch();
  const isBillingRoute = location.pathname.startsWith("/billing");

  const getDesktopNavLabel = (item: { label: string; path: string }) => {
    if (item.path.startsWith("/finance")) return t("finance");
    if (item.path === "/") return t("dashboard");
    if (item.path === "/reports") return t("reports");
    if (item.path === "/settings") return t("settings");
    return item.label;
  };

  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const saved = localStorage.getItem("profit-pilot-sidebar-collapsed");
    return saved !== "true";
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const [showArrow, setShowArrow] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  // Save sidebar open state to localStorage whenever it changes (only on desktop)
  useEffect(() => {
    if (!isMobile) {
      localStorage.setItem("profit-pilot-sidebar-collapsed", String(!sidebarOpen));
    }
  }, [sidebarOpen, isMobile]);

  // React Router does not reset scroll on navigation; without this, opening Dashboard
  // can land mid-page (e.g. at Record New Sale) from a preserved scroll position.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // Minimum swipe distance
  const minSwipeDistance = 50;

  // Handle responsive sidebar - always collapsed on mobile
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) {
        setSidebarOpen(false);
        setMobileMenuOpen(false);
      } else {
        const saved = localStorage.getItem("profit-pilot-sidebar-collapsed");
        if (saved !== null) {
          setSidebarOpen(saved !== "true");
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
      className="relative min-h-screen w-full bg-white"
      style={{ minHeight: "100vh" }}
    >
      <MobileFixedBackground />
      {/* Mobile Header - Only visible on mobile */}
      <div className="lg:hidden">
        <MobileHeader />
        <MobilePageSearchBar className="fixed top-16 left-0 right-0 z-40" />
      </div>

      {/* Desktop header */}
      <DesktopHeader
        sidebarOpen={sidebarOpen}
        onSidebarToggle={() => setSidebarOpen((open) => !open)}
      />

      {/* Desktop: sidebar navigation */}
      <div className="hidden lg:block">
        <Sidebar
          open={sidebarOpen}
          onMobileClose={() => setMobileMenuOpen(false)}
        />
      </div>

      {/* Main content */}
      <div
        className={cn(
          "relative z-10 min-w-0 flex-1",
          isMobile
            ? cn("ml-0 pb-6", pageSearchEnabled ? "pt-[7.25rem]" : "pt-16")
            : cn(
                "transition-all duration-300 lg:pt-14",
                sidebarOpen ? "lg:ml-52" : "lg:ml-0",
              ),
        )}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          touchAction: "pan-y",
          ...(!isMobile && {
            ["--content-left" as string]: sidebarOpen
              ? "calc(0.5rem + 13rem + 0.75rem)"
              : "0.5rem",
          }),
        }}
      >
        <main className="p-4 pt-4 lg:p-6 lg:pt-4">
          {!subLoading && isLocked && !isBillingRoute ? (
            <Navigate to="/billing" replace />
          ) : null}
          <WorkspacePageGuard>{children}</WorkspacePageGuard>
        </main>
      </div>

      <LowStockAlertDock />
    </div>
  );
}
