import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Activity,
  Server,
  Calendar,
  Bell,
  LogOut,
} from "lucide-react";
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

const adminMenuItems = [
  { icon: LayoutDashboard, label: "Overview", section: "overview" },
  { icon: Users, label: "Users", section: "users" },
  { icon: Activity, label: "Activity", section: "activity" },
  { icon: Calendar, label: "Schedules", section: "schedules" },
  { icon: Bell, label: "Alerts", section: "notifications" },
  { icon: Server, label: "System Health", section: "health" },
];

interface AdminBottomNavProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

export function AdminBottomNav({ activeSection, onSectionChange }: AdminBottomNavProps) {
  const navigate = useNavigate();
  const { clearAuth } = usePinAuth();
  const { toast } = useToast();
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);

  const handleLogoutClick = () => {
    setLogoutDialogOpen(true);
  };

  const handleLogoutConfirm = () => {
    // Clear authentication state
    clearAuth();
    
    // Clear user ID
    localStorage.removeItem("profit-pilot-user-id");
    
    // Clear session storage
    sessionStorage.clear();
    
    // Clear admin flag and authentication
    localStorage.removeItem("profit-pilot-is-admin");
    localStorage.removeItem("profit-pilot-authenticated");
    
    // Show logout confirmation
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out.",
    });
    
    // Redirect to homepage
    navigate("/");
    setLogoutDialogOpen(false);
  };

  return (
    <>
      <nav 
        className="fixed bottom-4 left-3 right-3 z-50 rounded-2xl border border-blue-500/40 bg-blue-600 shadow-md shadow-blue-900/20 lg:hidden"
        style={{ 
          paddingBottom: 'max(0.5rem, calc(env(safe-area-inset-bottom) + 0.25rem))',
        }}
      >
        <div className="flex h-14 items-center justify-around px-1.5">
          {adminMenuItems.map((item) => {
            const isActive = activeSection === item.section;
            return (
              <button
                key={item.section}
                onClick={() => onSectionChange(item.section)}
                className={cn(
                  "flex flex-1 flex-col items-center justify-center gap-0.5 py-1 transition-colors",
                  isActive 
                    ? "text-white" 
                    : "text-blue-200 hover:text-white"
                )}
              >
                <item.icon 
                  size={20} 
                  className={cn(
                    "transition-colors",
                    isActive ? "text-white" : "text-blue-200"
                  )} 
                />
                <span className={cn(
                  "text-[11px] font-medium leading-tight transition-colors",
                  isActive ? "text-white" : "text-blue-200"
                )}>
                  {item.label}
                </span>
              </button>
            );
          })}
          
          {/* Logout Button */}
          <button
            onClick={handleLogoutClick}
            className="flex flex-1 flex-col items-center justify-center gap-0.5 py-0.5 transition-colors text-red-200 hover:text-red-100"
          >
            <LogOut size={20} className="transition-colors" />
            <span className="text-[11px] font-medium leading-tight transition-colors">
              Logout
            </span>
          </button>
        </div>
      </nav>

      {/* Logout Confirmation Dialog */}
      <AlertDialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Logout</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to logout? You will need to login again to access the admin dashboard.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLogoutConfirm}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Logout
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
