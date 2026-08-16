import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useWorkspaceChatPanel, WORKSPACE_CHAT_SIDEBAR_WIDTH } from "@/hooks/useWorkspaceChatPanel";
import { useTranslation } from "@/hooks/useTranslation";
import { cn } from "@/lib/utils";
import { WorkspaceGroupChatPane } from "@/components/workspace/WorkspaceGroupChatPane";

function ChatIcon({ className }: { className?: string }) {
  return (
    <img
      src="/chat.png"
      alt=""
      aria-hidden
      className={cn("object-contain", className)}
    />
  );
}

export function WorkspaceChatWidget({ topOffset = 56 }: { topOffset?: number }) {
  const { mode, activeWorkspace } = useWorkspace();
  const { t } = useTranslation();
  const location = useLocation();
  const { open, setOpen, clearUnread, unreadCount } = useWorkspaceChatPanel();
  const isMessagesPage = location.pathname.startsWith("/messages");

  useEffect(() => {
    if (mode !== "workspace" || !activeWorkspace?.id) {
      setOpen(false);
    }
  }, [mode, activeWorkspace?.id, setOpen]);

  useEffect(() => {
    if (isMessagesPage) setOpen(false);
  }, [isMessagesPage, setOpen]);

  if (mode !== "workspace" || !activeWorkspace?.id || isMessagesPage) {
    return null;
  }

  const panelHeight = `calc(100dvh - ${topOffset}px)`;
  const title = activeWorkspace.name || t("workspaceChatTitle");

  return (
    <>
      <aside
        className={cn(
          "workspace-chat workspace-chat-panel fixed right-2 z-30 flex flex-col overflow-hidden rounded-xl border-2 border-sky-500 bg-white shadow-lg animate-in slide-in-from-right duration-300 max-lg:right-0 max-lg:max-w-sm max-lg:rounded-none sm:right-3 dark:border-sky-500/60 dark:bg-[#0b0f14]",
          !open && "pointer-events-none invisible",
        )}
        style={{
          top: topOffset,
          height: panelHeight,
          width: WORKSPACE_CHAT_SIDEBAR_WIDTH,
        }}
        role="complementary"
        aria-label={title}
        aria-hidden={!open}
      >
        <WorkspaceGroupChatPane
          active={open}
          trackUnreadWhenInactive
          variant="panel"
          escapeCloses
          onClose={() => setOpen(false)}
          className="h-full"
        />
      </aside>

      {!open ? (
        <div
          className="pointer-events-none fixed bottom-4 right-4 z-40 sm:bottom-6 sm:right-6"
          aria-live="polite"
        >
          <button
            type="button"
            onClick={() => {
              clearUnread();
              setOpen(true);
            }}
            className="pointer-events-auto relative flex h-16 w-16 shrink-0 items-center justify-center bg-transparent p-0 transition-transform hover:scale-105 active:scale-95 sm:h-[4.5rem] sm:w-[4.5rem]"
            aria-expanded={open}
            aria-label={t("workspaceChatOpen")}
          >
            <ChatIcon className="h-full w-full object-contain" />
            {unreadCount > 0 ? (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            ) : null}
          </button>
        </div>
      ) : null}
    </>
  );
}
