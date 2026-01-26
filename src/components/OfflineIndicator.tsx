// Offline/Online status indicator component

import { useOffline } from "@/hooks/useOffline";
import { Wifi, WifiOff, Cloud, CloudOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { playSyncBeep, playErrorBeep, playWarningBeep, initAudio } from "@/lib/sound";

export function OfflineIndicator() {
  const { isOnline, pendingSyncs, syncAll } = useOffline();
  const { toast } = useToast();

  const handleSync = async () => {
    if (!isOnline) {
      playWarningBeep();
      toast({
        title: "Offline",
        description: "Cannot sync while offline. Please check your internet connection.",
        variant: "destructive",
      });
      return;
    }

    try {
      const currentPending = pendingSyncs;
      console.log(`[OfflineIndicator] Starting sync for ${currentPending} pending items...`);
      await syncAll();
      
      // Wait a bit for sync to complete and status to update
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check sync status after completion
      const { getSyncStatus } = await import("@/lib/syncManager");
      const status = await getSyncStatus();
      console.log(`[OfflineIndicator] Sync status after completion:`, status);
      
      playSyncBeep();
      if (status.pending === 0) {
        toast({
          title: "Sync Complete",
          description: `Successfully synced ${currentPending} pending change${currentPending !== 1 ? "s" : ""}. Please refresh the page to see updated data.`,
        });
        // Optionally refresh after a delay
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        toast({
          title: "Sync Partially Complete",
          description: `Synced some changes, but ${status.pending} still pending. Check console for details.`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("[OfflineIndicator] Sync error:", error);
      playErrorBeep();
      toast({
        title: "Sync Failed",
        description: "Failed to sync changes. Please check the browser console (F12) for details and try again.",
        variant: "destructive",
      });
    }
  };

  if (isOnline && pendingSyncs === 0) {
    return null; // Don't show indicator when everything is synced
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
                  {pendingSyncs} pending sync{pendingSyncs !== 1 ? "s" : ""}
                </span>
                <Button
                  onClick={handleSync}
                  variant="outline"
                  size="sm"
                  className="h-7 px-3 text-xs bg-primary-foreground/10 hover:bg-primary-foreground/20 text-primary-foreground border-primary-foreground/20"
                >
                  Sync Now
                </Button>
              </>
            )}
          </>
        ) : (
          <>
            <WifiOff size={18} />
            <CloudOff size={18} />
            <span className="text-sm font-medium">Offline Mode - Changes will sync when online</span>
          </>
        )}
      </div>
    </div>
  );
}
