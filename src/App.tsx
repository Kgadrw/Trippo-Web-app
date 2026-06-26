import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { AddToHomeScreen } from "@/components/AddToHomeScreen";
import { SplashScreen } from "@/components/SplashScreen";
import { NotificationManager } from "@/components/NotificationManager";
import { StockUpdateDialog } from "@/components/StockUpdateDialog";
import { WebSocketProvider } from "@/components/WebSocketProvider";
import { SubscriptionProvider } from "@/hooks/useSubscriptionAccess";
import { useSyncReminder } from "@/hooks/useSyncReminder";
import { useSyncUserProfile } from "@/hooks/useSyncUserProfile";
import { initAudio } from "@/lib/sound";
import { LanguageProvider } from "@/hooks/useLanguage";
import { ThemeProvider } from "@/hooks/useTheme";
import { useSubdomain, getSubdomainUrl, redirectLegacyDashboardHost } from "@/hooks/useSubdomain";
import { applyLogoutQueryParamIfPresent } from "@/lib/session";
import { GoogleOAuthProvider } from "@react-oauth/google";
import Home from "./pages/Home";

// Component to handle cross-domain redirects
// Only redirects if user is authenticated
const SubdomainRedirect = ({ subdomain }: { subdomain: "admin" | "bookfy" }) => {
  useEffect(() => {
    const userId = localStorage.getItem("profit-pilot-user-id");
    const authenticated = localStorage.getItem("profit-pilot-authenticated") === "true";
    const isAdmin = localStorage.getItem("profit-pilot-is-admin") === "true";

    if (userId && authenticated) {
      if (subdomain === "admin" && isAdmin) {
        window.location.href = getSubdomainUrl("admin", "/");
        return;
      }
      if (subdomain === "bookfy") {
        window.location.href = getSubdomainUrl("bookfy");
        return;
      }
    }

    if (subdomain === "admin") {
      window.location.href = getSubdomainUrl("admin", "/login");
      return;
    }

    const homeUrl = getSubdomainUrl(null);
    if (window.location.hostname !== new URL(homeUrl).hostname) {
      window.location.href = homeUrl;
    }
  }, [subdomain]);
  return null;
};

/** Send main-domain app URLs to the bookfy subdomain (preserves path). */
const BookfySubdomainRedirect = () => {
  useEffect(() => {
    const path = window.location.pathname;
    const search = window.location.search;
    const hash = window.location.hash;
    const normalizedPath = path === "/dashboard" ? "/" : path;
    const target = `${normalizedPath}${search}${hash}`;

    const userId = localStorage.getItem("profit-pilot-user-id");
    const authenticated = localStorage.getItem("profit-pilot-authenticated") === "true";

    if (userId && authenticated) {
      window.location.replace(getSubdomainUrl("bookfy", target));
      return;
    }

    window.location.replace(getSubdomainUrl(null));
  }, []);
  return null;
};
import Index from "./pages/Index";
import Reports from "./pages/Reports";
import { FinanceLayout } from "./components/finance/FinanceLayout";
import FinanceIncome from "./pages/finance/FinanceIncome";
import FinanceExpenditure from "./pages/finance/FinanceExpenditure";
import FinancePayroll from "./pages/finance/FinancePayroll";
import FinanceBills from "./pages/finance/FinanceBills";
import FinanceTaxes from "./pages/finance/FinanceTaxes";
import FinanceBankDeposits from "./pages/finance/FinanceBankDeposits";
import FinanceCustomers from "./pages/finance/FinanceCustomers";
import FinanceInvoices from "./pages/finance/FinanceInvoices";
import FinanceVendors from "./pages/finance/FinanceVendors";
import FinanceAccounts from "./pages/finance/FinanceAccounts";
import FinanceStatements from "./pages/finance/FinanceStatements";
import FinanceReconciliation from "./pages/finance/FinanceReconciliation";
import FinanceBudgets from "./pages/finance/FinanceBudgets";
import FinanceLoans from "./pages/finance/FinanceLoans";
import FinanceTransactions from "./pages/finance/FinanceTransactions";
import Products from "./pages/Products";
import Sales from "./pages/Sales";
import Documents from "./pages/Documents";
import Schedules from "./pages/Schedules";
import BusinessCalendar from "./pages/BusinessCalendar";
import { TeamLayout } from "./components/team/TeamLayout";
import TeamOverview from "./pages/team/TeamOverview";
import TeamTasks from "./pages/team/TeamTasks";
import TeamTasksFinance from "./pages/team/TeamTasksFinance";
import TeamMembers from "./pages/team/TeamMembers";
import SettingsModalRoute from "./pages/settings/SettingsModalRoute";
import { SettingsModalProvider } from "@/components/settings/SettingsModalProvider";
import { PageSearchProvider } from "@/hooks/usePageSearch";
import Billing from "./pages/Billing";
import AdminDashboard from "./pages/AdminDashboard";
import AdminLogin from "./pages/AdminLogin";
import NotFound from "./pages/NotFound";
import VerifyTicket from "./pages/VerifyTicket";
import WorkspaceInviteAccept from "./pages/WorkspaceInviteAccept";
import { WorkspaceProvider } from "@/hooks/useWorkspace";
import { WorkspaceActivityListener } from "@/components/workspace/WorkspaceActivityListener";

const queryClient = new QueryClient();

// Subdomain-based router component
const SubdomainRouter = () => {
  const subdomain = useSubdomain();

  // Prevent Home page from being accessed on subdomains
  // If on subdomain, only show protected routes, no Home page
  if (subdomain === 'admin') {
    return (
      <Routes>
        <Route path="/login" element={<AdminLogin />} />
        <Route
          path="/"
          element={
            <ProtectedRoute requireAdmin={true}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  if (subdomain === "bookfy") {
    return (
      <Routes>
        <Route path="/workspace/invite/:token" element={<WorkspaceInviteAccept />} />
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
        <Route 
          path="/" 
          element={<Index />} 
        />
        <Route path="/dashboard" element={<Navigate to="/" replace />} />
        <Route
          path="/finance"
          element={<FinanceLayout />}
        >
          <Route index element={<Navigate to="/finance/income" replace />} />
          <Route path="income" element={<FinanceIncome />} />
          <Route path="customers" element={<FinanceCustomers />} />
          <Route path="invoices" element={<FinanceInvoices />} />
          <Route path="vendors" element={<FinanceVendors />} />
          <Route path="deposits" element={<FinanceBankDeposits />} />
          <Route path="accounts" element={<FinanceAccounts />} />
          <Route path="statements" element={<FinanceStatements />} />
          <Route path="reconciliation" element={<FinanceReconciliation />} />
          <Route path="budgets" element={<FinanceBudgets />} />
          <Route path="loans" element={<FinanceLoans />} />
          <Route path="bills" element={<FinanceBills />} />
          <Route path="taxes" element={<FinanceTaxes />} />
          <Route path="expenditure" element={<FinanceExpenditure />} />
          <Route path="payroll" element={<FinancePayroll />} />
          <Route path="transactions" element={<FinanceTransactions />} />
        </Route>
        <Route path="/income" element={<Navigate to="/finance/income" replace />} />
        <Route path="/expenses" element={<Navigate to="/finance/expenditure" replace />} />
        <Route 
          path="/reports" 
          element={<Reports />} 
        />
        <Route
          path="/sales"
          element={<Sales />}
        />
        <Route
          path="/products"
          element={<Products />}
        />
        <Route
          path="/documents"
          element={<Documents />}
        />
        <Route
          path="/schedules"
          element={<Schedules />}
        />
        <Route
          path="/calendar"
          element={<BusinessCalendar />}
        />
        <Route
          path="/team"
          element={<TeamLayout />}
        >
          <Route index element={<TeamOverview />} />
          <Route path="tasks" element={<TeamTasks />} />
          <Route path="tasks/finance" element={<TeamTasksFinance />} />
          <Route path="members" element={<TeamMembers />} />
        </Route>
        <Route
          path="/billing"
          element={<Billing />}
        />
        <Route
          path="/settings/*"
          element={<SettingsModalRoute />}
        />
        <Route path="/clients" element={<Navigate to="/schedules" replace />} />
        <Route path="/inventories" element={<Navigate to="/products" replace />} />
        <Route path="/add-product" element={<Navigate to="/products" replace />} />
        <Route path="/bookings" element={<Navigate to="/" replace />} />
        <Route path="/barbers" element={<Navigate to="/" replace />} />
        <Route path="/workers" element={<Navigate to="/" replace />} />
        <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    );
  }

  const mainDomainAppRedirect = <BookfySubdomainRedirect />;

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/verify" element={<VerifyTicket />} />
      <Route path="/workspace/invite/:token" element={<WorkspaceInviteAccept />} />
      <Route path="/admin-dashboard" element={<SubdomainRedirect subdomain="admin" />} />
      <Route path="/dashboard" element={mainDomainAppRedirect} />
      <Route path="/reports" element={mainDomainAppRedirect} />
      <Route path="/sales" element={mainDomainAppRedirect} />
      <Route path="/products" element={mainDomainAppRedirect} />
      <Route path="/documents" element={mainDomainAppRedirect} />
      <Route path="/schedules" element={mainDomainAppRedirect} />
      <Route path="/calendar" element={mainDomainAppRedirect} />
      <Route path="/team/*" element={mainDomainAppRedirect} />
      <Route path="/finance/*" element={mainDomainAppRedirect} />
      <Route path="/income" element={mainDomainAppRedirect} />
      <Route path="/expenses" element={mainDomainAppRedirect} />
      <Route path="/billing" element={mainDomainAppRedirect} />
      <Route path="/settings/*" element={mainDomainAppRedirect} />
      <Route path="/clients" element={mainDomainAppRedirect} />
      <Route path="/inventories" element={mainDomainAppRedirect} />
      <Route path="/add-product" element={mainDomainAppRedirect} />
      <Route path="/bookings" element={mainDomainAppRedirect} />
      <Route path="/barbers" element={mainDomainAppRedirect} />
      <Route path="/workers" element={mainDomainAppRedirect} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => {
  if (typeof window !== "undefined") {
    redirectLegacyDashboardHost();
    applyLogoutQueryParamIfPresent();
  }

  // State for stock update dialog from notification
  const [stockUpdateDialogOpen, setStockUpdateDialogOpen] = useState(false);
  const [stockUpdateProductId, setStockUpdateProductId] = useState<string | number | null>(null);
  const [stockUpdateProductName, setStockUpdateProductName] = useState<string | undefined>(undefined);
  const [stockUpdateCurrentStock, setStockUpdateCurrentStock] = useState<number | undefined>(undefined);
  const [stockUpdateMinStock, setStockUpdateMinStock] = useState<number | undefined>(undefined);

  // Restore authentication from URL hash when arriving from main domain
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("logout") === "1") {
      return;
    }

    const hash = window.location.hash;
    if (hash && hash.startsWith('#auth=')) {
      try {
        const authToken = hash.substring(6); // Remove '#auth='
        const authData = JSON.parse(atob(authToken));
        
        // Restore localStorage from auth data
        if (authData.userId) {
          localStorage.setItem("profit-pilot-user-id", authData.userId);
        }
        if (authData.isAdmin !== undefined) {
          localStorage.setItem("profit-pilot-is-admin", String(authData.isAdmin));
        }
        if (authData.authenticated !== undefined) {
          localStorage.setItem("profit-pilot-authenticated", String(authData.authenticated));
        }
        if (authData.name) {
          localStorage.setItem("profit-pilot-user-name", authData.name);
        }
        if (authData.email) {
          localStorage.setItem("profit-pilot-user-email", authData.email);
        }
        if (authData.businessName) {
          localStorage.setItem("profit-pilot-business-name", authData.businessName);
        }
        if (authData.profilePictureUrl) {
          localStorage.setItem("profit-pilot-profile-picture-url", authData.profilePictureUrl);
        }
        
        // Clear the hash from URL
        window.history.replaceState(null, '', window.location.pathname);
        
        // Dispatch auth change event
        window.dispatchEvent(new Event("pin-auth-changed"));
        window.dispatchEvent(new Event("user-data-changed"));
        
        console.log('[App] ✅ Authentication restored from URL hash');
      } catch (error) {
        console.error('[App] ❌ Failed to restore auth from URL hash:', error);
        // Clear invalid hash
        window.history.replaceState(null, '', window.location.pathname);
      }
    }
  }, []);

  // Enable sync reminder notifications
  useSyncReminder();
  useSyncUserProfile();

  // Initialize audio on app load
  useEffect(() => {
    // Initialize audio context on first user interaction
    const initAudioOnInteraction = () => {
      initAudio();
      // Remove listeners after initialization
      document.removeEventListener('click', initAudioOnInteraction);
      document.removeEventListener('keydown', initAudioOnInteraction);
      document.removeEventListener('touchstart', initAudioOnInteraction);
    };

    // Try to initialize immediately
    initAudio();

    // Also listen for user interactions to ensure audio is ready
    document.addEventListener('click', initAudioOnInteraction, { once: true });
    document.addEventListener('keydown', initAudioOnInteraction, { once: true });
    document.addEventListener('touchstart', initAudioOnInteraction, { once: true });

    return () => {
      document.removeEventListener('click', initAudioOnInteraction);
      document.removeEventListener('keydown', initAudioOnInteraction);
      document.removeEventListener('touchstart', initAudioOnInteraction);
    };
  }, []);

  // Listen for service worker messages (notification clicks)
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      const handleMessage = (event: MessageEvent) => {
        if (event.data && event.data.type === 'SHOW_STOCK_UPDATE') {
          setStockUpdateProductId(event.data.productId);
          setStockUpdateProductName(event.data.productName);
          setStockUpdateCurrentStock(event.data.currentStock);
          setStockUpdateMinStock(event.data.minStock);
          setStockUpdateDialogOpen(true);
        }
      };

      navigator.serviceWorker.addEventListener('message', handleMessage);

      return () => {
        navigator.serviceWorker.removeEventListener('message', handleMessage);
      };
    }
  }, []);

  return (
  <QueryClientProvider client={queryClient}>
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || ""}>
    <TooltipProvider>
      <Toaster />
      <BrowserRouter>
        <ThemeProvider>
          <LanguageProvider>
            <SettingsModalProvider>
            <PageSearchProvider>
            <WebSocketProvider>
              <SubscriptionProvider>
              <WorkspaceProvider>
              <WorkspaceActivityListener />
              <SplashScreen />
              <SubdomainRouter />
            <OfflineIndicator />
            <NotificationManager />
            <StockUpdateDialog
              productId={stockUpdateProductId}
              productName={stockUpdateProductName}
              currentStock={stockUpdateCurrentStock}
              open={stockUpdateDialogOpen}
              onOpenChange={setStockUpdateDialogOpen}
            />
              </WorkspaceProvider>
              </SubscriptionProvider>
            </WebSocketProvider>
            </PageSearchProvider>
            </SettingsModalProvider>
          </LanguageProvider>
        </ThemeProvider>
      </BrowserRouter>
    </TooltipProvider>
    </GoogleOAuthProvider>
  </QueryClientProvider>
);
};

export default App;
