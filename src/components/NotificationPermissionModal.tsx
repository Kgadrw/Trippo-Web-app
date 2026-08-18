import { useState, useEffect } from "react";
import { Bell, X, CheckCircle2, AlertCircle, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { notificationService } from "@/lib/notifications";
import { registerWebPushSubscription, requiresInstalledPwaForPush } from "@/lib/pushNotifications";
import { cn } from "@/lib/utils";

interface NotificationPermissionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPermissionGranted?: () => void;
}

export function NotificationPermissionModal({
  open,
  onOpenChange,
  onPermissionGranted,
}: NotificationPermissionModalProps) {
  const [isRequesting, setIsRequesting] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>("default");
  const [needsHomeScreenInstall, setNeedsHomeScreenInstall] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPermissionStatus(notificationService.getPermission());
    setNeedsHomeScreenInstall(requiresInstalledPwaForPush());
  }, [open]);

  const handleRequestPermission = async () => {
    setIsRequesting(true);
    try {
      const permission = await notificationService.requestPermission();
      setPermissionStatus(permission);

      if (permission === "granted") {
        await registerWebPushSubscription();

        await notificationService.showNotification("general", {
          title: "Chat alerts enabled",
          body: "You’ll get message notifications on this device even when Trippo is closed.",
          icon: "/logo.png",
          tag: "permission-granted",
        });

        onPermissionGranted?.();
        setTimeout(() => {
          onOpenChange(false);
        }, 1500);
      }
    } catch (error) {
      console.error("Error requesting notification permission:", error);
    } finally {
      setIsRequesting(false);
    }
  };

  const handleDecline = () => {
    onOpenChange(false);
    try {
      localStorage.setItem("profit-pilot-notification-declined", "true");
    } catch (error) {
      console.error("Error saving decline status:", error);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 px-4 py-4 backdrop-blur-sm animate-in fade-in-0 duration-300">
      <div className="relative my-auto w-full max-w-md overflow-y-auto overscroll-contain border border-gray-200 bg-white p-6 shadow-2xl animate-slide-down-fade max-h-[calc(100dvh-2rem)]">
        <button
          type="button"
          onClick={handleDecline}
          className="absolute right-4 top-4 z-10 p-1.5 text-gray-400 transition-all duration-200 hover:bg-gray-100/80 hover:text-gray-700"
        >
          <X size={18} />
        </button>

        <div className="relative z-10">
          <div className="mb-4 flex justify-center">
            <div className="bg-gradient-to-br from-blue-500 to-purple-500 p-4 shadow-lg">
              <Bell className="text-white" size={32} />
            </div>
          </div>

          <h2 className="mb-2 text-center text-2xl font-bold text-gray-900">Enable chat alerts</h2>

          <p className="mb-6 text-center text-sm leading-relaxed text-gray-600">
            Get message notifications on desktop and mobile — even when the Trippo tab or browser is
            closed.
          </p>

          <div className="mb-6 space-y-3">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 flex-shrink-0 text-blue-600" size={18} />
              <div>
                <p className="text-sm font-medium text-gray-900">Direct & group messages</p>
                <p className="text-xs text-gray-600">Know when teammates message you</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 flex-shrink-0 text-blue-600" size={18} />
              <div>
                <p className="text-sm font-medium text-gray-900">Works while closed</p>
                <p className="text-xs text-gray-600">
                  Desktop browsers and installed mobile apps both receive push alerts
                </p>
              </div>
            </div>
          </div>

          {needsHomeScreenInstall ? (
            <div className="mb-4 flex items-start gap-2 border border-amber-200 bg-amber-50 p-3">
              <Smartphone className="mt-0.5 flex-shrink-0 text-amber-700" size={18} />
              <div className="flex-1">
                <p className="text-xs font-medium text-amber-900">Install Trippo for iPhone alerts</p>
                <p className="mt-1 text-xs text-amber-800">
                  On iPhone/iPad: tap Share → Add to Home Screen, open Trippo from the icon, then
                  enable notifications.
                </p>
              </div>
            </div>
          ) : null}

          {permissionStatus === "denied" && (
            <div className="mb-4 flex items-start gap-2 border border-red-200 bg-red-50 p-3">
              <AlertCircle className="mt-0.5 flex-shrink-0 text-red-600" size={18} />
              <div className="flex-1">
                <p className="text-xs font-medium text-red-900">Notifications are blocked</p>
                <p className="mt-1 text-xs text-red-700">
                  Enable notifications in your browser or phone settings for Trippo.
                </p>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <Button
              onClick={handleRequestPermission}
              disabled={isRequesting || permissionStatus === "granted"}
              className={cn(
                "flex-1 bg-gradient-to-r from-blue-600 to-purple-600 font-semibold text-white shadow-lg transition-all duration-300 hover:from-blue-700 hover:to-purple-700 hover:shadow-xl",
                permissionStatus === "granted" && "cursor-not-allowed opacity-50",
              )}
            >
              {isRequesting ? (
                "Requesting..."
              ) : permissionStatus === "granted" ? (
                <>
                  <CheckCircle2 size={16} className="mr-2" />
                  Enabled
                </>
              ) : (
                <>
                  <Bell size={16} className="mr-2" />
                  Enable Notifications
                </>
              )}
            </Button>
            <Button
              onClick={handleDecline}
              variant="ghost"
              className="flex-1 font-medium transition-all duration-200 hover:bg-red-100 hover:text-red-700"
            >
              Not Now
            </Button>
          </div>

          <p className="mt-4 text-center text-xs text-gray-500">
            We only send chat alerts you opt into. You can change this anytime in Settings.
          </p>
        </div>
      </div>
    </div>
  );
}
