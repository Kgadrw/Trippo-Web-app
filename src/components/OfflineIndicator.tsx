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
      await syncAll();
      // Refresh status after sync
      setTimeout(() => {
        // Status will be updated by the hook's interval
      }, 500);
      playSyncBeep();
      toast({
        title: "Sync Complete",
        description: currentPending > 0 
          ? `Successfully synced ${currentPending} pending change${currentPending !== 1 ? "s" : ""}.`
          : "All data is up to date.",
      });
    } catch (error) {
      playErrorBeep();
      toast({
        title: "Sync Failed",
        description: "Failed to sync changes. Please try again.",
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
