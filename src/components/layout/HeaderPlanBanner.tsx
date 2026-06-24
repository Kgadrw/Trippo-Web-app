import { useNavigate, useLocation } from "react-router-dom";
import { Crown, CheckCircle2 } from "lucide-react";
import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";
import { useTranslation } from "@/hooks/useTranslation";
import { hasPaidSubscription } from "@/lib/subscriptionPayment";
import { formatTrialDaysLeft, getTrialRemainingFromPlan } from "@/lib/trialDisplay";
import { cn } from "@/lib/utils";

export function HeaderPlanBanner() {
  const { loading, plan } = useSubscriptionAccess();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  if (location.pathname.startsWith("/billing")) {
    return null;
  }

  if (loading) {
    return (
      <div
        className="h-9 animate-pulse border-b border-sidebar-border/80 bg-muted/40"
        aria-hidden
      />
    );
  }

  if (!plan) {
    return null;
  }

  const isPaid = hasPaidSubscription(plan) || Boolean(plan.lastPaidAt && plan.hasPlus && !plan.isOnTrial);
  const trialRemaining = getTrialRemainingFromPlan(plan);
  const needsPayment =
    (plan.requiresPayment && !plan.hasPlus) ||
    plan.status === "past_due";

  let tone: "paid" | "trial" | "due" = "trial";
  let message = t("plusTrial");

  if (isPaid) {
    tone = "paid";
    message = t("plusActive");
  } else if (needsPayment) {
    tone = "due";
    message = t("billingPaymentRequired");
  } else if (plan.isOnTrial) {
    tone = "trial";
    message = trialRemaining
      ? formatTrialDaysLeft(t, trialRemaining.days)
      : t("plusTrial");
  } else if (plan.hasPlus) {
    tone = "paid";
    message = t("plusActive");
  } else {
    tone = "due";
    message = t("subscribeToPlus");
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
      {tone !== "paid" ? (
        <button
          type="button"
          onClick={() => navigate("/billing")}
          className="shrink-0 rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-semibold hover:bg-white/30"
        >
          {t("payNow")}
        </button>
      ) : (
        <span className="shrink-0 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold">
          {t("paid")}
        </span>
      )}
    </div>
  );
}
