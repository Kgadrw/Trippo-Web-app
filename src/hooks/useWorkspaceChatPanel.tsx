import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export const WORKSPACE_CHAT_SIDEBAR_WIDTH = "20rem";

type WorkspaceChatPanelContextValue = {
  open: boolean;
  unreadCount: number;
  setOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  toggle: () => void;
  incrementUnread: () => void;
  setUnreadCount: (count: number) => void;
  clearUnread: () => void;
};

const WorkspaceChatPanelContext = createContext<WorkspaceChatPanelContextValue | null>(null);

export function WorkspaceChatPanelProvider({ children }: { children: ReactNode }) {
  const [open, setOpenState] = useState(false);
  const [unreadCount, setUnreadCountState] = useState(0);

  const setOpen = useCallback((next: boolean | ((prev: boolean) => boolean)) => {
    setOpenState((prev) => (typeof next === "function" ? next(prev) : next));
  }, []);

  const toggle = useCallback(() => {
    setOpen((value) => !value);
  }, [setOpen]);

  const incrementUnread = useCallback(() => {
    setUnreadCountState((count) => count + 1);
  }, []);

  const setUnreadCount = useCallback((count: number) => {
    setUnreadCountState(Math.max(0, count));
  }, []);

  const clearUnread = useCallback(() => {
    setUnreadCountState(0);
  }, []);

  const value = useMemo(
    () => ({
      open,
      unreadCount,
      setOpen,
      toggle,
      incrementUnread,
      setUnreadCount,
      clearUnread,
    }),
    [open, unreadCount, toggle, incrementUnread, setUnreadCount, clearUnread],
  );

  return (
    <WorkspaceChatPanelContext.Provider value={value}>
      {children}
    </WorkspaceChatPanelContext.Provider>
  );
}

export function useWorkspaceChatPanel() {
  const context = useContext(WorkspaceChatPanelContext);
  if (!context) {
    throw new Error("useWorkspaceChatPanel must be used within WorkspaceChatPanelProvider");
  }
  return context;
}
