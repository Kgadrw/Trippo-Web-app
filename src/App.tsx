import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { AddToHomeScreen } from "@/components/AddToHomeScreen";
import { SplashScreen } from "@/components/SplashScreen";
import { NotificationManager } from "@/components/NotificationManager";
import { StockUpdateDialog } from "@/components/StockUpdateDialog";
import { WebSocketProvider } from "@/components/WebSocketProvider";
import { useSyncReminder } from "@/hooks/useSyncReminder";
import { initAudio } from "@/lib/sound";
import { LanguageProvider } from "@/hooks/useLanguage";
import { ThemeProvider } from "@/hooks/useTheme";
import { useSubdomain, getSubdomainUrl } from "@/hooks/useSubdomain";
import Home from "./pages/Home";

// Component to handle cross-domain redirects
// Only redirects if user is authenticated
const SubdomainRedirect = ({ subdomain }: { subdomain: 'admin' | 'dashboard' }) => {
  useEffect(() => {
    const userId = localStorage.getItem("profit-pilot-user-id");
    const authenticated = localStorage.getItem("profit-pilot-authenticated") === "true";
    const isAdmin = localStorage.getItem("profit-pilot-is-admin") === "true";
    
    // Only redirect if authenticated
    if (userId && authenticated) {
      // For admin subdomain, check if user is admin
      if (subdomain === 'admin' && isAdmin && userId === "admin") {
        const url = getSubdomainUrl(subdomain);
        window.location.href = url;
        return;
      }
      // For dashboard subdomain, allow any authenticated user
      if (subdomain === 'dashboard') {
        const url = getSubdomainUrl(subdomain);
        window.location.href = url;
        return;
      }
    }
    
    // If not authenticated or wrong role, redirect to home
    const homeUrl = getSubdomainUrl(null);
    if (window.location.hostname !== new URL(homeUrl).hostname) {
      window.location.href = homeUrl;
    }
  }, [subdomain]);
  return null;
};
import Index from "./pages/Index";
import Products from "./pages/Products";
import AddProduct from "./pages/AddProduct";
import Sales from "./pages/Sales";
import Clients from "./pages/Clients";
import Schedules from "./pages/Schedules";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import AdminDashboard from "./pages/AdminDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Subdomain-based router component
const SubdomainRouter = () => {
  const subdomain = useSubdomain();

  // Prevent Home page from being accessed on subdomains
  // If on subdomain, only show protected routes, no Home page
  if (subdomain === 'admin') {
    return (
      <Routes>
        <Route 
          path="/" 
          element={
            <ProtectedRoute requireAdmin={true}>
              <AdminDashboard />
            </ProtectedRoute>
          } 
        />
        {/* Allow other routes to work on admin subdomain too */}
        <Route 
          path="/products" 
          element={
            <ProtectedRoute requireAdmin={true}>
              <Products />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/products/add" 
          element={
            <ProtectedRoute requireAdmin={true}>
              <AddProduct />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/sales" 
          element={
            <ProtectedRoute requireAdmin={true}>
              <Sales />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/clients" 
          element={
            <ProtectedRoute requireAdmin={true}>
              <Clients />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/schedules" 
          element={
            <ProtectedRoute requireAdmin={true}>
              <Schedules />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/reports" 
          element={
            <ProtectedRoute requireAdmin={true}>
              <Reports />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/settings"
          element={
            <ProtectedRoute requireAdmin={true}>
              <Settings />
            </ProtectedRoute>
          } 
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
    );
  }

  // If on dashboard subdomain, show user dashboard at root, but allow other routes
  if (subdomain === 'dashboard') {
    return (
      <Routes>
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <Index />
            </ProtectedRoute>
          } 
        />
        {/* Allow other routes to work on dashboard subdomain */}
        <Route 
          path="/products" 
          element={
            <ProtectedRoute>
              <Products />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/products/add" 
          element={
            <ProtectedRoute>
              <AddProduct />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/sales" 
          element={
            <ProtectedRoute>
              <Sales />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/clients" 
          element={
            <ProtectedRoute>
              <Clients />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/schedules" 
          element={
            <ProtectedRoute>
              <Schedules />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/reports" 
          element={
            <ProtectedRoute>
              <Reports />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/settings"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          } 
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
    );
  }

  // Main domain - use normal routing
  // Only allow Home page on main domain (trippo.rw)
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      {/* Redirect old paths to appropriate subdomains (only if authenticated) */}
      <Route 
        path="/dashboard" 
        element={<SubdomainRedirect subdomain="dashboard" />} 
      />
      <Route 
        path="/admin-dashboard" 
        element={<SubdomainRedirect subdomain="admin" />} 
      />
      <Route 
        path="/products" 
        element={
          <ProtectedRoute>
            <Products />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/products/add" 
        element={
          <ProtectedRoute>
            <AddProduct />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/sales" 
        element={
          <ProtectedRoute>
            <Sales />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/clients" 
        element={
          <ProtectedRoute>
            <Clients />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/schedules" 
        element={
          <ProtectedRoute>
            <Schedules />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/reports" 
        element={
          <ProtectedRoute>
            <Reports />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/settings"
        element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        } 
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => {
  // State for stock update dialog from notification
  const [stockUpdateDialogOpen, setStockUpdateDialogOpen] = useState(false);
  const [stockUpdateProductId, setStockUpdateProductId] = useState<string | number | null>(null);
  const [stockUpdateProductName, setStockUpdateProductName] = useState<string | undefined>(undefined);
  const [stockUpdateCurrentStock, setStockUpdateCurrentStock] = useState<number | undefined>(undefined);
  const [stockUpdateMinStock, setStockUpdateMinStock] = useState<number | undefined>(undefined);

  // Restore authentication from URL hash when arriving from main domain
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.startsWith('#auth=')) {
      try {
        const authToken = hash.substring(6); // Remove '#auth='
        const authData = JSON.parse(atob(authToken));
        
        // Import and use cross-subdomain auth storage
        import("@/lib/authStorage").then(({ setAuthValue }) => {
          // Restore auth data in cross-subdomain storage (cookies + localStorage)
          if (authData.userId) {
            setAuthValue("profit-pilot-user-id", authData.userId);
          }
          if (authData.isAdmin !== undefined) {
            setAuthValue("profit-pilot-is-admin", String(authData.isAdmin));
          }
          if (authData.authenticated !== undefined) {
            setAuthValue("profit-pilot-authenticated", String(authData.authenticated));
          }
          if (authData.name) {
            setAuthValue("profit-pilot-user-name", authData.name);
          }
          if (authData.email) {
            setAuthValue("profit-pilot-user-email", authData.email);
          }
          if (authData.businessName) {
            setAuthValue("profit-pilot-business-name", authData.businessName);
          }
          
          // Clear the hash from URL
          window.history.replaceState(null, '', window.location.pathname);
          
          // Dispatch auth change event
          window.dispatchEvent(new Event("pin-auth-changed"));
          window.dispatchEvent(new Event("user-data-changed"));
          
          console.log('[App] ✅ Authentication restored from URL hash');
        });
      } catch (error) {
        console.error('[App] ❌ Failed to restore auth from URL hash:', error);
        // Clear invalid hash
        window.history.replaceState(null, '', window.location.pathname);
      }
    }
  }, []);

  // Enable sync reminder notifications
  useSyncReminder();

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
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ThemeProvider>
          <LanguageProvider>
            <WebSocketProvider>
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
            </WebSocketProvider>
          </LanguageProvider>
        </ThemeProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);
};

export default App;
