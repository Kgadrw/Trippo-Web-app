import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePinAuth } from "@/hooks/usePinAuth";
import { useTranslation } from "@/hooks/useTranslation";
import { authApi } from "@/lib/api";
import { playErrorBeep, playUpdateBeep, initAudio } from "@/lib/sound";
import { SettingsSubpageHeader } from "@/components/settings/SettingsSubpageHeader";

export default function SettingsSecurity() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const { hasPin, setPin, changePin } = usePinAuth();

  const [pinMode, setPinMode] = useState<"set" | "change">(hasPin ? "change" : "set");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [currentPin, setCurrentPin] = useState("");

  const handleSetPin = async () => {
    initAudio();
    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      playErrorBeep();
      toast({
        title: t("invalidPinTitle"),
        description: t("pinFourDigitsRequired"),
        variant: "destructive",
      });
      return;
    }
    if (newPin !== confirmPin) {
      playErrorBeep();
      toast({
        title: t("pinMismatchTitle"),
        description: t("pinMismatchBody"),
        variant: "destructive",
      });
      return;
    }

    try {
      if (setPin(newPin)) {
        playUpdateBeep();
        toast({
          title: t("pinSetTitle"),
          description: t("pinSetBody"),
        });
        setNewPin("");
        setConfirmPin("");
        setCurrentPin("");
        setPinMode("change");
      }
    } catch (error: any) {
      playErrorBeep();
      toast({
        title: t("pinSetupFailedTitle"),
        description: error?.message || t("pleaseTryAgain"),
        variant: "destructive",
      });
    }
  };

  const handleChangePin = async () => {
    initAudio();
    if (currentPin.length !== 4 || !/^\d{4}$/.test(currentPin)) {
      playErrorBeep();
      toast({
        title: t("invalidCurrentPinTitle"),
        description: t("pinFourDigitsRequired"),
        variant: "destructive",
      });
      return;
    }
    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      playErrorBeep();
      toast({
        title: t("invalidPinTitle"),
        description: t("pinFourDigitsRequired"),
        variant: "destructive",
      });
      return;
    }
    if (newPin !== confirmPin) {
      playErrorBeep();
      toast({
        title: t("pinMismatchTitle"),
        description: t("newPinMismatchBody"),
        variant: "destructive",
      });
      return;
    }

    try {
      await authApi.changePin({ currentPin, newPin });
      if (changePin(currentPin, newPin)) {
        playUpdateBeep();
        toast({
          title: t("pinChangedTitle"),
          description: t("pinChangedBody"),
        });
        setNewPin("");
        setConfirmPin("");
        setCurrentPin("");
      } else {
        playErrorBeep();
        toast({
          title: t("error"),
          description: t("pinSyncFailedDesc"),
          variant: "destructive",
        });
      }
    } catch (error: any) {
      playErrorBeep();
      const errorMessage = error?.message || t("pleaseTryAgain");
      if (
        errorMessage.toLowerCase().includes("incorrect") ||
        errorMessage.toLowerCase().includes("invalid")
      ) {
        toast({
          title: t("invalidCurrentPinTitle"),
          description: t("wrongCurrentPinDesc"),
          variant: "destructive",
        });
      } else {
        toast({
          title: t("pinChangeFailedTitle"),
          description: errorMessage,
          variant: "destructive",
        });
      }
    }
  };

  return (
    <div className="px-4 pb-4 lg:px-6">
      <SettingsSubpageHeader
        icon={Shield}
        title={t("security")}
        description={t("securityPageDesc")}
      />

      <div className="space-y-6 max-w-xl">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Lock size={14} className="text-gray-500" />
                {t("financialPinTitle")}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                {hasPin ? t("financialPinActiveDesc") : t("financialPinInactiveDesc")}
              </p>
            </div>
            {hasPin && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPinMode(pinMode === "set" ? "change" : "set")}
                className="text-xs"
              >
                {pinMode === "set" ? t("changePin") : t("setNewPinBtn")}
              </Button>
            )}
          </div>

          {hasPin && pinMode === "change" && (
            <div className="space-y-3 p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-foreground">{t("currentPin")}</Label>
                <Input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={currentPin}
                  onChange={(e) =>
                    setCurrentPin(e.target.value.replace(/\D/g, "").slice(0, 4))
                  }
                  className="input-field h-10 bg-background text-center text-lg tracking-widest font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="••••"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-foreground">{t("newPin")}</Label>
                  <Input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={newPin}
                    onChange={(e) =>
                      setNewPin(e.target.value.replace(/\D/g, "").slice(0, 4))
                    }
                    className="input-field h-10 bg-background text-center text-lg tracking-widest font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="••••"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-foreground">{t("confirmPin")}</Label>
                  <Input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={confirmPin}
                    onChange={(e) =>
                      setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 4))
                    }
                    className="input-field h-10 bg-background text-center text-lg tracking-widest font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="••••"
                  />
                </div>
              </div>
              <Button
                onClick={handleChangePin}
                className="bg-primary text-white hover:bg-blue-700 hover:text-white w-full gap-2 h-10 shadow-sm hover:shadow transition-all font-semibold rounded-lg"
                disabled={currentPin.length !== 4 || newPin.length !== 4 || confirmPin.length !== 4}
              >
                <Lock size={14} />
                {t("changePin")}
              </Button>
            </div>
          )}

          {(!hasPin || pinMode === "set") && (
            <div className="space-y-3 p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-foreground">{t("newPin")}</Label>
                  <Input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={newPin}
                    onChange={(e) =>
                      setNewPin(e.target.value.replace(/\D/g, "").slice(0, 4))
                    }
                    className="input-field h-10 bg-background text-center text-lg tracking-widest font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="••••"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-foreground">{t("confirmPin")}</Label>
                  <Input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={confirmPin}
                    onChange={(e) =>
                      setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 4))
                    }
                    className="input-field h-10 bg-background text-center text-lg tracking-widest font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="••••"
                  />
                </div>
              </div>
              <Button
                onClick={handleSetPin}
                className="bg-primary text-white hover:bg-blue-700 hover:text-white w-full gap-2 h-10 shadow-sm hover:shadow transition-all font-semibold rounded-lg"
                disabled={newPin.length !== 4 || confirmPin.length !== 4}
              >
                <Lock size={14} />
                {hasPin ? t("updatePin") : t("setPin")}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
