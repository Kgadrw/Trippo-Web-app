import { useState, useEffect } from "react";
import { Outlet, useLocation, Navigate } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { MobileTopBar } from "./MobileTopBar";
import { DesktopHeader } from "./DesktopHeader";
import { MobileFixedBackground } from "./MobileFixedBackground";
import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";
import { cn } from "@/lib/utils";
import { LowStockAlertDock } from "@/components/dashboard/LowStockAlert";
import { WorkspacePageGuard } from "@/components/workspace/WorkspacePageGuard";

interface AppLayoutProps {
  title?: string;
}

export function AppLayout(_props?: AppLayoutProps) {
  const location = useLocation();
  const { loading: subLoading, isLocked } = useSubscriptionAccess();
  const isBillingRoute = location.pathname.startsWith("/billing");

  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const saved = localStorage.getItem("profit-pilot-sidebar-collapsed");
    return saved !== "true";
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileTopHeight, setMobileTopHeight] = useState(64);
  const [desktopTopHeight, setDesktopTopHeight] = useState(56);

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

    // Swipe left to close when menu is open
    if (isLeftSwipe && mobileMenuOpen) {
      setMobileMenuOpen(false);
    }
  };

  return (
    <div
      className="relative min-h-screen w-full bg-white"
      style={{ minHeight: "100vh" }}
    >
      <MobileFixedBackground />
      <MobileTopBar
        onMenuOpen={() => setMobileMenuOpen(true)}
        onHeightChange={setMobileTopHeight}
      />

      {/* Desktop header */}
      <DesktopHeader
        sidebarOpen={sidebarOpen}
        onSidebarToggle={() => setSidebarOpen((open) => !open)}
        onHeightChange={setDesktopTopHeight}
      />

      {/* Sidebar navigation */}
      <Sidebar
        open={sidebarOpen}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
        desktopHeaderHeight={desktopTopHeight}
      />

      {/* Main content */}
      <div
        className={cn(
          "relative z-10 min-w-0 flex-1",
          isMobile
            ? "ml-0 pb-6"
            : cn(
                "transition-all duration-300",
                sidebarOpen ? "lg:ml-52" : "lg:ml-0",
              ),
        )}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          touchAction: "pan-y",
          ...(isMobile ? { paddingTop: mobileTopHeight } : { paddingTop: desktopTopHeight }),
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
          <WorkspacePageGuard>
            <Outlet />
          </WorkspacePageGuard>
        </main>
      </div>

      <LowStockAlertDock />
    </div>
  );
}
