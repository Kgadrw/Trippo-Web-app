// Offline/Online status indicator component

import { useOffline } from "@/hooks/useOffline";
import { Wifi, WifiOff, Cloud, CloudOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";
import { playSyncBeep, playErrorBeep, playWarningBeep, initAudio } from "@/lib/sound";
import { getSyncStatus } from '@/lib/syncManager';

export function OfflineIndicator() {
  const { isOnline, pendingSyncs, syncAll } = useOffline();
  const { toast } = useToast();
  const { t } = useTranslation();

  const handleSync = async () => {
    if (!isOnline) {
      playWarningBeep();
      toast({
        title: t("offlineTitle"),
        description: t("offlineCannotSync"),
        variant: "destructive",
      });
      return;
    }

    try {
      const currentPending = pendingSyncs;
      console.log(`[OfflineIndicator] Starting sync for ${currentPending} pending items...`);
      await syncAll();
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const status = await getSyncStatus();
      console.log(`[OfflineIndicator] Sync status after completion:`, status);
      
      playSyncBeep();
      if (status.pending === 0) {
        toast({
          title: t("syncComplete"),
          description: t("syncCompleteDesc").replace("{count}", String(currentPending)),
        });
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        toast({
          title: t("syncPartial"),
          description: t("syncPartialDesc").replace("{count}", String(status.pending)),
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("[OfflineIndicator] Sync error:", error);
      playErrorBeep();
      toast({
        title: t("syncFailed"),
        description: t("syncFailedDesc"),
        variant: "destructive",
      });
    }
  };

  if (isOnline && pendingSyncs === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-50 flex items-center gap-3 px-4 py-3 shadow-lg transition-all duration-300",
        isOnline
          ? "bg-primary text-primary-foreground border border-primary/20"
          : "bg-destructive text-destructive-foreground border border-destructive/20"
      )}
    >
      <div className="flex items-center gap-2">
        {isOnline ? (
          <>
            <Wifi size={18} />
            {pendingSyncs > 0 && (
              <>
                <Cloud size={18} />
                <span className="text-sm font-medium">
                  {t("pendingSync").replace("{count}", String(pendingSyncs))}
                </span>
                <Button
                  onClick={handleSync}
                  variant="outline"
                  size="sm"
                  className="h-7 px-3 text-xs bg-primary-foreground/10 hover:bg-primary-foreground/20 text-primary-foreground border-primary-foreground/20"
                >
                  {t("syncNow")}
                </Button>
              </>
            )}
          </>
        ) : (
          <>
            <WifiOff size={18} />
            <CloudOff size={18} />
            <span className="text-sm font-medium">{t("offlineModeMessage")}</span>
          </>
        )}
      </div>
    </div>
  );
}
