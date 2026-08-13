import { useState, useEffect, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
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
import { useSubdomain } from "@/hooks/useSubdomain";
import { getDashboardPath } from "@/lib/appRoutes";
import { clearAllStores } from "@/lib/indexedDB";
import { clearAppSession, logoutAndGoHome } from "@/lib/session";
import { useWorkspace } from "@/hooks/useWorkspace";
import type { WorkspacePageKey } from "@/lib/workspace";
import { workspaceApi } from "@/lib/api";
import {
  MESSAGES_UNREAD_BUMP_EVENT,
  MESSAGES_UNREAD_REFRESH_EVENT,
} from "@/lib/messagesUnreadEvents";

type SidebarMenuItem = {
  label: string;
  path: string;
  matchPrefix?: string;
  sectionKey?: string;
  pageKey?: WorkspacePageKey;
  children?: { label: string; to: string; workspaceOnly?: boolean }[];
};

const financeChildren = [
  { label: "Income", to: "/finance/income" },
  { label: "Customers", to: "/finance/customers" },
  { label: "Invoices", to: "/finance/invoices" },
  { label: "Vendors", to: "/finance/vendors" },
  { label: "Bank Deposits", to: "/finance/deposits" },
  { label: "Accounts", to: "/finance/accounts" },
  { label: "Financial Statements", to: "/finance/statements" },
  { label: "Bank Reconciliation", to: "/finance/reconciliation" },
  { label: "Budgets", to: "/finance/budgets" },
  { label: "Loans", to: "/finance/loans" },
  { label: "Bills", to: "/finance/bills" },
  { label: "Tax", to: "/finance/taxes" },
  { label: "Expenditure", to: "/finance/expenditure" },
  { label: "Payroll", to: "/finance/payroll" },
  { label: "Transactions", to: "/finance/transactions" },
];

const teamChildren = [
  { label: "Overview", to: "/team" },
  { label: "All tasks", to: "/team/tasks" },
];

const hrChildren = [
  { label: "Overview", to: "/hr" },
  { label: "People", to: "/hr/people" },
  { label: "Leave", to: "/hr/leave" },
];

const projectChildren = [
  { label: "Overview", to: "/projects" },
  { label: "All projects", to: "/projects/all" },
];

const calendarChildren = [
  { label: "Overview", to: "/calendar" },
  { label: "Automations", to: "/calendar/schedules" },
  { label: "Announcements", to: "/calendar/announcements", workspaceOnly: true },
];

const menuItems: SidebarMenuItem[] = [
  { label: "Overview", path: "/", pageKey: "dashboard" },
  { label: "Products", path: "/products", pageKey: "products" },
  { label: "Sales", path: "/sales", pageKey: "sales" },
  {
    label: "Calendar",
    path: "/calendar",
    matchPrefix: "/calendar",
    sectionKey: "calendar",
    pageKey: "calendar",
    children: calendarChildren,
  },
  {
    label: "Team",
    path: "/team",
    matchPrefix: "/team",
    sectionKey: "team",
    pageKey: "team",
    children: teamChildren,
  },
  {
    label: "HR",
    path: "/hr",
    matchPrefix: "/hr",
    sectionKey: "hr",
    pageKey: "hr",
    children: hrChildren,
  },
  {
    label: "Projects",
    path: "/projects",
    matchPrefix: "/projects",
    sectionKey: "projects",
    pageKey: "projects",
    children: projectChildren,
  },
  {
    label: "Finance",
    path: "/finance/income",
    matchPrefix: "/finance",
    sectionKey: "finance",
    pageKey: "finance",
    children: financeChildren,
  },
  { label: "Reports", path: "/reports", pageKey: "reports" },
  { label: "Documents", path: "/documents", matchPrefix: "/documents", pageKey: "documents" },
  { label: "Assets", path: "/assets", pageKey: "assets" },
  { label: "Approvals", path: "/approvals", pageKey: "approvals" },
  { label: "Messages", path: "/messages", pageKey: "chat" },
];

interface SidebarProps {
  open: boolean;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  desktopHeaderHeight?: number;
}

function FilledTriangleDown({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 10 6" className={cn("h-2.5 w-2.5 shrink-0", className)} aria-hidden>
      <path d="M0 0h10L5 6z" fill="currentColor" />
    </svg>
  );
}

function FilledTriangleUp({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 10 6" className={cn("h-2.5 w-2.5 shrink-0", className)} aria-hidden>
      <path d="M0 6h10L5 0z" fill="currentColor" />
    </svg>
  );
}

export function Sidebar({ open, mobileOpen = false, onMobileClose, desktopHeaderHeight = 56 }: SidebarProps) {
  const location = useLocation();
  const { clearAuth } = usePinAuth();
  const { toast } = useToast();
  const subdomain = useSubdomain();
  const { mode, activeWorkspace, canAccessPage } = useWorkspace();
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [messagesUnread, setMessagesUnread] = useState(0);

  const visibleMenuItems = menuItems.filter((item) => {
    if (!item.pageKey) return true;
    return canAccessPage(item.pageKey);
  });

  const refreshMessagesUnread = useCallback(async () => {
    if (mode !== "workspace" || !activeWorkspace?.id) {
      setMessagesUnread(0);
      return;
    }
    try {
      const res = await workspaceApi.getChatUnreadSummary(activeWorkspace.id);
      const total = Number((res.data as { total?: number } | undefined)?.total || 0);
      setMessagesUnread(Number.isFinite(total) ? total : 0);
    } catch {
      // Keep last known count if the summary request fails.
    }
  }, [mode, activeWorkspace?.id]);

  useEffect(() => {
    void refreshMessagesUnread();
    if (mode !== "workspace" || !activeWorkspace?.id) return undefined;

    const intervalId = window.setInterval(() => {
      void refreshMessagesUnread();
    }, 20000);

    const onFocus = () => void refreshMessagesUnread();
    const onNotifications = () => void refreshMessagesUnread();
    const onBump = (event: Event) => {
      const delta = Number((event as CustomEvent<{ delta?: number }>).detail?.delta || 0);
      if (!delta) return;
      setMessagesUnread((count) => Math.max(0, count + delta));
    };
    const onUnreadRefresh = () => void refreshMessagesUnread();

    window.addEventListener("focus", onFocus);
    window.addEventListener("notifications-updated", onNotifications);
    window.addEventListener("notifications-should-refresh", onNotifications);
    window.addEventListener(MESSAGES_UNREAD_BUMP_EVENT, onBump);
    window.addEventListener(MESSAGES_UNREAD_REFRESH_EVENT, onUnreadRefresh);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("notifications-updated", onNotifications);
      window.removeEventListener("notifications-should-refresh", onNotifications);
      window.removeEventListener(MESSAGES_UNREAD_BUMP_EVENT, onBump);
      window.removeEventListener(MESSAGES_UNREAD_REFRESH_EVENT, onUnreadRefresh);
    };
  }, [mode, activeWorkspace?.id, refreshMessagesUnread, location.pathname]);

  useEffect(() => {
    if (location.pathname.startsWith("/finance")) {
      setOpenSections((prev) => ({ ...prev, finance: true }));
    }
    if (location.pathname.startsWith("/team")) {
      setOpenSections((prev) => ({ ...prev, team: true }));
    }
    if (location.pathname.startsWith("/hr")) {
      setOpenSections((prev) => ({ ...prev, hr: true }));
    }
    if (location.pathname.startsWith("/projects")) {
      setOpenSections((prev) => ({ ...prev, projects: true }));
    }
  }, [location.pathname]);

  const handleNavClick = () => {
    if (window.innerWidth < 1024 && onMobileClose) {
      onMobileClose();
    }
  };

  const renderNavItem = (item: SidebarMenuItem) => {
    const isDashboardItem = item.path === "/";
    const isDashboardSubdomainRoot =
      subdomain === "bookfy" && location.pathname === "/";
    const isExpandableItem = Boolean(item.children?.length && item.sectionKey);
    const isActive =
      (item.matchPrefix
        ? location.pathname.startsWith(item.matchPrefix)
        : location.pathname === item.path) ||
      (isDashboardItem && isDashboardSubdomainRoot);
    const dashboardPath = getDashboardPath(subdomain);
    const sectionOpen = item.sectionKey ? Boolean(openSections[item.sectionKey]) : false;

    const labelClass = cn(
      "flex-1 text-left text-sm font-semibold",
      isActive ? "text-white" : "text-gray-600",
    );

    if (isExpandableItem) {
      return (
        <div key={item.path}>
          <button
            type="button"
            onClick={() =>
              setOpenSections((prev) => ({
                ...prev,
                [item.sectionKey!]: !prev[item.sectionKey!],
              }))
            }
            className={cn("sidebar-item w-full", isActive && "sidebar-item-active")}
          >
            <span className={labelClass}>{item.label}</span>
            {sectionOpen ? (
              <FilledTriangleUp
                className={cn("ml-auto", isActive ? "text-white" : "text-gray-600")}
              />
            ) : (
              <FilledTriangleDown
                className={cn("ml-auto", isActive ? "text-white" : "text-gray-600")}
              />
            )}
          </button>
          {sectionOpen && item.children && (
            <div className="mt-1 space-y-1 ml-1">
              {item.children
                .filter((sub) => mode === "workspace" || !sub.workspaceOnly)
                .map((sub) => {
                const subActive = location.pathname === sub.to;
                return (
                  <Link
                    key={sub.to}
                    to={sub.to}
                    onClick={handleNavClick}
                    className={cn(
                      "sidebar-sub-item pl-4 pr-3",
                      subActive && "sidebar-sub-item-active",
                    )}
                  >
                    {sub.label}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    return (
      <div key={item.path}>
        <Link
          to={isDashboardItem ? dashboardPath : item.path}
          onClick={handleNavClick}
          className={cn("sidebar-item w-full", isActive && "sidebar-item-active")}
        >
          <span className={labelClass}>{item.label}</span>
          {item.path === "/messages" && messagesUnread > 0 ? (
            <span
              className={cn(
                "ml-auto flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-[10px] font-bold",
                isActive ? "bg-white text-[#5B2EFF]" : "bg-[#5B2EFF] text-white",
              )}
            >
              {messagesUnread > 99 ? "99+" : messagesUnread}
            </span>
          ) : null}
        </Link>
      </div>
    );
  };

  const handleLogoutClick = () => {
    if (window.innerWidth < 1024 && onMobileClose) {
      onMobileClose();
    }
    setLogoutDialogOpen(true);
  };

  const handleLogoutConfirm = async () => {
    clearAuth();
    clearAppSession();

    try {
      await clearAllStores();
    } catch (error) {
      console.error("Error clearing IndexedDB on logout:", error);
    }

    setLogoutDialogOpen(false);

    toast({
      title: "Logged out",
      description: "You have been signed out successfully.",
    });

    logoutAndGoHome();
  };

  if (!open && !mobileOpen) {
    return null;
  }

  const navContent = (
    <nav className="flex-1 px-2 py-3 overflow-y-auto scrollbar-thin min-h-0">
      <div className="space-y-2">{visibleMenuItems.map((item) => renderNavItem(item))}</div>
    </nav>
  );

  const logoutButton = (
    <div className="shrink-0 border-t border-sidebar-border p-2">
      <button
        onClick={handleLogoutClick}
        className="sidebar-item w-full text-gray-700 hover:text-red-600"
      >
        <span className="text-sm font-semibold">Log out</span>
      </button>
    </div>
  );

  return (
    <>
      {mobileOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/40 lg:hidden"
            aria-label="Close menu"
            onClick={onMobileClose}
          />
          <aside className="fixed left-0 top-0 z-50 flex h-full w-56 flex-col bg-sidebar shadow-xl lg:hidden">
            <div className="flex h-14 shrink-0 items-center border-b border-sidebar-border px-4">
              <span className="text-lg font-semibold lowercase text-gray-600">bookfy</span>
            </div>
            {navContent}
            {logoutButton}
          </aside>
        </>
      ) : null}

      {open ? (
        <aside
          className={cn(
            "hidden lg:flex fixed z-30 bg-sidebar flex-col",
            "left-0 w-52",
          )}
          style={{
            top: desktopHeaderHeight,
            bottom: 0,
          }}
        >
          {navContent}
          {logoutButton}
        </aside>
      ) : null}

      <AlertDialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Log out</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to log out? Your data will remain saved on this device.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLogoutConfirm}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Log out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
