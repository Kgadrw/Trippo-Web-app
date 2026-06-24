import { useNavigate } from "react-router-dom";
import { Crown, CheckCircle2, X } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { useHeaderSubscriptionBadge } from "@/hooks/useHeaderSubscriptionBadge";
import { cn } from "@/lib/utils";

export function HeaderPlanBanner() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { loading, tone, message, showPlanBanner, dismissPaidBanner } = useHeaderSubscriptionBadge();

  if (loading) {
    return (
      <div
        className="h-9 animate-pulse border-b border-sidebar-border/80 bg-muted/40"
        aria-hidden
      />
    );
  }

  if (!showPlanBanner || !tone) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex h-9 shrink-0 items-center justify-between gap-2 border-b px-3 text-xs font-semibold",
        tone === "paid" && "border-emerald-700/25 bg-emerald-600 text-white",
        tone === "trial" && "border-amber-600/25 bg-amber-400 text-amber-950",
        tone === "due" && "border-red-700/25 bg-red-600 text-white",
      )}
    >
      <div className="flex min-w-0 items-center gap-1.5">
        {tone === "paid" ? (
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
        ) : (
          <Crown className="h-3.5 w-3.5 shrink-0" aria-hidden />
        )}
        <span className="truncate">{message}</span>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        {tone !== "paid" ? (
          <button
            type="button"
            onClick={() => navigate("/billing")}
            className="rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-semibold hover:bg-white/30"
          >
            {t("payNow")}
          </button>
        ) : (
          <>
            <span className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold">
              {t("paid")}
            </span>
            <button
              type="button"
              onClick={dismissPaidBanner}
              className="flex h-6 w-6 items-center justify-center rounded-full bg-white/15 hover:bg-white/25"
              aria-label="Dismiss"
            >
              <X className="h-3.5 w-3.5" aria-hidden />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
