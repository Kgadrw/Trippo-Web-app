import { useState, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { cn } from "@/lib/utils";

interface AppLayoutProps {
  children: React.ReactNode;
  title: string;
}

export function AppLayout({ children, title }: AppLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Handle responsive sidebar
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarCollapsed(true);
        setMobileMenuOpen(false);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleMenuToggle = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header with Menu Button */}
      <Header
        title={title}
        showMenuButton={true}
        onMenuClick={handleMenuToggle}
        sidebarCollapsed={sidebarCollapsed}
      />

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "lg:block",
        mobileMenuOpen ? "block" : "hidden"
      )}>
        <Sidebar
          collapsed={sidebarCollapsed && !mobileMenuOpen}
          onToggle={() => {
            if (window.innerWidth < 1024) {
              setMobileMenuOpen(false);
            } else {
              setSidebarCollapsed(!sidebarCollapsed);
            }
          }}
          onMobileClose={() => setMobileMenuOpen(false)}
        />
      </div>

      {/* Main content */}
      <div
        className={cn(
          "transition-all duration-300 pt-16",
          sidebarCollapsed ? "lg:ml-16" : "lg:ml-64"
        )}
      >
        <main className="p-6 pt-6 animate-fade-in">{children}</main>
      </div>
    </div>
  );
}
