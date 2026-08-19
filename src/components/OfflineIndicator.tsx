import { useConnectivity, dismissRestoredBanner } from "@/hooks/useConnectivity";
import { useOffline } from "@/hooks/useOffline";
import { Wifi, WifiOff, Cloud, CloudOff, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";
import { playSyncBeep, playErrorBeep, playWarningBeep } from "@/lib/sound";
import { getSyncStatus } from "@/lib/syncManager";
import { invalidateRequestCache } from "@/lib/api";
import { useEffect, useRef } from "react";

export function OfflineIndicator() {
  const { online, restoredAt } = useConnectivity();
  const { pendingSyncs, syncAll } = useOffline();
  const { toast } = useToast();
  const { t } = useTranslation();
  const reloadedRef = useRef(false);

  useEffect(() => {
    if (!restoredAt || reloadedRef.current) return;
    reloadedRef.current = true;

    const timer = setTimeout(() => {
      invalidateRequestCache();
      window.dispatchEvent(new Event("force-refresh-data"));
      reloadedRef.current = false;
    }, 1500);
    return () => {
      clearTimeout(timer);
      reloadedRef.current = false;
    };
  }, [restoredAt]);

  const handleSync = async () => {
    if (!online) {
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
      await syncAll();
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const status = await getSyncStatus();

      playSyncBeep();
      if (status.pending === 0) {
        toast({
          title: t("syncComplete"),
          description: t("syncCompleteDesc").replace("{count}", String(currentPending)),
        });
        invalidateRequestCache();
        window.dispatchEvent(new Event("force-refresh-data"));
      } else {
        toast({
          title: t("syncPartial"),
          description: t("syncPartialDesc").replace("{count}", String(status.pending)),
          variant: "destructive",
        });
      }
    } catch {
      playErrorBeep();
      toast({
        title: t("syncFailed"),
        description: t("syncFailedDesc"),
        variant: "destructive",
      });
    }
  };

  const showOffline = !online;
  const showRestored = online && !!restoredAt;
  const showPendingSync = online && !restoredAt && pendingSyncs > 0;

  if (!showOffline && !showRestored && !showPendingSync) return null;

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg transition-all duration-300",
        showOffline && "bg-destructive text-destructive-foreground border border-destructive/20",
        showRestored && "bg-green-600 text-white border border-green-500/30",
        showPendingSync && "bg-primary text-primary-foreground border border-primary/20",
      )}
    >
      <div className="flex items-center gap-2">
        {showOffline && (
          <>
            <WifiOff size={18} />
            <CloudOff size={18} />
            <span className="text-sm font-medium">
              No internet connection — check your network
            </span>
          </>
        )}

        {showRestored && (
          <>
            <CheckCircle2 size={18} />
            <Wifi size={18} />
            <span className="text-sm font-medium">Back online</span>
            <button
              onClick={dismissRestoredBanner}
              className="ml-2 text-xs underline opacity-80 hover:opacity-100"
            >
              Dismiss
            </button>
          </>
        )}

        {showPendingSync && (
          <>
            <Wifi size={18} />
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
      </div>
    </div>
  );
}
