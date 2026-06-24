import { useCallback, useState } from "react";

export function useDeleteConfirm<T>() {
  const [target, setTarget] = useState<T | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const open = target !== null;

  const requestDelete = useCallback((item: T) => {
    setTarget(item);
  }, []);

  const close = useCallback(() => {
    setTarget(null);
  }, []);

  /** Close the dialog and return the item being deleted. */
  const takeTarget = useCallback((): T | null => {
    const item = target;
    if (item) setTarget(null);
    return item;
  }, [target]);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) close();
    },
    [close],
  );

  return {
    target,
    open,
    isDeleting,
    setIsDeleting,
    requestDelete,
    close,
    takeTarget,
    handleOpenChange,
  };
}
