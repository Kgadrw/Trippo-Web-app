import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";
import { authApi } from "@/lib/api";
import { playErrorBeep, playUpdateBeep, initAudio } from "@/lib/sound";
import { SettingsSubpageHeader } from "@/components/settings/SettingsSubpageHeader";

const MIN_PASSWORD_LENGTH = 8;

function isValidPassword(value: string): boolean {
  return value.length >= MIN_PASSWORD_LENGTH;
}

export default function SettingsSecurity({ embedded = false }: { embedded?: boolean }) {
  const { toast } = useToast();
  const { t } = useTranslation();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");

  const handleChangePassword = async () => {
    initAudio();

    if (!isValidPassword(currentPassword)) {
      playErrorBeep();
      toast({
        title: "Invalid password",
        description: `Enter your current password (at least ${MIN_PASSWORD_LENGTH} characters).`,
        variant: "destructive",
      });
      return;
    }

    if (!isValidPassword(newPassword)) {
      playErrorBeep();
      toast({
        title: "Invalid password",
        description: `New password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      playErrorBeep();
      toast({
        title: "Passwords do not match",
        description: "Please confirm your new password.",
        variant: "destructive",
      });
      return;
    }

    try {
      await authApi.changePassword({ currentPassword, newPassword });
      playUpdateBeep();
      toast({
        title: "Password updated",
        description: "Your password has been changed successfully.",
      });
      setNewPassword("");
      setConfirmPassword("");
      setCurrentPassword("");
    } catch (error: unknown) {
      playErrorBeep();
      const errorMessage = error instanceof Error ? error.message : "Please try again.";
      toast({
        title: "Password change failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  return (
    <div className={embedded ? "pb-4" : "px-4 pb-4 lg:px-6"}>
      {!embedded ? (
        <SettingsSubpageHeader
          icon={Shield}
          title={t("security")}
          description={t("securityPageDesc")}
        />
      ) : null}

      <div className="space-y-6 max-w-xl">
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Lock size={14} className="text-gray-500" />
              Account password
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Update the password you use to sign in with email.
            </p>
          </div>

          <div className="space-y-3 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground">Current password</Label>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="input-field h-10 bg-background"
                autoComplete="current-password"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-foreground">New password</Label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="input-field h-10 bg-background"
                  autoComplete="new-password"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-foreground">Confirm password</Label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input-field h-10 bg-background"
                  autoComplete="new-password"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Use at least {MIN_PASSWORD_LENGTH} characters.
            </p>
            <Button
              onClick={handleChangePassword}
              className="bg-sky-400 text-white hover:bg-sky-500 border border-sky-400 hover:text-white w-full gap-2 h-10 shadow-sm hover:shadow transition-all font-semibold rounded-lg"
              disabled={
                !isValidPassword(currentPassword) ||
                !isValidPassword(newPassword) ||
                newPassword !== confirmPassword
              }
            >
              <Lock size={14} />
              Change password
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
