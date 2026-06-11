import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Building2, Phone, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { authApi } from "@/lib/api";
import { playErrorBeep, playUpdateBeep, initAudio } from "@/lib/sound";
import { SettingsSubpageHeader } from "@/components/settings/SettingsSubpageHeader";

export default function SettingsBusiness() {
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
    <div className="flex flex-1 flex-col overflow-y-auto p-5">
      <SettingsSubpageHeader
        icon={Building2}
        title={t("businessInfo")}
        description={t("businessInfoPageDesc")}
      />

      <Separator className="mb-4 bg-blue-200" />

      <div className="space-y-5">
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

      <Separator className="my-4" />

      <div className="flex justify-end">
        <Button
          onClick={() => void handleSave()}
          disabled={saving}
          className="bg-blue-600 text-white hover:bg-blue-700 gap-2 h-10 px-5 text-sm font-semibold rounded-lg"
        >
          <Save size={14} />
          {t("saveChanges")}
        </Button>
      </div>
    </div>
  );
}
