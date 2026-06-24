import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";
import { notificationService } from "@/lib/notifications";
import { SettingsSubpageHeader } from "@/components/settings/SettingsSubpageHeader";

export default function SettingsNotifications({ embedded = false }: { embedded?: boolean }) {
  const { toast } = useToast();
  const { t } = useTranslation();

  const [notificationPermission, setNotificationPermission] =
    useState<NotificationPermission>("default");

  useEffect(() => {
    setNotificationPermission(Notification.permission);
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

      <div className="space-y-6 max-w-xl">
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-2">
              <Bell size={14} className="text-gray-500" />
              {t("browserNotificationsTitle")}
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              {t("browserNotificationsBody")}
            </p>

            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">{t("notificationStatusLabel")}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {notificationPermission === "granted" && t("notifStatusGranted")}
                    {notificationPermission === "denied" && t("notifStatusDenied")}
                    {notificationPermission === "default" && t("notifStatusDefault")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {notificationPermission === "granted" && (
                    <div className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                      {t("statusEnabled")}
                    </div>
                  )}
                  {notificationPermission === "denied" && (
                    <div className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                      {t("statusBlocked")}
                    </div>
                  )}
                  {notificationPermission === "default" && (
                    <div className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
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
                        toast({
                          title: t("notifEnabledTitle"),
                          description: t("notifEnabledBody"),
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
                  className="bg-sky-400 text-white hover:bg-sky-500 border border-sky-400 hover:text-white w-full gap-2 h-10 shadow-sm hover:shadow transition-all font-semibold rounded-lg"
                >
                  <Bell size={14} />
                  {notificationPermission === "denied"
                    ? t("openBrowserSettingsBtn")
                    : t("enableNotificationsBtn")}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
