import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useWorkspaceChatPanel } from "@/hooks/useWorkspaceChatPanel";
import { useWorkspaceChatSocket } from "@/hooks/useWorkspaceChatSocket";
import { notificationService } from "@/lib/notifications";
import { initAudio, playChatMessageBeep } from "@/lib/sound";
import type { WorkspaceChatMessage } from "@/lib/workspaceChatRealtime";
import {
  notifyNewWorkspaceChatMessage,
  setWorkspaceChatNotificationClickHandler,
} from "@/lib/workspaceChatNotifications";
import { registerWebPushSubscription } from "@/lib/pushNotifications";
import {
  WORKSPACE_GROUP_CHAT_PATH,
  isWorkspaceGroupChatPath,
} from "@/lib/workspaceGroupChat";

function isOwnMessage(message: WorkspaceChatMessage, currentUserId: string | null) {
  return Boolean(currentUserId && String(message.senderUserId) === currentUserId);
}

function shouldAlertForMessage(chatOpen: boolean, tabHidden: boolean) {
  return !chatOpen || tabHidden;
}

/**
 * Listens for workspace chat messages app-wide and triggers unread badge,
 * sound, and browser notifications when the user is not actively viewing chat.
 */
export function WorkspaceChatNotificationBridge() {
  const { mode, activeWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const location = useLocation();
  const { incrementUnread, clearUnread, unreadCount } = useWorkspaceChatPanel();
  const workspaceId = activeWorkspace?.id || "";
  const currentUserId = localStorage.getItem("profit-pilot-user-id");
  const viewingGroupOnMessages = isWorkspaceGroupChatPath(location.pathname);
  const chatOpen = viewingGroupOnMessages;
  const openRef = useRef(chatOpen);
  const baseTitleRef = useRef(typeof document !== "undefined" ? document.title : "Trippo");

  openRef.current = chatOpen;

  useEffect(() => {
    if (mode !== "workspace") return;

    const openChat = () => {
      clearUnread();
      navigate(WORKSPACE_GROUP_CHAT_PATH);
    };

    setWorkspaceChatNotificationClickHandler(openChat);

    const onServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data?.type === "OPEN_WORKSPACE_CHAT") {
        openChat();
      }
    };

    navigator.serviceWorker?.addEventListener("message", onServiceWorkerMessage);

    return () => {
      setWorkspaceChatNotificationClickHandler(null);
      navigator.serviceWorker?.removeEventListener("message", onServiceWorkerMessage);
    };
  }, [mode, clearUnread, navigate]);

  useEffect(() => {
    if (chatOpen) clearUnread();
  }, [chatOpen, clearUnread]);

  useEffect(() => {
    if (mode !== "workspace") {
      document.title = baseTitleRef.current;
      return;
    }

    if (unreadCount <= 0) {
      document.title = baseTitleRef.current;
      return;
    }

    const label = unreadCount > 99 ? "99+" : String(unreadCount);
    document.title = `(${label}) ${baseTitleRef.current}`;
  }, [unreadCount, mode]);

  useEffect(() => {
    if (mode !== "workspace" || !("serviceWorker" in navigator)) return;

    void navigator.serviceWorker.ready.then((registration) => {
      registration.active?.postMessage({
        type: "UPDATE_BADGE",
        count: unreadCount,
      });
    });
  }, [unreadCount, mode]);

  useEffect(() => {
    if (mode !== "workspace") return;

    const setupNotifications = async () => {
      if (notificationService.needsPermission()) {
        const result = await notificationService.requestPermission();
        if (result !== "granted") return;
      }

      if (notificationService.isAllowed()) {
        await registerWebPushSubscription();
      }
    };

    void setupNotifications();
  }, [mode, workspaceId]);

  useWorkspaceChatSocket(workspaceId, mode === "workspace" && Boolean(workspaceId), {
    onMessage: (message) => {
      if (isOwnMessage(message, currentUserId)) return;

      const isChatOpen = openRef.current;
      const tabHidden = typeof document !== "undefined" && document.hidden;

      if (!isChatOpen) {
        incrementUnread();
      }

      if (!shouldAlertForMessage(isChatOpen, tabHidden)) return;

      initAudio();
      playChatMessageBeep();

      // Fallback for browsers without a saved push subscription (server push handles closed/inactive app).
      if (!localStorage.getItem("trippo-push-synced-endpoint")) {
        void notifyNewWorkspaceChatMessage({
          message,
          workspaceName: activeWorkspace?.name,
          workspaceId,
        });
      }
    },
  });

  return null;
}
