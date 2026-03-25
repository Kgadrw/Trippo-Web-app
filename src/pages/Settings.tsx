import { useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  Building2, 
  User, 
  Shield,
  Globe,
  Trash2,
  LogOut,
  Bell,
  ChevronRight
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { initAudio } from "@/lib/sound";
import { usePinAuth } from "@/hooks/usePinAuth";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useLanguage } from "@/hooks/useLanguage";
import { useTranslation } from "@/hooks/useTranslation";
import { useNavigate } from "react-router-dom";

const Settings = () => {
  const { toast } = useToast();
  const { clearAuth } = usePinAuth();
  const { user } = useCurrentUser();
  const { language } = useLanguage();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const handleLogoutConfirm = async () => {
    initAudio();
    // Clear authentication state
    clearAuth();
    
    // Clear user ID and all user data
    localStorage.removeItem("profit-pilot-user-id");
    localStorage.removeItem("profit-pilot-user-name");
    localStorage.removeItem("profit-pilot-user-email");
    localStorage.removeItem("profit-pilot-business-name");
    localStorage.removeItem("profit-pilot-is-admin");
    localStorage.removeItem("profit-pilot-authenticated");
    
    // Clear session storage completely
    sessionStorage.clear();
    
    // Clear IndexedDB data (for complete data isolation)
    try {
      const { clearAllStores } = await import("@/lib/indexedDB");
      await clearAllStores();
    } catch (error) {
      console.error("Error clearing IndexedDB on logout:", error);
    }
    
    // Dispatch authentication change event
    window.dispatchEvent(new Event("pin-auth-changed"));
    
    // Show logout confirmation
    toast({
      title: language === "rw" ? "Wasohotse" : "Logged Out",
      description: language === "rw" 
        ? "Wasohotse neza. Amakuru yose yarakurwaho." 
        : "You have been successfully logged out. All your data has been cleared.",
    });
    
    setLogoutDialogOpen(false);
    
    // Clear browser history and redirect to homepage
    window.history.replaceState(null, "", "/");
    
    // Navigate to home page
    navigate("/", { replace: true });
  };

  const initials = useMemo(() => {
    const name = (user?.name || "").trim();
    if (!name) return "U";
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }, [user?.name]);

  const ownerName = user?.name || "";
  const email = user?.email || "";

  const items = [
    { key: "business", icon: Building2, label: t("businessInfo"), to: "/settings/business", tone: "blue" as const },
    { key: "language", icon: Globe, label: t("language"), to: "/settings/language", tone: "blue" as const },
    { key: "security", icon: Shield, label: t("security"), to: "/settings/security", tone: "blue" as const },
    {
      key: "notifications",
      icon: Bell,
      label: language === "rw" ? "Amatangazo" : language === "fr" ? "Notifications" : "Notifications",
      to: "/settings/notifications",
      tone: "blue" as const,
    },
    {
      key: "delete",
      icon: Trash2,
      label: language === "rw" ? "Kuraho Konti" : language === "fr" ? "Supprimer le compte" : "Delete Account",
      to: "/settings/delete-account",
      tone: "red" as const,
    },
  ];

  return (
    <AppLayout title={t("settings")}>
      <div className="max-w-3xl mx-auto space-y-4">
        {/* Header (no cover image) */}
        <div className="rounded-lg border border-gray-200 bg-white/80 backdrop-blur-sm p-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-gray-900 truncate">{ownerName}</div>
              <div className="text-xs text-gray-600 truncate">{email}</div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white/80 backdrop-blur-sm overflow-hidden">
          {items.map((it, idx) => {
            const Icon = it.icon;
            const isRed = it.tone === "red";
            return (
              <button
                key={it.key}
                type="button"
                onClick={() => navigate(it.to)}
                className={cn(
                  "w-full text-left px-4 py-3 flex items-center gap-3 transition-colors",
                  idx !== 0 && "border-t border-gray-200",
                  isRed ? "hover:bg-red-50" : "hover:bg-blue-50"
                )}
              >
                <div
                  className={cn(
                    "h-9 w-9 rounded-full flex items-center justify-center border",
                    isRed ? "bg-red-50 border-red-200" : "bg-blue-50 border-blue-200"
                  )}
                >
                  <Icon size={16} className={cn(isRed ? "text-red-600" : "text-blue-600")} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className={cn("text-sm font-medium truncate", isRed ? "text-red-700" : "text-gray-900")}>
                    {it.label}
                  </div>
                </div>
                <ChevronRight size={18} className="text-gray-400" />
              </button>
            );
          })}
        </div>

        <Separator />

        <Button
          onClick={handleLogoutConfirm}
          variant="outline"
          className="w-full gap-2 h-12 text-red-600 border-red-300 hover:bg-red-50 hover:border-red-400 transition-all font-semibold rounded-lg"
        >
          <LogOut size={18} />
          {t("logout")}
        </Button>
      </div>
    </AppLayout>
  );
};

export default Settings;
