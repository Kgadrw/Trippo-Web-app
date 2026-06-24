import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, Phone, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { authApi } from "@/lib/api";
import { playErrorBeep, playUpdateBeep, initAudio } from "@/lib/sound";
import { SettingsSubpageHeader } from "@/components/settings/SettingsSubpageHeader";

export default function SettingsBusiness({ embedded = false }: { embedded?: boolean }) {
  const { toast } = useToast();
  const { t } = useTranslation();
  const { user, updateUser } = useCurrentUser();
  const [businessName, setBusinessName] = useState(user?.businessName || "");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setBusinessName(user?.businessName || "");
  }, [user?.businessName]);

  useEffect(() => {
    const storedPhone = localStorage.getItem("profit-pilot-user-phone");
    setPhone(storedPhone || "");
  }, []);

  const handleSave = async () => {
    initAudio();
    const currentUserId = localStorage.getItem("profit-pilot-user-id");
    if (!currentUserId) {
      playErrorBeep();
      toast({
        title: t("error"),
        description: t("sessionNotFoundDesc"),
        variant: "destructive",
      });
      return;
    }

    const trimmedName = businessName.trim();
    if (!trimmedName) {
      playErrorBeep();
      toast({
        title: t("warning"),
        description: t("businessNameRequiredMsg"),
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      await authApi.updateUser({
        businessName: trimmedName,
        phone: phone.trim() || undefined,
      });

      updateUser({ businessName: trimmedName });

      if (phone.trim()) {
        localStorage.setItem("profit-pilot-user-phone", phone.trim());
      } else {
        localStorage.removeItem("profit-pilot-user-phone");
      }

      playUpdateBeep();
      toast({
        title: t("settingsSavedTitle"),
        description: t("settingsSavedBusinessDesc"),
      });
    } catch (error: unknown) {
      playErrorBeep();
      const message =
        error instanceof Error ? error.message : t("saveFailed");
      toast({
        title: t("saveFailed"),
        description: message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={embedded ? "pb-4" : "px-4 pb-4 lg:px-6"}>
      {!embedded ? (
        <SettingsSubpageHeader
          icon={Building2}
          title={t("businessInfo")}
          description={t("businessInfoPageDesc")}
        />
      ) : null}

      <div className="space-y-4 max-w-xl">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium flex items-center gap-1.5">
            <Building2 size={12} className="text-blue-600" />
            {t("businessName")}
          </Label>
          <Input
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            className="h-10 text-sm"
            placeholder={t("businessNameExample")}
          />
          <p className="text-xs text-muted-foreground">
            {t("businessNameOnReceipts")}
          </p>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium flex items-center gap-1.5">
            <Phone size={12} className="text-blue-600" />
            {t("businessPhoneLabel")}
          </Label>
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="h-10 text-sm"
            placeholder="+250 ..."
          />
        </div>
      </div>

      <div className="flex justify-end pt-4 mt-4 border-t border-gray-200 max-w-xl">
        <Button
          onClick={() => void handleSave()}
          disabled={saving}
          className="bg-sky-400 text-white hover:bg-sky-500 border border-sky-400 hover:text-white gap-2 h-10 px-5 text-sm font-semibold rounded-lg"
        >
          <Save size={14} />
          {t("saveChanges")}
        </Button>
      </div>
    </div>
  );
}
