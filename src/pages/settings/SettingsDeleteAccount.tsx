import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";
import { usePinAuth } from "@/hooks/usePinAuth";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { authApi } from "@/lib/api";
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

export default function SettingsDeleteAccount() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { language } = useTranslation();
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
      localStorage.removeItem("profit-pilot-user-id");
      localStorage.removeItem("profit-pilot-user-name");
      localStorage.removeItem("profit-pilot-user-email");
      localStorage.removeItem("profit-pilot-business-name");
      localStorage.removeItem("profit-pilot-is-admin");
      sessionStorage.clear();

      try {
        const { clearAllStores } = await import("@/lib/indexedDB");
        await clearAllStores();
      } catch (error) {
        console.error("Error clearing IndexedDB on account deletion:", error);
      }

      window.dispatchEvent(new Event("pin-auth-changed"));

      playUpdateBeep();
      toast({
        title: language === "rw" ? "Konti Yarahagijwe" : "Account Deleted",
        description:
          language === "rw"
            ? "Konti yawe n'amakuru yose byarahagijwe neza."
            : "Your account and all data have been successfully deleted.",
      });

      setTimeout(() => {
        window.history.replaceState(null, "", "/");
        navigate("/", { replace: true });
      }, 900);
    } catch (error: any) {
      playErrorBeep();
      toast({
        title: language === "rw" ? "Ikosa" : "Error",
        description:
          error?.message ||
          (language === "rw"
            ? "Ntibyashoboye kuraho konti. Nyamuneka gerageza nanone."
            : "Failed to delete account. Please try again."),
        variant: "destructive",
      });
      setIsDeleting(false);
    }
  };

  return (
    <AppLayout title={language === "rw" ? "Kuraho Konti" : "Delete Account"}>
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => navigate("/settings")}>
            {language === "rw" ? "Subira" : language === "fr" ? "Retour" : "Back"}
          </Button>
        </div>

        <div className="form-card border border-transparent lg:bg-white bg-white/80 backdrop-blur-sm">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-red-100 border border-red-200 flex items-center justify-center rounded-lg">
                <Trash2 size={16} className="text-red-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-red-700">
                  {language === "rw" ? "Kuraho Konti" : "Delete Account"}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {language === "rw"
                    ? "Iki gikorwa ntigisubirwamo"
                    : "This action cannot be undone"}
                </p>
              </div>
            </div>
          </div>

          <Separator className="mb-4 bg-red-200" />

          <div className="space-y-4">
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-red-900">
                    {language === "rw" ? "Icyitonderwa" : "Warning"}
                  </h3>
                  <p className="text-xs text-red-800">
                    {language === "rw"
                      ? "Kuraho konti yawe bizakuraho amakuru yose."
                      : "Deleting your account will permanently remove all your data."}
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
              {language === "rw" ? "Kuraho Konti" : "Delete My Account"}
            </Button>
          </div>
        </div>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle size={20} />
              {language === "rw" ? "Kuraho Konti" : "Delete Account"}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                {language === "rw"
                  ? "Urabyemera ko wifuza kuraho konti yawe? Iki gikorwa ntigisubirwamo."
                  : "Are you sure you want to delete your account? This action cannot be undone."}
              </p>
              <p className="font-semibold text-red-600">
                {language === "rw"
                  ? "Amakuru yose azakurwa gusa."
                  : "All your data will be permanently deleted."}
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              {language === "rw" ? "Guhagarika" : "Cancel"}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting
                ? language === "rw"
                  ? "Kuraho..."
                  : "Deleting..."
                : language === "rw"
                ? "Yego, Kuraho"
                : "Yes, Delete Account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}

