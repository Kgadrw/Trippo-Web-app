import { useEffect, useMemo, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { initAudio, playErrorBeep, playUpdateBeep } from "@/lib/sound";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useTranslation } from "@/hooks/useTranslation";
import { authApi } from "@/lib/api";

export function SettingsLayout() {
  const location = useLocation();
  const { toast } = useToast();
  const { user, updateUser } = useCurrentUser();
  const { t } = useTranslation();
  const isSettingsIndex = location.pathname === "/settings";

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
        title: t("validationErrorTitle"),
        description: t("nameRequired"),
        variant: "destructive",
      });
      return;
    }

    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      playErrorBeep();
      toast({
        title: t("invalidEmailTitle"),
        description: t("invalidEmailDescMsg"),
        variant: "destructive",
      });
      return;
    }

    const currentUserId = localStorage.getItem("profit-pilot-user-id");
    if (!currentUserId) {
      playErrorBeep();
      toast({
        title: t("sessionErrorTitle"),
        description: t("sessionNotFoundDesc"),
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
        title: t("profileSavedTitle"),
        description: t("profileSavedDesc"),
      });
    } catch (error: any) {
      playErrorBeep();
      toast({
        title: t("saveFailed"),
        description: error?.message || t("profileUpdateFailedDesc"),
        variant: "destructive",
      });
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <AppLayout title={t("settings")}>
      <div className="flex flex-col min-h-0 pb-4 lg:pb-4">
        <div className="lg:bg-white lg:flex-1 lg:flex lg:flex-col lg:min-h-0 lg:overflow-hidden rounded-lg">
          {isSettingsIndex && (
            <div className="lg:bg-white lg:border-b lg:border-gray-200 lg:px-4 lg:py-4 flex-shrink-0 mb-4 lg:mb-0">
              <div className="rounded-lg border border-gray-200 bg-white p-4 lg:border-0 lg:bg-transparent lg:p-0">
                <div className="flex flex-col gap-3 lg:flex-row lg:flex-nowrap lg:items-end lg:gap-3 lg:overflow-x-auto">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                    {initials}
                  </div>

                  <div className="w-full lg:min-w-[140px] lg:flex-1 space-y-1.5">
                    <Label className="text-xs font-medium text-gray-600 whitespace-nowrap">{t("ownerName")}</Label>
                    <Input
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      className="h-10 text-sm"
                      placeholder={t("ownerName")}
                    />
                  </div>

                  <div className="w-full lg:min-w-[140px] lg:flex-1 space-y-1.5">
                    <Label className="text-xs font-medium text-gray-600 whitespace-nowrap">{t("businessName")}</Label>
                    <Input
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      className="h-10 text-sm"
                      placeholder={t("businessName")}
                    />
                  </div>

                  <div className="w-full lg:min-w-[160px] lg:flex-1 space-y-1.5">
                    <Label className="text-xs font-medium text-gray-600 whitespace-nowrap">{t("emailAddress")}</Label>
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
                    className="w-full lg:w-auto shrink-0 gap-2 h-10 bg-primary text-white hover:bg-blue-700 rounded-lg px-4"
                  >
                    {savingProfile ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    <span>{t("saveChanges")}</span>
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="flex-1 min-h-0 overflow-auto pb-4">
            <Outlet />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
