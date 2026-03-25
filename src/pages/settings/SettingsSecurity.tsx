import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Lock, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePinAuth } from "@/hooks/usePinAuth";
import { useTranslation } from "@/hooks/useTranslation";
import { authApi } from "@/lib/api";
import { playErrorBeep, playUpdateBeep, initAudio } from "@/lib/sound";

export default function SettingsSecurity() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, language } = useTranslation();
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
        title: "Invalid PIN",
        description: "PIN must be exactly 4 digits.",
        variant: "destructive",
      });
      return;
    }
    if (newPin !== confirmPin) {
      playErrorBeep();
      toast({
        title: "PIN Mismatch",
        description: "PIN and confirmation do not match.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (setPin(newPin)) {
        playUpdateBeep();
        toast({
          title: "PIN Set",
          description: "Your PIN has been set successfully.",
        });
        setNewPin("");
        setConfirmPin("");
        setCurrentPin("");
        setPinMode("change");
      }
    } catch (error: any) {
      playErrorBeep();
      toast({
        title: "PIN Setup Failed",
        description: error?.message || "Failed to set PIN. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleChangePin = async () => {
    initAudio();
    if (currentPin.length !== 4 || !/^\d{4}$/.test(currentPin)) {
      playErrorBeep();
      toast({
        title: "Invalid Current PIN",
        description: "Current PIN must be exactly 4 digits.",
        variant: "destructive",
      });
      return;
    }
    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      playErrorBeep();
      toast({
        title: "Invalid PIN",
        description: "New PIN must be exactly 4 digits.",
        variant: "destructive",
      });
      return;
    }
    if (newPin !== confirmPin) {
      playErrorBeep();
      toast({
        title: "PIN Mismatch",
        description: "New PIN and confirmation do not match.",
        variant: "destructive",
      });
      return;
    }

    try {
      await authApi.changePin({ currentPin, newPin });
      if (changePin(currentPin, newPin)) {
        playUpdateBeep();
        toast({
          title: "PIN Changed",
          description: "Your PIN has been changed successfully.",
        });
        setNewPin("");
        setConfirmPin("");
        setCurrentPin("");
      } else {
        playErrorBeep();
        toast({
          title: "PIN Update Incomplete",
          description:
            "PIN was updated on server but local update failed. Please refresh.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      playErrorBeep();
      const errorMessage = error?.message || "Failed to change PIN. Please try again.";
      if (
        errorMessage.toLowerCase().includes("incorrect") ||
        errorMessage.toLowerCase().includes("invalid")
      ) {
        toast({
          title: "Invalid Current PIN",
          description: "The current PIN you entered is incorrect.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "PIN Change Failed",
          description: errorMessage,
          variant: "destructive",
        });
      }
    }
  };

  return (
    <AppLayout title={t("security")}>
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => navigate("/settings")}>
            {language === "rw" ? "Subira" : language === "fr" ? "Retour" : "Back"}
          </Button>
        </div>

        <div className="form-card border border-transparent lg:bg-white bg-white/80 backdrop-blur-sm">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-blue-100 border border-blue-200 flex items-center justify-center rounded-lg">
                <Shield size={16} className="text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-blue-700">{t("security")}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {language === "rw"
                    ? "Shiraho PIN kugirango wongere umutekano"
                    : "Set PIN to keep your account secure"}
                </p>
              </div>
            </div>
          </div>

          <Separator className="mb-4 bg-blue-200" />

          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Lock size={14} className="text-blue-600" />
                    Financial Data PIN Protection
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {hasPin
                      ? "PIN is set. Profits and sensitive financial data are protected."
                      : "Set a 4-digit PIN to protect profits and sensitive financial information."}
                  </p>
                </div>
                {hasPin && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPinMode(pinMode === "set" ? "change" : "set")}
                    className="text-xs"
                  >
                    {pinMode === "set" ? "Change PIN" : "Set New PIN"}
                  </Button>
                )}
              </div>

              {hasPin && pinMode === "change" && (
                <div className="space-y-3 p-4 bg-secondary/30 border border-transparent rounded-lg">
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
                    className="bg-blue-600 text-white hover:bg-blue-700 w-full gap-2 h-10 shadow-sm hover:shadow transition-all font-semibold rounded-lg"
                    disabled={currentPin.length !== 4 || newPin.length !== 4 || confirmPin.length !== 4}
                  >
                    <Lock size={14} />
                    {t("changePin")}
                  </Button>
                </div>
              )}

              {(!hasPin || pinMode === "set") && (
                <div className="space-y-3 p-4 bg-secondary/30 border border-transparent rounded-lg">
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
                    className="bg-blue-600 text-white hover:bg-blue-700 w-full gap-2 h-10 shadow-sm hover:shadow transition-all font-semibold rounded-lg"
                    disabled={newPin.length !== 4 || confirmPin.length !== 4}
                  >
                    <Lock size={14} />
                    {hasPin ? (language === "rw" ? "Hindura PIN" : "Update PIN") : t("setPin")}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

