import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useWorkspaceChatPanel } from "@/hooks/useWorkspaceChatPanel";
import { useWorkspaceChatSocket } from "@/hooks/useWorkspaceChatSocket";
import { useDirectChatSocket } from "@/hooks/useDirectChatSocket";
import { notificationService } from "@/lib/notifications";
import type { WorkspaceChatMessage } from "@/lib/workspaceChatRealtime";
import type { DirectChatMessage } from "@/lib/workspaceDirectChatRealtime";
import {
  notifyIncomingChatAlert,
  setWorkspaceChatNotificationClickHandler,
} from "@/lib/workspaceChatNotifications";
import { registerWebPushSubscription } from "@/lib/pushNotifications";
import {
  WORKSPACE_GROUP_CHAT_PATH,
  isWorkspaceGroupChatPath,
} from "@/lib/workspaceGroupChat";
import {
  bumpMessagesUnread,
  refreshMessagesUnreadBadge,
} from "@/lib/messagesUnreadEvents";

function isOwnGroupMessage(message: WorkspaceChatMessage, currentUserId: string | null) {
  return Boolean(currentUserId && String(message.senderUserId) === currentUserId);
}

function isOwnDirectMessage(message: DirectChatMessage, currentUserId: string | null) {
  return Boolean(currentUserId && String(message.senderUserId) === currentUserId);
}

function alertForIncoming(viewingThisChat: boolean, tabHidden: boolean) {
  return !viewingThisChat || tabHidden;
}

/**
 * App-wide chat alerts: bottom-right popup while the site is open,
 * browser/OS notifications when the tab is hidden, and web-push when closed.
 */
export function WorkspaceChatNotificationBridge() {
  const { mode, activeWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const location = useLocation();
  const { incrementUnread, clearUnread, unreadCount } = useWorkspaceChatPanel();
  const workspaceId = activeWorkspace?.id || "";
  const currentUserId = localStorage.getItem("profit-pilot-user-id");
  const viewingGroupOnMessages = isWorkspaceGroupChatPath(location.pathname);
  const pathnameRef = useRef(location.pathname);
  const openRef = useRef(viewingGroupOnMessages);
  const baseTitleRef = useRef(typeof document !== "undefined" ? document.title : "Trippo");

  pathnameRef.current = location.pathname;
  openRef.current = viewingGroupOnMessages;

  useEffect(() => {
    if (mode !== "workspace") return;

    const openHref = (href: string) => {
      clearUnread();
      refreshMessagesUnreadBadge();
      navigate(href || WORKSPACE_GROUP_CHAT_PATH);
    };

    setWorkspaceChatNotificationClickHandler(openHref);

    const onServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data?.type === "OPEN_WORKSPACE_CHAT") {
        openHref(WORKSPACE_GROUP_CHAT_PATH);
        return;
      }
      if (event.data?.type === "OPEN_DIRECT_CHAT") {
        const otherUserId = event.data.otherUserId ? String(event.data.otherUserId) : "";
        openHref(otherUserId ? `/messages/${otherUserId}` : "/messages");
      }
    };

    navigator.serviceWorker?.addEventListener("message", onServiceWorkerMessage);

    return () => {
      setWorkspaceChatNotificationClickHandler(null);
      navigator.serviceWorker?.removeEventListener("message", onServiceWorkerMessage);
    };
  }, [mode, clearUnread, navigate]);

  useEffect(() => {
    if (viewingGroupOnMessages) {
      clearUnread();
      refreshMessagesUnreadBadge();
    }
  }, [viewingGroupOnMessages, clearUnread]);

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
      if (isOwnGroupMessage(message, currentUserId)) return;

      const viewingThisChat = openRef.current;
      const tabHidden = typeof document !== "undefined" && document.hidden;

      if (!viewingThisChat) {
        incrementUnread();
        bumpMessagesUnread(1);
      }

      if (!alertForIncoming(viewingThisChat, tabHidden)) return;

      void notifyIncomingChatAlert({
        messageId: String(message._id),
        senderName: message.senderName || "Someone",
        body: message.body || "",
        iconUrl: message.senderProfilePictureUrl,
        workspaceId,
        workspaceName: activeWorkspace?.name,
        href: WORKSPACE_GROUP_CHAT_PATH,
        action: "open_workspace_chat",
        replyTo: message.replyTo
          ? {
              senderName: message.replyTo.senderName,
              body: message.replyTo.body,
            }
          : null,
      });
    },
  });

  useDirectChatSocket(null, Boolean(currentUserId), {
    onMessage: (message) => {
      if (isOwnDirectMessage(message, currentUserId)) return;

      const path = pathnameRef.current;
      const senderId = String(message.senderUserId);
      const messageWorkspaceId = String(message.workspaceId || workspaceId || "");
      const href = messageWorkspaceId
        ? `/messages/${senderId}?w=${encodeURIComponent(messageWorkspaceId)}`
        : `/messages/${senderId}`;
      const viewingThisChat =
        path === href ||
        (path.startsWith(`/messages/${senderId}`) &&
          (!messageWorkspaceId || path.includes(`w=${encodeURIComponent(messageWorkspaceId)}`) || path.includes(`w=${messageWorkspaceId}`)));
      const tabHidden = typeof document !== "undefined" && document.hidden;

      if (!viewingThisChat) {
        bumpMessagesUnread(1);
      }

      if (!alertForIncoming(viewingThisChat, tabHidden)) return;

      void notifyIncomingChatAlert({
        messageId: String(message._id),
        senderName: message.senderName || "Someone",
        body: message.body || "",
        iconUrl: message.senderProfilePictureUrl,
        workspaceId: messageWorkspaceId || workspaceId,
        workspaceName: activeWorkspace?.name,
        href,
        action: "open_direct_chat",
        otherUserId: senderId,
        conversationId: String(message.conversationId || ""),
        replyTo: message.replyTo
          ? {
              senderName: message.replyTo.senderName,
              body: message.replyTo.body,
            }
          : null,
      });
    },
  });

  return null;
}
