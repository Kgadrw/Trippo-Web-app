import { useState, useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { MobileHeader } from "./MobileHeader";
import { MobileFixedBackground } from "./MobileFixedBackground";
import { cn } from "@/lib/utils";
import { useSubdomain } from "@/hooks/useSubdomain";

interface AppLayoutProps {
  children: React.ReactNode;
  title: string;
}

export function AppLayout({ children, title }: AppLayoutProps) {
  const location = useLocation();
  const subdomain = useSubdomain();

  /** Merchant dashboard home: hide bottom bar unless user is admin (admin subdomain uses AdminLayout + AdminBottomNav for `/`). */
  const showBottomNav = useMemo(() => {
    const isAdmin = typeof window !== "undefined" && localStorage.getItem("profit-pilot-is-admin") === "true";
    const isMerchantDashboardHome = subdomain === "dashboard" && location.pathname === "/";
    if (isMerchantDashboardHome && !isAdmin) return false;
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

      {/* Sidebar - Hidden on mobile, visible on desktop */}
      <div className="hidden lg:block">
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          onMobileClose={() => {}}
          onMobileToggle={() => {}}
          onHoverChange={setSidebarHovered}
          mobileExpanded={false}
        />
      </div>

      {/* Bottom Navigation - hidden on merchant dashboard home; admins still see it */}
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
            ? cn(
                "ml-0 pt-20",
                showBottomNav ? "pb-16" : "pb-6" // less padding when bottom nav is hidden
              )
            : "lg:ml-0 transition-all duration-300",
          !isMobile && ((sidebarHovered && sidebarCollapsed) || !sidebarCollapsed 
            ? "lg:ml-56" 
            : "lg:ml-16")
        )}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{ touchAction: 'pan-y' }}
      >
        <main className="p-6 lg:pt-6 pt-6">{children}</main>
      </div>
    </div>
  );
}
