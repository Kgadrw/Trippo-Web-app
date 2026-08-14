import type { ReactNode } from "react";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
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

export interface DeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  deletingLabel?: string;
  onConfirm: () => void | Promise<void>;
  isDeleting?: boolean;
  contentClassName?: string;
  cancelClassName?: string;
  confirmClassName?: string;
}

export function DeleteConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  deletingLabel = "Deleting...",
  onConfirm,
  isDeleting = false,
  contentClassName,
  cancelClassName,
  confirmClassName,
}: DeleteConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className={cn("gap-5 sm:max-w-md", contentClassName)}>
        <AlertDialogHeader className="sm:text-left">
          <div className="mb-1 flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600 ring-1 ring-red-100">
            <Trash2 size={20} className="shrink-0" />
          </div>
          <AlertDialogTitle className="text-base font-semibold text-gray-900">
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm leading-relaxed text-gray-500">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-2">
          <AlertDialogCancel
            disabled={isDeleting}
            className={cn("rounded", cancelClassName)}
          >
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => void onConfirm()}
            disabled={isDeleting}
            className={cn(
              "rounded bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-300",
              confirmClassName,
            )}
          >
            {isDeleting ? deletingLabel : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
