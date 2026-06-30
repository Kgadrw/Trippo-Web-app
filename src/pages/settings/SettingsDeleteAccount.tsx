import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";
import { usePinAuth } from "@/hooks/usePinAuth";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { authApi } from "@/lib/api";
import { clearAppSession, logoutAndGoHome } from "@/lib/session";
import { LOGIN_PREF_REMEMBER, LOGIN_PREF_SAVED_EMAIL } from "@/lib/loginPrefs";
import { playErrorBeep, playUpdateBeep, initAudio } from "@/lib/sound";
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
import { SettingsSubpageHeader } from "@/components/settings/SettingsSubpageHeader";
import { clearAllStores } from '@/lib/indexedDB';

export default function SettingsDeleteAccount({ embedded = false }: { embedded?: boolean }) {
  const { toast } = useToast();
  const { t } = useTranslation();
  const { clearAuth } = usePinAuth();
  const { clearUser } = useCurrentUser();

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    initAudio();
    setIsDeleting(true);

    try {
      await authApi.deleteAccount();

      clearAuth();
      clearUser();
      clearAppSession();
      localStorage.removeItem("profit-pilot-pin");
      localStorage.removeItem(LOGIN_PREF_SAVED_EMAIL);
      localStorage.removeItem(LOGIN_PREF_REMEMBER);

      try {
        await clearAllStores();
      } catch (error) {
        console.error("Error clearing IndexedDB on account deletion:", error);
      }

      playUpdateBeep();
      toast({
        title: t("accountDeleted"),
        description: t("accountDeletedDesc"),
      });

      setTimeout(() => {
        logoutAndGoHome();
      }, 900);
    } catch (error: unknown) {
      playErrorBeep();
      toast({
        title: t("error"),
        description:
          error instanceof Error ? error.message : t("deleteAccountFailed"),
        variant: "destructive",
      });
      setIsDeleting(false);
    }
  };

  return (
    <div className={embedded ? "pb-4" : "px-4 pb-4 lg:px-6"}>
      {!embedded ? (
        <SettingsSubpageHeader
          icon={Trash2}
          title={t("deleteAccount")}
          tone="danger"
          description={t("deleteAccountDesc")}
        />
      ) : null}

      <div className="space-y-4 max-w-xl">
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-red-900">
                    {t("warning")}
                  </h3>
                  <p className="text-xs text-red-800">
                    {t("deleteAccountWarningDesc")}
                  </p>
                </div>
              </div>
            </div>

            <Button
              onClick={() => setDeleteDialogOpen(true)}
              variant="destructive"
              className="w-full gap-2 h-10 shadow-sm hover:shadow transition-all font-semibold rounded-lg"
            >
              <Trash2 size={14} />
              {t("deleteMyAccount")}
            </Button>
          </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle size={20} />
              {t("deleteAccount")}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>{t("deleteAccountConfirmDesc")}</p>
              <p className="font-semibold text-red-600">
                {t("deleteAccountDataWarning")}
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              {t("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? t("deleting") : t("yesDeleteAccount")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
