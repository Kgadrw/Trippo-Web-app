import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Bell, Smartphone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";
import { notificationService } from "@/lib/notifications";
import { isStandalonePwa, registerWebPushSubscription } from "@/lib/pushNotifications";
import { SettingsSubpageHeader } from "@/components/settings/SettingsSubpageHeader";

export default function SettingsNotifications({ embedded = false }: { embedded?: boolean }) {
  const { toast } = useToast();
  const { t } = useTranslation();

  const [notificationPermission, setNotificationPermission] =
    useState<NotificationPermission>("default");
  const [pushReady, setPushReady] = useState(false);
  const [isInstalledPwa, setIsInstalledPwa] = useState(true);
  const [isAppleMobile, setIsAppleMobile] = useState(false);

  useEffect(() => {
    setNotificationPermission(Notification.permission);
    setIsInstalledPwa(isStandalonePwa());
    setIsAppleMobile(/iPad|iPhone|iPod/.test(navigator.userAgent));

    if (Notification.permission === "granted") {
      void registerWebPushSubscription().then((ok) => setPushReady(ok));
    }
  }, []);

  return (
    <div className={embedded ? "pb-4" : "px-4 pb-4 lg:px-6"}>
      {!embedded ? (
        <SettingsSubpageHeader
          icon={Bell}
          title={t("notificationsPageTitle")}
          description={t("notificationsPageDesc")}
        />
      ) : null}

      <div className="max-w-xl space-y-6">
        <div className="space-y-4">
          <div>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-900">
              <Bell size={14} className="text-gray-500" />
              {t("browserNotificationsTitle")}
            </h3>
            <p className="mb-4 text-xs text-muted-foreground">
              Get chat message alerts even when Trippo is closed. Best reliability comes from the
              Home Screen / installed app.
            </p>

            {!isInstalledPwa ? (
              <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                <Smartphone className="mt-0.5 shrink-0 text-amber-700" size={16} />
                <p className="text-xs text-amber-900">
                  {isAppleMobile
                    ? "On iPhone/iPad: Share → Add to Home Screen, open Trippo from the icon, then enable notifications below."
                    : "Install Trippo to your Home Screen, then enable notifications below for alerts when the app is closed."}
                </p>
              </div>
            ) : null}

            <div className="space-y-4 border border-gray-200 bg-gray-50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">{t("notificationStatusLabel")}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {notificationPermission === "granted" &&
                      (pushReady
                        ? "Enabled — closed-app chat push is active"
                        : t("notifStatusGranted"))}
                    {notificationPermission === "denied" && t("notifStatusDenied")}
                    {notificationPermission === "default" && t("notifStatusDefault")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {notificationPermission === "granted" && (
                    <div className="bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                      {t("statusEnabled")}
                    </div>
                  )}
                  {notificationPermission === "denied" && (
                    <div className="bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
                      {t("statusBlocked")}
                    </div>
                  )}
                  {notificationPermission === "default" && (
                    <div className="bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                      {t("statusNotSet")}
                    </div>
                  )}
                </div>
              </div>

              {notificationPermission !== "granted" && (
                <Button
                  onClick={async () => {
                    if (notificationPermission === "denied") {
                      toast({
                        title: t("notifBlockedTitle"),
                        description: t("notifBlockedBrowserDesc"),
                        variant: "destructive",
                      });
                      return;
                    }

                    try {
                      const result = await notificationService.requestPermission();
                      setNotificationPermission(result);

                      if (result === "granted") {
                        const ok = await registerWebPushSubscription();
                        setPushReady(ok);
                        toast({
                          title: t("notifEnabledTitle"),
                          description: ok
                            ? "Chat alerts will arrive even when Trippo is closed."
                            : t("notifEnabledBody"),
                        });
                      } else if (result === "denied") {
                        toast({
                          title: t("notifBlockedTitle"),
                          description: t("notifDeniedBody"),
                          variant: "destructive",
                        });
                      }
                    } catch (error) {
                      console.error("Error requesting notification permission:", error);
                      toast({
                        title: t("error"),
                        description: t("notifRequestFailed"),
                        variant: "destructive",
                      });
                    }
                  }}
                  className="h-10 w-full gap-2 border border-sky-400 bg-sky-400 font-semibold text-white shadow-sm transition-all hover:bg-sky-500 hover:text-white hover:shadow"
                >
                  <Bell size={14} />
                  {notificationPermission === "denied"
                    ? t("openBrowserSettingsBtn")
                    : t("enableNotificationsBtn")}
                </Button>
              )}

              {notificationPermission === "granted" && !pushReady ? (
                <Button
                  variant="outline"
                  className="h-10 w-full"
                  onClick={async () => {
                    const ok = await registerWebPushSubscription();
                    setPushReady(ok);
                    toast({
                      title: ok ? "Push connected" : "Couldn’t connect push",
                      description: ok
                        ? "This device will receive chat alerts when Trippo is closed."
                        : "Check that the app is installed and try again.",
                      variant: ok ? "default" : "destructive",
                    });
                  }}
                >
                  Connect closed-app push
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
