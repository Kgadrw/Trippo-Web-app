import { useState, useEffect, useRef } from "react";
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
  // Immersive WhatsApp-style thread: hide app chrome when a conversation is open.
  const isMessagesConversationOpen =
    isMessagesRoute && location.pathname !== "/messages" && location.pathname !== "/messages/";
  const [isMobile, setIsMobile] = useState(false);
  const mobileMessagesShell = isMobile && isMessagesRoute;
  const immersiveMobileChat = mobileMessagesShell && isMessagesConversationOpen;
  const viewport = useVisualViewportFrame(mobileMessagesShell);

  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const saved = localStorage.getItem("profit-pilot-sidebar-collapsed");
    return saved !== "true";
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [messagesSidebarPeek, setMessagesSidebarPeek] = useState(false);
  const sidebarPrefBeforeMessagesRef = useRef<boolean | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const touchEndRef = useRef<{ x: number; y: number } | null>(null);
  const minSwipeDistance = 50;
  const [mobileTopHeight, setMobileTopHeight] = useState(64);
  const [desktopTopHeight, setDesktopTopHeight] = useState(56);

  // On Messages (desktop): auto-hide platform sidebar like the hamburger collapse.
  // When leaving Messages, always reopen it so navigation feels intentional.
  useEffect(() => {
    if (isMobile) {
      setMessagesSidebarPeek(false);
      return;
    }
    if (isMessagesRoute) {
      if (sidebarPrefBeforeMessagesRef.current === null) {
        sidebarPrefBeforeMessagesRef.current = sidebarOpen;
      }
      setSidebarOpen(false);
      setMessagesSidebarPeek(false);
      return;
    }
    if (sidebarPrefBeforeMessagesRef.current !== null) {
      setSidebarOpen(true);
      localStorage.setItem("profit-pilot-sidebar-collapsed", "false");
      sidebarPrefBeforeMessagesRef.current = null;
      setMessagesSidebarPeek(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to route/mobile; capture open once on enter
  }, [isMessagesRoute, isMobile]);

  const platformSidebarOpen =
    !isMobile && isMessagesRoute ? sidebarOpen || messagesSidebarPeek : sidebarOpen;

  // Save sidebar open state to localStorage whenever it changes (only on desktop).
  // Skip while on Messages so auto-hide does not overwrite the user's preference.
  useEffect(() => {
    if (!isMobile && !isMessagesRoute) {
      localStorage.setItem("profit-pilot-sidebar-collapsed", String(!sidebarOpen));
    }
  }, [sidebarOpen, isMobile, isMessagesRoute]);

  // React Router does not reset scroll on navigation; without this, opening Dashboard
  // can land mid-page (e.g. at Record New Sale) from a preserved scroll position.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // Handle responsive sidebar - always collapsed on mobile
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) {
        setSidebarOpen(false);
        setMobileMenuOpen(false);
        setMessagesSidebarPeek(false);
      } else if (!location.pathname.startsWith("/messages")) {
        const saved = localStorage.getItem("profit-pilot-sidebar-collapsed");
        if (saved !== null) {
          setSidebarOpen(saved !== "true");
        }
      } else {
        setSidebarOpen(false);
        setMessagesSidebarPeek(false);
      }
    };

    // Set initial state
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [location.pathname]);

  // Nav drawer swipe — refs only (no setState on touchmove) so chat stays fixed while scrolling.
  const onTouchStart = (e: React.TouchEvent) => {
    if (window.innerWidth >= 1024) return;
    // Inside an open conversation, leave gestures to chat (reply / edge-back).
    if (isMessagesConversationOpen && !mobileMenuOpen) {
      touchStartRef.current = null;
      touchEndRef.current = null;
      return;
    }
    touchEndRef.current = null;
    touchStartRef.current = {
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    };
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (window.innerWidth >= 1024) return;
    if (!touchStartRef.current) return;
    touchEndRef.current = {
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    };
  };

  const onTouchEnd = () => {
    if (window.innerWidth >= 1024) return;

    const touchStart = touchStartRef.current;
    const touchEnd = touchEndRef.current;
    touchStartRef.current = null;
    touchEndRef.current = null;
    if (!touchStart || !touchEnd) return;

    const distanceX = touchStart.x - touchEnd.x;
    const distanceY = touchStart.y - touchEnd.y;
    const isLeftSwipe = distanceX > minSwipeDistance;
    const isRightSwipe = distanceX < -minSwipeDistance;
    const isVerticalSwipe = Math.abs(distanceY) > Math.abs(distanceX);

    if (isVerticalSwipe) return;

    if (isRightSwipe && touchStart.x < 30 && !mobileMenuOpen && !isMessagesConversationOpen) {
      setMobileMenuOpen(true);
    }

    if (isLeftSwipe && mobileMenuOpen) {
      setMobileMenuOpen(false);
    }
  };

  const effectiveMobileTopHeight = immersiveMobileChat ? 0 : mobileTopHeight;
  const messagesContentHeight = Math.max(0, viewport.height - effectiveMobileTopHeight);

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
      {immersiveMobileChat ? null : (
        <MobileTopBar
          onMenuOpen={() => setMobileMenuOpen(true)}
          onHeightChange={setMobileTopHeight}
          topOffset={mobileMessagesShell ? viewport.offsetTop : 0}
        />
      )}

      {/* Desktop header */}
      <DesktopHeader
        sidebarOpen={platformSidebarOpen}
        onSidebarToggle={() => {
          setMessagesSidebarPeek(false);
          setSidebarOpen((open) => !open);
        }}
        onHeightChange={setDesktopTopHeight}
      />

      {/* Left-edge hover to peek platform sidebar while on Messages */}
      {!isMobile && isMessagesRoute && !platformSidebarOpen ? (
        <div
          className="pointer-events-auto fixed inset-y-0 left-0 z-40 hidden w-3 lg:block"
          style={{ top: desktopTopHeight }}
          onMouseEnter={() => setMessagesSidebarPeek(true)}
          aria-hidden
        />
      ) : null}

      {/* Sidebar navigation */}
      <Sidebar
        open={platformSidebarOpen}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
        desktopHeaderHeight={desktopTopHeight}
        onDesktopMouseLeave={() => {
          if (isMessagesRoute && !sidebarOpen) {
            setMessagesSidebarPeek(false);
          }
        }}
      />

      {/* Main content */}
      <div
        className={cn(
          "relative z-10 min-w-0 flex-1 transition-[margin] duration-300",
          isMobile
            ? cn("ml-0", !isMessagesRoute && "pb-6")
            : cn(
                platformSidebarOpen ? "lg:ml-52" : "lg:ml-0",
                isMessagesRoute && "overflow-hidden pb-0",
              ),
          mobileMessagesShell && "fixed left-0 right-0 overflow-hidden",
        )}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          touchAction: "pan-y",
          ["--app-header-height" as string]: `${isMobile ? effectiveMobileTopHeight : desktopTopHeight}px`,
          ["--keyboard-open" as string]: viewport.keyboardOpen ? "1" : "0",
          ["--keyboard-inset" as string]: `${viewport.keyboardInset}px`,
          ...(mobileMessagesShell
            ? {
                // Always pin to the visual viewport so the native keyboard
                // position is known and the composer sits just above it.
                top: viewport.offsetTop + effectiveMobileTopHeight,
                height: messagesContentHeight,
                bottom: "auto" as const,
                paddingTop: 0,
                paddingBottom: 0,
              }
            : isMobile
              ? isMessagesRoute
                ? {
                    paddingTop: effectiveMobileTopHeight,
                    height: "100dvh",
                    paddingBottom: 0,
                  }
                : { paddingTop: mobileTopHeight }
              : isMessagesRoute
                ? {
                    paddingTop: desktopTopHeight,
                    height: "100dvh",
                    minHeight: "100dvh",
                    // Keep chat composer clear of Windows taskbar / window chrome
                    paddingBottom: "max(0.75rem, env(safe-area-inset-bottom, 0px))",
                  }
                : { paddingTop: desktopTopHeight }),
          ...(!isMobile &&
            !isMessagesRoute && {
              ["--content-left" as string]: platformSidebarOpen
                ? "calc(0.5rem + 13rem + 0.75rem)"
                : "0.5rem",
            }),
        }}
      >
        <main
          className={cn(
            isMessagesRoute
              ? "flex h-full min-h-0 flex-col overflow-hidden p-0"
              : "min-w-0 max-w-full overflow-x-hidden p-4 pt-4 lg:overflow-x-visible lg:p-6 lg:pt-4",
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
