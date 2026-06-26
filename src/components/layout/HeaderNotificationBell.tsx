import { useState, useEffect } from "react";
import { Bell, ArrowLeft, CheckCheck, Package, AlertTriangle, Building2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { resolveAppRoute } from "@/lib/appRoutes";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { notificationService } from "@/lib/notifications";
import { notificationStore, StoredNotification } from "@/lib/notificationStore";
import { cn } from "@/lib/utils";
import { websocketManager } from "@/lib/websocketManager";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { StockUpdateDialog } from "@/components/StockUpdateDialog";

type HeaderNotificationBellProps = {
  onNotificationClick?: () => void;
  buttonClassName?: string;
  iconSize?: number;
};

export function HeaderNotificationBell({
  onNotificationClick,
  buttonClassName,
  iconSize = 20,
}: HeaderNotificationBellProps) {
  const { user } = useCurrentUser();
  const navigate = useNavigate();
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState<StoredNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedNotification, setSelectedNotification] = useState<StoredNotification | null>(null);
  const [stockUpdateDialogOpen, setStockUpdateDialogOpen] = useState(false);

  useEffect(() => {
    const loadNotifications = () => {
      const allNotifications = notificationStore.getAllNotifications();
      setNotifications(allNotifications);
      setUnreadCount(notificationStore.getUnreadCount());
    };

    loadNotifications();

    const handleNotificationUpdate = () => loadNotifications();
    window.addEventListener("notifications-updated", handleNotificationUpdate);

    const handleStorageChange = () => {
      const currentUserId = localStorage.getItem("profit-pilot-user-id");
      if (currentUserId) {
        loadNotifications();
      } else {
        setNotifications([]);
        setUnreadCount(0);
      }
    };

    window.addEventListener("storage", handleStorageChange);
    const unsubscribeWs = websocketManager.subscribe("notification:created", () => {
      notificationStore.syncFromBackend();
    });
    return () => {
      window.removeEventListener("notifications-updated", handleNotificationUpdate);
      window.removeEventListener("storage", handleStorageChange);
      unsubscribeWs();
    };
  }, [user]);

  const handleNotificationBellClick = () => {
    const opening = !notificationOpen;
    setNotificationOpen(opening);
    setSelectedNotification(null);
    onNotificationClick?.();
    if (opening) {
      notificationStore.syncFromBackend();
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    await notificationStore.markAsRead(notificationId);
    if ("serviceWorker" in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        registration.active?.postMessage({ type: "UPDATE_BADGE" });
      } catch {
        // ignore
      }
    }
  };

  const handleMarkAllAsRead = async () => {
    await notificationStore.markAllAsRead();
    if ("serviceWorker" in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        registration.active?.postMessage({ type: "CLEAR_BADGE" });
      } catch {
        // ignore
      }
    }
  };

  const handleNotificationClick = (notification: StoredNotification) => {
    void handleMarkAsRead(notification.id);
    setSelectedNotification(notification);
  };

  const handleStockUpdated = () => {
    setStockUpdateDialogOpen(false);
    setSelectedNotification(null);
    window.dispatchEvent(new Event("products-should-refresh"));
    setNotifications(notificationStore.getAllNotifications());
    setUnreadCount(notificationStore.getUnreadCount());
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <>
      <button
        type="button"
        onClick={handleNotificationBellClick}
        className={cn(
          "relative flex h-9 w-9 items-center justify-center rounded-full text-gray-600 transition-colors hover:bg-gray-100 active:bg-gray-200 hover:text-gray-900",
          buttonClassName,
          !notificationService.isAllowed() && "text-gray-400",
        )}
        aria-label="Notifications"
      >
        <Bell size={iconSize} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1">
            <span className="text-[10px] font-bold leading-none text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          </span>
        )}
      </button>

      <Sheet open={notificationOpen} onOpenChange={setNotificationOpen}>
        <SheetContent side="right" className="w-full p-0 sm:w-[400px]">
          <SheetHeader className="border-b border-gray-200 px-6 pb-4 pt-6">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-xl font-bold">Notifications</SheetTitle>
              <div className="flex items-center gap-2">
                {selectedNotification && !selectedNotification.read && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void handleMarkAsRead(selectedNotification.id)}
                    className="text-xs text-blue-600 hover:text-blue-700"
                  >
                    <CheckCheck size={14} className="mr-1" />
                    Mark as read
                  </Button>
                )}
                {!selectedNotification && notifications.length > 0 && unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void handleMarkAllAsRead()}
                    className="text-xs text-blue-600 hover:text-blue-700"
                  >
                    <CheckCheck size={14} className="mr-1" />
                    Mark all read
                  </Button>
                )}
              </div>
            </div>
            <SheetDescription className="text-xs text-gray-500">
              {unreadCount > 0
                ? `${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}`
                : notifications.length > 0
                  ? "All caught up!"
                  : "No notifications yet"}
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="h-[calc(100vh-120px)]">
            <div className="px-4 py-4">
              {selectedNotification ? (
                <div className="space-y-4">
                  <button
                    type="button"
                    onClick={() => setSelectedNotification(null)}
                    className="mb-4 flex items-center gap-2 text-gray-600 transition-colors hover:text-gray-900"
                  >
                    <ArrowLeft size={18} />
                    <span className="text-sm font-medium">Back</span>
                  </button>

                  <div
                    className={cn(
                      "border p-4",
                      selectedNotification.read
                        ? "border-gray-200 bg-white"
                        : "border-blue-200 bg-blue-50",
                    )}
                  >
                    <div className="mb-4 flex items-start gap-3">
                      <div
                        className={cn(
                          "p-2",
                          selectedNotification.type === "low_stock" ? "bg-orange-100" : "bg-blue-100",
                        )}
                      >
                        {selectedNotification.type === "low_stock" ? (
                          <AlertTriangle size={20} className="text-orange-600" />
                        ) : selectedNotification.type === "workspace_invite" ? (
                          <Building2 size={20} className="text-blue-600" />
                        ) : (
                          <Bell size={20} className="text-blue-600" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="mb-1 text-base font-semibold text-gray-900">
                          {selectedNotification.title}
                        </h3>
                        <p className="mb-2 text-sm text-gray-600">{selectedNotification.body}</p>
                        <p className="text-xs text-gray-400">
                          {formatTime(selectedNotification.timestamp)}
                        </p>
                      </div>
                    </div>

                    {selectedNotification.type === "low_stock" && selectedNotification.data?.productId && (
                      <div className="mt-4 space-y-3 border-t border-gray-200 pt-4">
                        <Button
                          onClick={() => setStockUpdateDialogOpen(true)}
                          className="w-full bg-sky-400 text-white hover:bg-sky-500 border border-sky-400"
                        >
                          <Package size={16} className="mr-2" />
                          Update Stock
                        </Button>
                      </div>
                    )}

                    {selectedNotification.type !== "low_stock" && selectedNotification.data?.route && (
                      <div className="mt-4 border-t border-gray-200 pt-4">
                        <Button
                          onClick={() => {
                            navigate(resolveAppRoute(selectedNotification.data.route));
                            setNotificationOpen(false);
                            setSelectedNotification(null);
                          }}
                          className="w-full bg-sky-400 text-white hover:bg-sky-500 border border-sky-400"
                        >
                          {selectedNotification.type === "workspace_invite" ? "Accept invitation" : "View Details"}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ) : notifications.length === 0 ? (
                <div className="py-12 text-center">
                  <Bell size={48} className="mx-auto mb-4 text-gray-300" />
                  <p className="mb-1 text-sm font-medium text-gray-600">No notifications</p>
                  <p className="text-xs text-gray-500">You&apos;ll see alerts here when they arrive</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {notifications.map((notification) => (
                    <button
                      key={notification.id}
                      type="button"
                      className={cn(
                        "w-full border p-4 text-left transition-colors",
                        notification.read
                          ? "border-gray-200 bg-white"
                          : "border-blue-200 bg-blue-50",
                      )}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <h4 className="text-sm font-semibold text-gray-900">{notification.title}</h4>
                      <p className="mt-1 line-clamp-2 text-xs text-gray-600">{notification.body}</p>
                      <p className="mt-2 text-[10px] text-gray-400">
                        {formatTime(notification.timestamp)}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>

          {selectedNotification?.type === "low_stock" && selectedNotification.data?.productId && (
            <StockUpdateDialog
              productId={selectedNotification.data.productId}
              productName={selectedNotification.data.productName}
              currentStock={selectedNotification.data.currentStock}
              open={stockUpdateDialogOpen}
              onOpenChange={(open) => {
                setStockUpdateDialogOpen(open);
                if (!open) handleStockUpdated();
              }}
            />
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
