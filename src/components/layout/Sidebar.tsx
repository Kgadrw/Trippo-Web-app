import { useState, useEffect } from "react";
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

type SidebarMenuItem = {
  label: string;
  path: string;
  matchPrefix?: string;
  sectionKey?: string;
  pageKey?: WorkspacePageKey;
  children?: { label: string; to: string }[];
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
  { label: "Org chart", to: "/hr/org-chart" },
  { label: "Leave", to: "/hr/leave" },
];

const projectChildren = [
  { label: "Overview", to: "/projects" },
  { label: "All projects", to: "/projects/all" },
];

const crmChildren = [
  { label: "Overview", to: "/crm" },
  { label: "Pipeline", to: "/crm/pipeline" },
  { label: "Contacts", to: "/crm/contacts" },
  { label: "Quotes", to: "/crm/quotes" },
  { label: "Contracts", to: "/crm/contracts" },
];

const documentChildren = [
  { label: "Overview", to: "/documents" },
  { label: "Archive", to: "/documents/archive" },
  { label: "Registry", to: "/documents/registry" },
];

const calendarChildren = [
  { label: "Overview", to: "/calendar" },
  { label: "Calendar", to: "/calendar/view" },
  { label: "Automations", to: "/calendar/schedules" },
  { label: "Announcements", to: "/calendar/announcements" },
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
    label: "CRM",
    path: "/crm",
    matchPrefix: "/crm",
    sectionKey: "crm",
    pageKey: "crm",
    children: crmChildren,
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
  {
    label: "Documents",
    path: "/documents",
    matchPrefix: "/documents",
    sectionKey: "documents",
    pageKey: "documents",
    children: documentChildren,
  },
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
  const { mode, canAccessPage } = useWorkspace();
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  const visibleMenuItems = menuItems.filter((item) => {
    if (mode !== "workspace" || !item.pageKey) return true;
    return canAccessPage(item.pageKey);
  });

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
    if (location.pathname.startsWith("/crm")) {
      setOpenSections((prev) => ({ ...prev, crm: true }));
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
              {item.children.map((sub) => {
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
            height: `calc(100vh - ${desktopHeaderHeight}px)`,
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
