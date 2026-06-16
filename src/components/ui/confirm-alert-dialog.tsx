import * as React from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks/useTranslation";

export type ConfirmAlertVariant = "destructive" | "warning" | "default";

export type ConfirmAlertDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
  loading?: boolean;
  variant?: ConfirmAlertVariant;
  icon?: React.ReactNode;
};

const variantIcon: Record<ConfirmAlertVariant, React.ReactNode> = {
  destructive: <Trash2 size={20} className="text-red-600" />,
  warning: <AlertTriangle size={20} className="text-amber-600" />,
  default: null,
};

export function ConfirmAlertDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  loading = false,
  variant = "destructive",
  icon,
}: ConfirmAlertDialogProps) {
  const { t } = useTranslation();
  const resolvedIcon = icon !== undefined ? icon : variantIcon[variant];

  const handleConfirm = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    await onConfirm();
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className={cn(resolvedIcon && "flex items-center gap-2")}>
            {resolvedIcon}
            {title}
          </AlertDialogTitle>
          {description ? <AlertDialogDescription>{description}</AlertDialogDescription> : null}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>{cancelLabel ?? t("cancel")}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={loading}
            className={cn(
              variant === "destructive" && "bg-red-600 text-white hover:bg-red-700",
              variant === "warning" && "bg-amber-600 text-white hover:bg-amber-700",
            )}
          >
            {loading ? t("loading") : (confirmLabel ?? t("confirm"))}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
