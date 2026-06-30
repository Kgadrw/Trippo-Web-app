import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LoginForm } from "@/components/auth/LoginForm";
import { useTranslation } from "@/hooks/useTranslation";

interface LoginModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: "login" | "create";
}

export function LoginModal({ open, onOpenChange, defaultTab = "login" }: LoginModalProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="login-modal max-h-[100dvh] overflow-y-auto overscroll-contain sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">{t("welcomeToTrippo")}</DialogTitle>
        </DialogHeader>

        {open ? (
          <LoginForm
            defaultTab={defaultTab}
            showTitle={false}
            redirectToBookfy
            onSuccess={() => onOpenChange(false)}
          />
            ) : null}
      </DialogContent>
    </Dialog>
  );
}
