import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { initAudio } from "@/lib/sound";
import Home from "./pages/Home";
import Index from "./pages/Index";
import Products from "./pages/Products";
import AddProduct from "./pages/AddProduct";
import Sales from "./pages/Sales";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import AdminDashboard from "./pages/AdminDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
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

  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/dashboard" element={<Index />} />
          <Route path="/products" element={<Products />} />
          <Route path="/products/add" element={<AddProduct />} />
          <Route path="/sales" element={<Sales />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/admin-dashboard" element={<AdminDashboard />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
          <OfflineIndicator />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);
};

export default App;
