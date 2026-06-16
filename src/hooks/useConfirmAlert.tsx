import { useCallback, useState, type ReactNode } from "react";
import {
  ConfirmAlertDialog,
  type ConfirmAlertVariant,
} from "@/components/ui/confirm-alert-dialog";

export type ConfirmAlertRequest = {
  title: ReactNode;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
  variant?: ConfirmAlertVariant;
  icon?: ReactNode;
};

export function useConfirmAlert() {
  const [open, setOpen] = useState(false);
  const [request, setRequest] = useState<ConfirmAlertRequest | null>(null);
  const [loading, setLoading] = useState(false);

  const requestConfirm = useCallback((next: ConfirmAlertRequest) => {
    setRequest(next);
    setOpen(true);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    setRequest(null);
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!request) return;
    setLoading(true);
    try {
      await request.onConfirm();
      close();
    } finally {
      setLoading(false);
    }
  }, [request, close]);

  const confirmDialog = (
    <ConfirmAlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !loading) close();
        else if (next) setOpen(true);
      }}
      title={request?.title ?? ""}
      description={request?.description}
      confirmLabel={request?.confirmLabel}
      cancelLabel={request?.cancelLabel}
      onConfirm={handleConfirm}
      loading={loading}
      variant={request?.variant ?? "destructive"}
      icon={request?.icon}
    />
  );

  return { requestConfirm, confirmDialog, isConfirmOpen: open };
}
