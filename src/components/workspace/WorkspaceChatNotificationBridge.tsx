import { useEffect, useRef, startTransition } from "react";
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
import { resolveAppRoute } from "@/lib/appRoutes";

export const TRIPPO_NAVIGATE_EVENT = "trippo-navigate";

type TrippoNavigateDetail = {
  href?: string;
  route?: string;
  workspaceId?: string;
};

function isOwnGroupMessage(message: WorkspaceChatMessage, currentUserId: string | null) {
  return Boolean(currentUserId && String(message.senderUserId) === currentUserId);
}

function isOwnDirectMessage(message: DirectChatMessage, currentUserId: string | null) {
  return Boolean(currentUserId && String(message.senderUserId) === currentUserId);
}

function isPageActive() {
  return typeof document !== "undefined" && !document.hidden && document.hasFocus();
}

function alertForIncoming(viewingThisChat: boolean, pageActive: boolean) {
  // Show whenever this exact thread is not open (any other page / Messages list),
  // or when the browser/tab/window is backgrounded or unfocused (desktop).
  return !viewingThisChat || !pageActive;
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
  const { mode, activeWorkspace, workspaces, switchToWorkspace } = useWorkspace();
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
  const activeWorkspaceIdRef = useRef(workspaceId);
  const workspacesRef = useRef(workspaces);
  const switchToWorkspaceRef = useRef(switchToWorkspace);

  pathnameRef.current = location.pathname;
  searchRef.current = location.search;
  openRef.current = viewingGroupOnMessages;
  activeWorkspaceIdRef.current = workspaceId;
  workspacesRef.current = workspaces;
  switchToWorkspaceRef.current = switchToWorkspace;

  useEffect(() => {
    const ensureWorkspace = (targetWorkspaceId?: string) => {
      const nextId = targetWorkspaceId ? String(targetWorkspaceId) : "";
      if (!nextId) return;
      if (String(activeWorkspaceIdRef.current) === nextId) return;
      const match = workspacesRef.current.find((w) => String(w.id) === nextId);
      // Soft activate only — avoid full remount jam on notification clicks.
      if (match) switchToWorkspaceRef.current(match, { remount: false });
    };

    const openHref = (href: string, options?: { workspaceId?: string }) => {
      clearUnread();
      refreshMessagesUnreadBadge();
      const target = resolveAppRoute(href || WORKSPACE_GROUP_CHAT_PATH);
      const queryWs = (() => {
        try {
          return new URL(target, window.location.origin).searchParams.get("w") || "";
        } catch {
          return "";
        }
      })();
      const targetWorkspaceId = options?.workspaceId || queryWs || "";
      ensureWorkspace(targetWorkspaceId);

      if (isWorkspaceGroupChatPath(target) || target.includes("/messages/group")) {
        const groupWs = targetWorkspaceId || workspaceId;
        if (groupWs) clearGroupChatOsNotification(groupWs);
      } else {
        const match = target.match(/\/messages\/([^/?]+)/);
        const otherUserId = match?.[1];
        if (otherUserId && otherUserId !== "group") {
          clearDirectChatOsNotification(undefined, otherUserId);
        }
      }
      startTransition(() => {
        navigate(target);
      });
    };

    setWorkspaceChatNotificationClickHandler((href) => openHref(href));

    const onServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data?.type === "OPEN_WORKSPACE_CHAT") {
        const href =
          typeof event.data.href === "string" && event.data.href
            ? event.data.href
            : WORKSPACE_GROUP_CHAT_PATH;
        openHref(href, {
          workspaceId: event.data.workspaceId ? String(event.data.workspaceId) : undefined,
        });
        return;
      }
      if (event.data?.type === "OPEN_DIRECT_CHAT") {
        const otherUserId = event.data.otherUserId ? String(event.data.otherUserId) : "";
        const workspaceFromEvent = event.data.workspaceId
          ? String(event.data.workspaceId)
          : "";
        const href =
          typeof event.data.href === "string" && event.data.href
            ? event.data.href
            : otherUserId
              ? workspaceFromEvent
                ? `/messages/${otherUserId}?w=${encodeURIComponent(workspaceFromEvent)}`
                : `/messages/${otherUserId}`
              : "/messages";
        openHref(href, { workspaceId: workspaceFromEvent || undefined });
        return;
      }
      if (event.data?.type === "NAVIGATE_TO_ROUTE") {
        const href =
          (typeof event.data.href === "string" && event.data.href) ||
          (typeof event.data.route === "string" && event.data.route) ||
          "";
        if (!href) return;
        openHref(href, {
          workspaceId: event.data.workspaceId ? String(event.data.workspaceId) : undefined,
        });
        return;
      }
      if (event.data?.type === "SHOW_STOCK_UPDATE") {
        const href =
          (typeof event.data.route === "string" && event.data.route) || "/products";
        openHref(href);
      }
    };

    const onTrippoNavigate = (event: Event) => {
      const detail = (event as CustomEvent<TrippoNavigateDetail>).detail || {};
      const href = detail.href || detail.route || "";
      if (!href) return;
      openHref(href, {
        workspaceId: detail.workspaceId ? String(detail.workspaceId) : undefined,
      });
    };

    navigator.serviceWorker?.addEventListener("message", onServiceWorkerMessage);
    window.addEventListener(TRIPPO_NAVIGATE_EVENT, onTrippoNavigate);

    return () => {
      setWorkspaceChatNotificationClickHandler(null);
      navigator.serviceWorker?.removeEventListener("message", onServiceWorkerMessage);
      window.removeEventListener(TRIPPO_NAVIGATE_EVENT, onTrippoNavigate);
    };
  }, [clearUnread, navigate, workspaceId]);

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
    if (!isPageActive()) return;
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
    if (!currentUserId) return;

    const setupNotifications = async () => {
      notificationService.checkPermission();
      if (notificationService.needsPermission()) {
        // Soft prompt only when the user is already in messaging context.
        const onMessages = pathnameRef.current.startsWith("/messages");
        if (!onMessages && mode !== "workspace") return;
        const result = await notificationService.requestPermission();
        if (result !== "granted") return;
      }

      if (notificationService.isAllowed()) {
        await registerWebPushSubscription();
      }
    };

    void setupNotifications();
  }, [mode, workspaceId, currentUserId, location.pathname]);

  useWorkspaceChatSocket(workspaceId, mode === "workspace" && Boolean(workspaceId), {
    onMessage: (message) => {
      if (isOwnGroupMessage(message, currentUserId)) return;

      const viewingThisChat = openRef.current;
      const pageActive = isPageActive();

      if (!viewingThisChat) {
        incrementUnread();
        bumpMessagesUnread(1);
      }

      if (!alertForIncoming(viewingThisChat, pageActive)) return;

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
      const pageActive = isPageActive();

      if (!viewingThisChat) {
        bumpMessagesUnread(1);
      }

      if (!alertForIncoming(viewingThisChat, pageActive)) return;

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
