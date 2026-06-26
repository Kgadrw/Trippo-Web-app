import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";
import { hasPaidSubscription } from "@/lib/subscriptionPayment";
import { formatTrialDaysLeft, getTrialRemainingFromPlan } from "@/lib/trialDisplay";
import { useTranslation } from "@/hooks/useTranslation";

const DISMISS_STORAGE_PREFIX = "profit-pilot-plan-banner-dismissed";

function getDismissStorageKey() {
  const userId = localStorage.getItem("profit-pilot-user-id");
  return userId ? `${DISMISS_STORAGE_PREFIX}:${userId}` : DISMISS_STORAGE_PREFIX;
}

function getCurrentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function readDismissedMonth() {
  return localStorage.getItem(getDismissStorageKey());
}

function isDismissedForCurrentMonth() {
  const stored = readDismissedMonth();
  if (!stored) return false;
  if (stored === "true") {
    const month = getCurrentMonthKey();
    localStorage.setItem(getDismissStorageKey(), month);
    return true;
  }
  return stored === getCurrentMonthKey();
}

export type HeaderPlanTone = "paid" | "trial" | "due";

export function useHeaderSubscriptionBadge() {
  const { loading, plan } = useSubscriptionAccess();
  const { t } = useTranslation();
  const location = useLocation();
  const [dismissed, setDismissed] = useState(isDismissedForCurrentMonth);

  const syncDismissed = useCallback(() => {
    setDismissed(isDismissedForCurrentMonth());
  }, []);

  useEffect(() => {
    window.addEventListener("plus-banner-dismiss-changed", syncDismissed);
    window.addEventListener("storage", syncDismissed);
    return () => {
      window.removeEventListener("plus-banner-dismiss-changed", syncDismissed);
      window.removeEventListener("storage", syncDismissed);
    };
  }, [syncDismissed]);

  const isPaid = useMemo(
    () =>
      Boolean(
        plan &&
          (hasPaidSubscription(plan) ||
            (plan.lastPaidAt && plan.hasPlus && !plan.isOnTrial)),
      ),
    [plan],
  );

  const trialRemaining = getTrialRemainingFromPlan(plan);
  const needsPayment =
    Boolean(plan) &&
    ((plan.requiresPayment && !plan.hasPlus) || plan.status === "past_due");

  const tone = useMemo((): HeaderPlanTone | null => {
    if (!plan) return null;
    if (isPaid) return "paid";
    if (needsPayment) return "due";
    if (plan.isOnTrial) return "trial";
    if (plan.hasPlus) return "paid";
    return "due";
  }, [plan, isPaid, needsPayment]);

  const message = useMemo(() => {
    if (!plan || !tone) return "";
    if (tone === "paid") return t("plusActive");
    if (tone === "due") return needsPayment ? t("billingPaymentRequired") : t("subscribeToPlus");
    return trialRemaining
      ? formatTrialDaysLeft(t, trialRemaining.days)
      : t("plusTrial");
  }, [plan, tone, needsPayment, trialRemaining, t]);

  const dismissPlanBanner = useCallback(() => {
    localStorage.setItem(getDismissStorageKey(), getCurrentMonthKey());
    setDismissed(true);
    window.dispatchEvent(new Event("plus-banner-dismiss-changed"));
  }, []);

  const onBillingPage = location.pathname.startsWith("/billing");
  const showPlusIcon = isPaid && dismissed && !onBillingPage;
  const showPlanBanner =
    !loading && Boolean(plan && tone) && !onBillingPage && !dismissed;

  return {
    loading,
    plan,
    tone,
    message,
    isPaid,
    showPlanBanner,
    showPlusIcon,
    dismissPlanBanner,
  };
}
