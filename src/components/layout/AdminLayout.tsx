import { useState, useEffect } from "react";
import { AdminSidebar } from "./AdminSidebar";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
  activeSection: string;
  onSectionChange: (section: string) => void;
}

export function AdminLayout({ children, title, activeSection, onSectionChange }: AdminLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const [showArrow, setShowArrow] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileSidebarExpanded, setMobileSidebarExpanded] = useState(false);

  // Minimum swipe distance
  const minSwipeDistance = 50;

  // Handle responsive sidebar - always collapsed on mobile
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) {
        setSidebarCollapsed(true);
        setMobileMenuOpen(false);
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
    <div className="min-h-screen bg-background">
      {/* Sidebar - Always visible, can be expanded/collapsed on mobile */}
      <div className="block">
        <AdminSidebar
          collapsed={isMobile ? !mobileSidebarExpanded : sidebarCollapsed}
          onToggle={() => {
            if (isMobile) {
              setMobileSidebarExpanded(!mobileSidebarExpanded);
            } else {
              setSidebarCollapsed(!sidebarCollapsed);
            }
          }}
          onMobileClose={() => {}}
          onMobileToggle={() => setMobileSidebarExpanded(!mobileSidebarExpanded)}
          onHoverChange={setSidebarHovered}
          activeSection={activeSection}
          onSectionChange={onSectionChange}
          mobileExpanded={mobileSidebarExpanded}
        />
      </div>

      {/* Main content */}
      <div
        className={cn(
          "transition-all duration-300",
          // On mobile, adjust margin based on sidebar expanded state
          // On desktop, adjust based on sidebar state
          isMobile 
            ? (mobileSidebarExpanded ? "ml-60" : "ml-20")
            : "lg:ml-0",
          !isMobile && ((sidebarHovered && sidebarCollapsed) || !sidebarCollapsed 
            ? "lg:ml-56" 
            : "lg:ml-16")
        )}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{ touchAction: 'pan-y' }}
      >
        <main className="p-6 animate-fade-in lg:pt-6 pt-6">{children}</main>
      </div>
    </div>
  );
}
