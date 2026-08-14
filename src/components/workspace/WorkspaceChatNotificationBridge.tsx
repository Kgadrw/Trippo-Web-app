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
  clearGroupChatOsNotification,
  clearDirectChatOsNotification,
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
  // Show whenever this exact thread is not open (any other page / Messages list),
  // or when the browser tab is in the background.
  return !viewingThisChat || tabHidden;
}

function isViewingDirectChat(
  pathname: string,
  search: string,
  senderId: string,
  messageWorkspaceId: string,
) {
  if (!senderId || senderId === "group") return false;
  const pathOnly = pathname.split("?")[0];
  if (pathOnly === "/messages" || pathOnly === "/messages/") return false;
  if (pathOnly !== `/messages/${senderId}`) return false;

  if (!messageWorkspaceId) return true;
  const w = new URLSearchParams(search).get("w");
  if (!w) return true;
  return String(w) === String(messageWorkspaceId);
}

/**
 * App-wide chat alerts: in-app popup while visible, sticky OS notifications when
 * backgrounded, and web-push when the app is closed (WhatsApp-style).
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
  const searchRef = useRef(location.search);
  const openRef = useRef(viewingGroupOnMessages);
  const baseTitleRef = useRef(typeof document !== "undefined" ? document.title : "Trippo");

  pathnameRef.current = location.pathname;
  searchRef.current = location.search;
  openRef.current = viewingGroupOnMessages;

  useEffect(() => {
    if (mode !== "workspace") return;

    const openHref = (href: string) => {
      clearUnread();
      refreshMessagesUnreadBadge();
      if (isWorkspaceGroupChatPath(href) || href.includes("/messages/group")) {
        if (workspaceId) clearGroupChatOsNotification(workspaceId);
      } else {
        const match = href.match(/\/messages\/([^/?]+)/);
        const otherUserId = match?.[1];
        if (otherUserId && otherUserId !== "group") {
          clearDirectChatOsNotification(undefined, otherUserId);
        }
      }
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
  }, [mode, clearUnread, navigate, workspaceId]);

  useEffect(() => {
    if (viewingGroupOnMessages) {
      clearUnread();
      refreshMessagesUnreadBadge();
      if (workspaceId) clearGroupChatOsNotification(workspaceId);
    }
  }, [viewingGroupOnMessages, clearUnread, workspaceId]);

  // When a DM thread is open and the tab is visible, clear its sticky OS notification.
  useEffect(() => {
    if (mode !== "workspace") return;
    const path = location.pathname;
    const dmMatch = path.match(/^\/messages\/([^/]+)/);
    if (!dmMatch) return;
    const otherUserId = dmMatch[1];
    if (otherUserId === "group") return;
    if (typeof document !== "undefined" && document.hidden) return;
    clearDirectChatOsNotification(undefined, otherUserId);
  }, [mode, location.pathname, location.search]);

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
      const viewingThisChat = isViewingDirectChat(
        path,
        searchRef.current,
        senderId,
        messageWorkspaceId,
      );
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
