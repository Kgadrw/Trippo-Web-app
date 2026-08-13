import { useState, useEffect } from "react";
import { Outlet, useLocation, Navigate } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { MobileTopBar } from "./MobileTopBar";
import { DesktopHeader } from "./DesktopHeader";
import { MobileFixedBackground } from "./MobileFixedBackground";
import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";
import { useVisualViewportFrame } from "@/hooks/useVisualViewportFrame";
import { cn } from "@/lib/utils";
import { LowStockAlertDock } from "@/components/dashboard/LowStockAlert";
import { WorkspacePageGuard } from "@/components/workspace/WorkspacePageGuard";
import { WorkspaceChatNotificationBridge } from "@/components/workspace/WorkspaceChatNotificationBridge";
import { ChatIncomingPopupHost } from "@/components/workspace/ChatIncomingPopupHost";
import { WorkspaceChatPanelProvider } from "@/hooks/useWorkspaceChatPanel";
import { WorkspacePresenceProvider } from "@/hooks/useWorkspacePresence";

interface AppLayoutProps {
  title?: string;
}

export function AppLayout(_props?: AppLayoutProps) {
  return (
    <WorkspaceChatPanelProvider>
      <WorkspacePresenceProvider>
        <AppLayoutInner />
      </WorkspacePresenceProvider>
    </WorkspaceChatPanelProvider>
  );
}

function AppLayoutInner(_props?: AppLayoutProps) {
  const location = useLocation();
  const { loading: subLoading, isLocked } = useSubscriptionAccess();
  const isBillingRoute = location.pathname.startsWith("/billing");
  const isMessagesRoute = location.pathname.startsWith("/messages");
  const [isMobile, setIsMobile] = useState(false);
  const mobileMessagesShell = isMobile && isMessagesRoute;
  const viewport = useVisualViewportFrame(mobileMessagesShell);

  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const saved = localStorage.getItem("profit-pilot-sidebar-collapsed");
    return saved !== "true";
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null);
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

  const messagesContentHeight = Math.max(
    0,
    viewport.height - mobileTopHeight,
  );

  return (
    <div
      className={cn(
        "relative w-full bg-white",
        mobileMessagesShell || isMessagesRoute
          ? "h-[100dvh] overflow-hidden"
          : "min-h-screen",
      )}
      style={
        mobileMessagesShell || isMessagesRoute
          ? undefined
          : { minHeight: "100vh" }
      }
    >
      <MobileFixedBackground />
      <MobileTopBar
        onMenuOpen={() => setMobileMenuOpen(true)}
        onHeightChange={setMobileTopHeight}
        topOffset={mobileMessagesShell ? viewport.offsetTop : 0}
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
          "relative z-10 min-w-0 flex-1 transition-[margin] duration-300",
          isMobile
            ? cn("ml-0", !isMessagesRoute && "pb-6")
            : cn(
                sidebarOpen ? "lg:ml-52" : "lg:ml-0",
                isMessagesRoute && "overflow-hidden pb-0",
              ),
          mobileMessagesShell && "fixed left-0 right-0 overflow-hidden",
        )}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          touchAction: "pan-y",
          ["--app-header-height" as string]: `${isMobile ? mobileTopHeight : desktopTopHeight}px`,
          ["--keyboard-open" as string]: viewport.keyboardOpen ? "1" : "0",
          ...(mobileMessagesShell
            ? {
                top: viewport.offsetTop + mobileTopHeight,
                // Pin to the screen bottom when the keyboard is closed so the
                // chat list/sidebar has no gap; shrink only while typing.
                ...(viewport.keyboardOpen
                  ? {
                      height: messagesContentHeight,
                      bottom: "auto" as const,
                    }
                  : {
                      bottom: 0,
                      height: "auto" as const,
                    }),
                paddingTop: 0,
                paddingBottom: 0,
              }
            : isMobile
              ? isMessagesRoute
                ? {
                    // border-box height includes paddingTop — use full 100dvh so
                    // the chat list reaches the viewport bottom (no white strip).
                    paddingTop: mobileTopHeight,
                    height: "100dvh",
                    paddingBottom: 0,
                  }
                : { paddingTop: mobileTopHeight }
              : isMessagesRoute
                ? {
                    paddingTop: desktopTopHeight,
                    height: "100dvh",
                    minHeight: "100dvh",
                    paddingBottom: 0,
                  }
                : { paddingTop: desktopTopHeight }),
          ...(!isMobile &&
            !isMessagesRoute && {
              ["--content-left" as string]: sidebarOpen
                ? "calc(0.5rem + 13rem + 0.75rem)"
                : "0.5rem",
            }),
        }}
      >
        <main
          className={cn(
            isMessagesRoute ? "flex h-full min-h-0 flex-col overflow-hidden p-0" : "p-4 pt-4 lg:p-6 lg:pt-4",
          )}
        >
          {!subLoading && isLocked && !isBillingRoute ? (
            <Navigate to="/billing" replace />
          ) : null}
          <WorkspacePageGuard>
            <div className={cn(isMessagesRoute && "flex h-full min-h-0 flex-1 flex-col")}>
              <Outlet />
            </div>
          </WorkspacePageGuard>
        </main>
      </div>

      <LowStockAlertDock />
      <WorkspaceChatNotificationBridge />
      <ChatIncomingPopupHost />
    </div>
  );
}
