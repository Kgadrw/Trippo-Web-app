import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Activity,
  Server,
  Calendar,
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
        className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 lg:hidden"
        style={{ 
          paddingBottom: 'max(1rem, calc(env(safe-area-inset-bottom) + 0.5rem))',
        }}
      >
        <div className="flex items-center justify-around h-16 px-2">
          {adminMenuItems.map((item) => {
            const isActive = activeSection === item.section;
            return (
              <button
                key={item.section}
                onClick={() => onSectionChange(item.section)}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors",
                  isActive 
                    ? "text-blue-600" 
                    : "text-gray-500 hover:text-gray-700"
                )}
              >
                <item.icon 
                  size={22} 
                  className={cn(
                    "transition-colors",
                    isActive ? "text-blue-600" : "text-gray-500"
                  )} 
                />
                <span className={cn(
                  "text-xs font-medium transition-colors",
                  isActive ? "text-blue-600" : "text-gray-500"
                )}>
                  {item.label}
                </span>
              </button>
            );
          })}
          
          {/* Logout Button */}
          <button
            onClick={handleLogoutClick}
            className="flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors text-red-600 hover:text-red-700"
          >
            <LogOut size={22} className="transition-colors" />
            <span className="text-xs font-medium transition-colors">
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
