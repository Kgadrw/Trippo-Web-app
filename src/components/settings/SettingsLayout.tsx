import { useEffect, useMemo, useState } from "react";
import { Outlet } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogOut, Save, User, Building2, Mail, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { initAudio, playErrorBeep, playUpdateBeep } from "@/lib/sound";
import { usePinAuth } from "@/hooks/usePinAuth";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useLanguage } from "@/hooks/useLanguage";
import { useTranslation } from "@/hooks/useTranslation";
import { useNavigate } from "react-router-dom";
import { authApi } from "@/lib/api";
import { clearAllStores } from '@/lib/indexedDB';

export function SettingsLayout() {
  const { toast } = useToast();
  const { clearAuth } = usePinAuth();
  const { user, updateUser } = useCurrentUser();
  const { language } = useLanguage();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [ownerName, setOwnerName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [businessName, setBusinessName] = useState(user?.businessName || "");
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    if (user) {
      setOwnerName(user.name || "");
      setEmail(user.email || "");
      setBusinessName(user.businessName || "");
    }
  }, [user]);

  const initials = useMemo(() => {
    const name = (ownerName || user?.name || "").trim();
    if (!name) return "U";
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }, [ownerName, user?.name]);

  const handleSaveProfile = async () => {
    initAudio();

    if (!ownerName.trim()) {
      playErrorBeep();
      toast({
        title: "Validation Error",
        description: "Name is required.",
        variant: "destructive",
      });
      return;
    }

    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      playErrorBeep();
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    const currentUserId = localStorage.getItem("profit-pilot-user-id");
    if (!currentUserId) {
      playErrorBeep();
      toast({
        title: "Session Error",
        description: "User session not found. Please log in again.",
        variant: "destructive",
      });
      return;
    }

    setSavingProfile(true);
    try {
      await authApi.updateUser({
        name: ownerName.trim(),
        email: email.trim() || undefined,
        businessName: businessName.trim() || undefined,
      });

      updateUser({
        name: ownerName.trim(),
        email: email.trim() || undefined,
        businessName: businessName.trim() || undefined,
      });

      playUpdateBeep();
      toast({
        title: language === "rw" ? "Byabitswe" : "Profile Saved",
        description:
          language === "rw"
            ? "Umwirondoro wawe wavuguruwe."
            : "Your profile has been updated.",
      });
    } catch (error: any) {
      playErrorBeep();
      toast({
        title: "Save Failed",
        description: error?.message || "Failed to update profile.",
        variant: "destructive",
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleLogout = async () => {
    initAudio();
    clearAuth();
    localStorage.removeItem("profit-pilot-user-id");
    localStorage.removeItem("profit-pilot-user-name");
    localStorage.removeItem("profit-pilot-user-email");
    localStorage.removeItem("profit-pilot-business-name");
    localStorage.removeItem("profit-pilot-is-admin");
    localStorage.removeItem("profit-pilot-authenticated");
    sessionStorage.clear();

    try {
      /* converted to static import */;
      await clearAllStores();
    } catch (error) {
      console.error("Error clearing IndexedDB on logout:", error);
    }

    window.dispatchEvent(new Event("pin-auth-changed"));
    toast({
      title: language === "rw" ? "Wasohotse" : "Logged Out",
      description:
        language === "rw"
          ? "Wasohotse neza. Amakuru yose yarakurwaho."
          : "You have been successfully logged out.",
    });
    window.history.replaceState(null, "", "/");
    navigate("/", { replace: true });
  };

  return (
    <AppLayout title={t("settings")}>
      <div className="flex min-h-0 w-full flex-1 flex-col pb-4">
        <div className="grid min-h-0 w-full flex-1 grid-cols-1 gap-4 lg:grid-cols-[minmax(260px,300px)_1fr] lg:gap-6 lg:items-stretch">
          <div className="flex flex-col rounded-lg bg-white p-5 lg:min-h-[min(100%,calc(100dvh-7rem))]">
            <div className="flex flex-col items-center lg:items-start">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-600 text-lg font-bold text-white">
                {initials}
              </div>
              <h2 className="mt-4 text-sm font-semibold text-gray-900">
                {language === "rw" ? "Umwirondoro" : language === "fr" ? "Profil" : "Profile"}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {language === "rw"
                  ? "Hindura amakuru yawe"
                  : language === "fr"
                  ? "Modifier vos informations"
                  : "Edit your account details"}
              </p>
            </div>

            <div className="mt-5 space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1.5">
                  <User size={12} className="text-blue-600" />
                  {t("ownerName")}
                </Label>
                <Input
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className="h-10 text-sm"
                  placeholder={t("ownerName")}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1.5">
                  <Building2 size={12} className="text-blue-600" />
                  {t("businessName")}
                </Label>
                <Input
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="h-10 text-sm"
                  placeholder={t("businessName")}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1.5">
                  <Mail size={12} className="text-blue-600" />
                  {t("emailAddress")}
                </Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-10 text-sm"
                  placeholder={t("emailAddress")}
                />
              </div>
              <Button
                onClick={() => void handleSaveProfile()}
                disabled={savingProfile}
                className="w-full gap-2 h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-lg mt-2"
              >
                {savingProfile ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {t("saveChanges")}
              </Button>
            </div>

            <div className="mt-auto pt-6">
              <Button
                onClick={() => void handleLogout()}
                variant="outline"
                className="w-full gap-2 h-11 text-red-600 border-red-300 hover:bg-red-50 hover:border-red-400 font-semibold rounded-lg"
              >
                <LogOut size={18} />
                {t("logout")}
              </Button>
            </div>
          </div>

          <div className="min-h-0 flex flex-col overflow-hidden rounded-lg bg-white lg:min-h-[min(100%,calc(100dvh-7rem))]">
            <Outlet />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
