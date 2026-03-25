import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Bell } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";
import { notificationService } from "@/lib/notifications";

export default function SettingsNotifications() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { language } = useTranslation();

  const [notificationPermission, setNotificationPermission] =
    useState<NotificationPermission>("default");

  useEffect(() => {
    setNotificationPermission(Notification.permission);
  }, []);

  return (
    <AppLayout title={language === "rw" ? "Amatangazo" : language === "fr" ? "Notifications" : "Notifications"}>
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => navigate("/settings")}>
            {language === "rw" ? "Subira" : language === "fr" ? "Retour" : "Back"}
          </Button>
        </div>

        <div className="form-card border border-transparent lg:bg-white bg-white/80 backdrop-blur-sm">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-blue-100 border border-blue-200 flex items-center justify-center rounded-lg">
                <Bell size={16} className="text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-blue-700">
                  {language === "rw" ? "Amatangazo" : language === "fr" ? "Notifications" : "Notifications"}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {language === "rw"
                    ? "genzura amatangazo yo muri browser"
                    : "Manage browser notifications for important updates"}
                </p>
              </div>
            </div>
          </div>

          <Separator className="mb-4 bg-blue-200" />

          <div className="space-y-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-2">
                  <Bell size={14} className="text-blue-600" />
                  Browser Notifications
                </h3>
                <p className="text-xs text-muted-foreground mb-4">
                  Get notified about low stock and other important updates.
                </p>

                <div className="p-4 bg-secondary/30 border border-transparent rounded-lg space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">Notification Status</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {notificationPermission === "granted" && "Notifications are enabled"}
                        {notificationPermission === "denied" && "Notifications are blocked by browser"}
                        {notificationPermission === "default" && "Notification permission not yet requested"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {notificationPermission === "granted" && (
                        <div className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                          Enabled
                        </div>
                      )}
                      {notificationPermission === "denied" && (
                        <div className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                          Blocked
                        </div>
                      )}
                      {notificationPermission === "default" && (
                        <div className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                          Not Set
                        </div>
                      )}
                    </div>
                  </div>

                  {notificationPermission !== "granted" && (
                    <Button
                      onClick={async () => {
                        if (notificationPermission === "denied") {
                          toast({
                            title: "Notifications Blocked",
                            description:
                              "Please enable notifications in your browser settings to receive alerts.",
                            variant: "destructive",
                          });
                          return;
                        }

                        try {
                          const result = await notificationService.requestPermission();
                          setNotificationPermission(result);

                          if (result === "granted") {
                            toast({
                              title: "Notifications Enabled",
                              description: "You will now receive important alerts.",
                            });
                          } else if (result === "denied") {
                            toast({
                              title: "Notifications Blocked",
                              description:
                                "You can change this later in your browser settings if you change your mind.",
                              variant: "destructive",
                            });
                          }
                        } catch (error) {
                          console.error("Error requesting notification permission:", error);
                          toast({
                            title: "Error",
                            description:
                              "Failed to request notification permission. Please try again.",
                            variant: "destructive",
                          });
                        }
                      }}
                      className="bg-blue-600 text-white hover:bg-blue-700 w-full gap-2 h-10 shadow-sm hover:shadow transition-all font-semibold rounded-lg"
                    >
                      <Bell size={14} />
                      {notificationPermission === "denied"
                        ? "Open Browser Settings"
                        : "Enable Notifications"}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

