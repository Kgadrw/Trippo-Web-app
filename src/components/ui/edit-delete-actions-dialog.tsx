import type { ReactNode } from "react";
import { Pencil, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type EditDeleteActionsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: ReactNode;
  editLabel?: string;
  deleteLabel?: string;
  onEdit: () => void;
  onDelete: () => void;
  className?: string;
};

/** Centered action picker for Edit / Delete — matches cool dialog styling. */
export function EditDeleteActionsDialog({
  open,
  onOpenChange,
  title = "Choose an action",
  description,
  editLabel = "Edit",
  deleteLabel = "Delete",
  onEdit,
  onDelete,
  className,
}: EditDeleteActionsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("gap-5 sm:max-w-sm", className)}>
        <DialogHeader className="sm:text-left">
          <DialogTitle className="text-base font-semibold text-gray-900">{title}</DialogTitle>
          {description ? (
            <DialogDescription className="text-sm leading-relaxed text-gray-500">
              {description}
            </DialogDescription>
          ) : null}
        </DialogHeader>
        <div className="grid gap-2">
          <button
            type="button"
            onClick={() => {
              onOpenChange(false);
              window.setTimeout(() => onEdit(), 80);
            }}
            className="flex min-h-12 items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 text-left text-[15px] font-medium text-gray-900 shadow-sm transition-colors hover:bg-sky-50 hover:border-sky-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-600 ring-1 ring-sky-100">
              <Pencil size={18} />
            </span>
            {editLabel}
          </button>
          <button
            type="button"
            onClick={() => {
              onOpenChange(false);
              window.setTimeout(() => onDelete(), 80);
            }}
            className="flex min-h-12 items-center gap-3 rounded-xl border border-red-100 bg-white px-3 text-left text-[15px] font-medium text-red-600 shadow-sm transition-colors hover:bg-red-50 hover:border-red-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-200"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-red-600 ring-1 ring-red-100">
              <Trash2 size={18} />
            </span>
            {deleteLabel}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
