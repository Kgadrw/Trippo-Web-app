import { useState, useEffect } from "react";
import { User, Menu, Mail, Building2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface HeaderProps {
  title: string;
  onMenuClick?: () => void;
  showMenuButton?: boolean;
  sidebarCollapsed?: boolean;
}

export function Header({ title, onMenuClick, showMenuButton, sidebarCollapsed = false }: HeaderProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const { user } = useCurrentUser();
  
  // Check if user is admin
  const isAdmin = localStorage.getItem("profit-pilot-is-admin") === "true";

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const today = currentTime.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const time = currentTime.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  // Get user initials for avatar
  const getUserInitials = () => {
    if (user?.name) {
      const names = user.name.split(" ");
      if (names.length >= 2) {
        return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
      }
      return user.name.substring(0, 2).toUpperCase();
    }
    return "U";
  };

  return (
    <header className={cn(
      "fixed top-0 left-0 right-0 h-16 bg-white border-b border-transparent shadow-sm flex items-center justify-between px-6 z-50 transition-all duration-300",
      "lg:left-64",
      sidebarCollapsed && "lg:left-16"
    )}>
      <div className="flex items-center gap-4">
        {showMenuButton && (
          <button
            onClick={onMenuClick}
            className="p-2 hover:bg-gray-50 text-gray-700 transition-colors lg:hidden"
          >
            <Menu size={20} />
          </button>
        )}
        <div>
          <h1 className="text-xl font-bold text-gray-800">{title}</h1>
          <p className="text-sm text-gray-500">{today} • {time}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => setProfileModalOpen(true)}
          className="flex items-center gap-3 hover:bg-gray-50 rounded-lg px-2 py-1 transition-colors"
        >
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold text-gray-800">
              {isAdmin ? "Admin" : (user?.name || "User")}
            </p>
            <p className="text-xs text-gray-500">
              {isAdmin ? "System Administrator" : (user?.businessName || user?.email || "My Trading Co.")}
            </p>
          </div>
          <Avatar className="h-10 w-10 border border-transparent cursor-pointer">
            <AvatarFallback className={isAdmin ? "bg-purple-500 text-white font-bold" : "bg-gray-500 text-white font-bold"}>
              {isAdmin ? "A" : getUserInitials()}
            </AvatarFallback>
          </Avatar>
        </button>
      </div>

      {/* Profile Modal */}
      <Dialog open={profileModalOpen} onOpenChange={setProfileModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User size={20} className={isAdmin ? "text-purple-600" : "text-gray-600"} />
              {isAdmin ? "Admin Profile" : "Profile Information"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-center">
              <Avatar className={cn("h-20 w-20 border-2", isAdmin ? "border-purple-500" : "border-gray-500")}>
                <AvatarFallback className={cn("text-white font-bold text-2xl", isAdmin ? "bg-purple-500" : "bg-gray-500")}>
                  {isAdmin ? "A" : getUserInitials()}
                </AvatarFallback>
              </Avatar>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <User size={18} className="text-gray-500 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs text-gray-500 mb-1">Owner Name</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {user?.name || "Not set"}
                  </p>
                </div>
              </div>

              {user?.email && (
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <Mail size={18} className="text-gray-500 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 mb-1">Email Address</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {user.email}
                    </p>
                  </div>
                </div>
              )}

              {user?.businessName && (
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <Building2 size={18} className="text-gray-500 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 mb-1">Business Name</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {user.businessName}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
}
