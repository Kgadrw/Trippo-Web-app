import { Link, useLocation } from "react-router-dom";
import { Crown } from "lucide-react";
import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";
import { useTranslation } from "@/hooks/useTranslation";
import { cn, formatDateWithTime } from "@/lib/utils";
import { DEFAULT_SUBSCRIPTION_AMOUNT } from "@/lib/subscription";
import { hasPaidSubscription } from "@/lib/subscriptionPayment";

const payButtonClass = cn(
  "inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-xs font-semibold shrink-0",
  "bg-yellow-500 text-gray-900 hover:bg-yellow-600 transition-colors",
);

type PlusBannerProps = {
  variant?: "content" | "sidebar";
  expanded?: boolean;
};

function ContentBannerShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "rounded-lg border border-yellow-500 px-4 py-2.5",
        "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3",
        "lg:hidden bg-amber-50/95 backdrop-blur-sm shadow-sm",
      )}
    >
      {children}
    </div>
  );
}

function SidebarBannerShell({
  children,
  expanded,
  linkToBilling = true,
}: {
  children: React.ReactNode;
  expanded: boolean;
  linkToBilling?: boolean;
}) {
  const shellClass = cn("shrink-0", expanded ? "px-3 py-2 xl:py-3" : "px-2 py-1.5 xl:py-2");
  const innerClass = cn(
    "block transition-colors hover:opacity-90",
    expanded ? "px-1 py-1" : "flex justify-center p-1",
  );

  if (linkToBilling) {
    return (
      <div className={shellClass}>
        <Link to="/billing" className={innerClass}>
          {children}
        </Link>
      </div>
    );
  }

  return <div className={shellClass}>{children}</div>;
}

export function PlusBanner({ variant = "content", expanded = true }: PlusBannerProps) {
  const location = useLocation();
  const { t } = useTranslation();
  const { plan, loading } = useSubscriptionAccess();
  const isBillingRoute = location.pathname.startsWith("/billing");
  const isSidebar = variant === "sidebar";

  if (loading || !plan) return null;
  if (!isSidebar && isBillingRoute) return null;

  const amount = plan.amount ?? DEFAULT_SUBSCRIPTION_AMOUNT;
  const currency = plan.currency || "RWF";
  const isPaid = hasPaidSubscription(plan);

  if (isSidebar) {
    if (isPaid) {
      return (
        <SidebarBannerShell expanded={expanded}>
          <img
            src="/plus.png"
            alt="Trippo Plus"
            className={cn(
              "block object-contain",
              expanded ? "h-14 w-full max-w-[196px]" : "h-11 w-11",
            )}
            loading="lazy"
          />
        </SidebarBannerShell>
      );
    }

    return (
      <SidebarBannerShell expanded={expanded} linkToBilling={false}>
        <Link
          to="/billing"
          className={cn(
            payButtonClass,
            expanded ? "w-full" : "h-11 w-11 px-0 text-[10px] leading-tight",
          )}
        >
          {expanded ? t("payNow") : "Pay"}
        </Link>
      </SidebarBannerShell>
    );
  }

  if (plan.isOnTrial) {
    const days = plan.trialDaysLeft ?? 0;

    return (
      <ContentBannerShell>
        <div className="flex gap-2.5 min-w-0 items-start">
          <Crown className="h-5 w-5 shrink-0 text-yellow-500 mt-0.5" aria-hidden />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900">{t("plusTrial")}</p>
            <p className="text-xs text-gray-900 mt-0.5 leading-relaxed">
              {t("plusTrialDaysLeft").replace("{days}", String(days))}
              {plan.trialEndsAt
                ? ` · ${t("plusTrialEnds").replace("{date}", formatDateWithTime(plan.trialEndsAt))}`
                : ""}
              . {amount.toLocaleString()} {currency}/mo.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Link to="/billing" className={payButtonClass}>
            {t("payNow")}
          </Link>
          <Link
            to="/billing"
            className="text-xs font-semibold text-gray-900 underline-offset-2 hover:underline"
          >
            {t("billing")}
          </Link>
        </div>
      </ContentBannerShell>
    );
  }

  if (plan.requiresPayment || plan.status === "past_due") {
    return (
      <ContentBannerShell>
        <div className="flex items-start gap-2.5 min-w-0">
          <Crown className="h-5 w-5 shrink-0 text-yellow-500 mt-0.5" aria-hidden />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900">{t("subscribeToPlus")}</p>
            <p className="text-xs text-gray-900 mt-0.5 leading-relaxed">
              {t("trialEndedPay")
                .replace("{amount}", amount.toLocaleString())
                .replace("{currency}", currency)}
            </p>
          </div>
        </div>
        <Link to="/billing" className={payButtonClass}>
          {t("payNow")}
        </Link>
      </ContentBannerShell>
    );
  }

  if (plan.hasPlus) {
    return (
      <div className="rounded-lg border border-yellow-500 px-4 py-2 flex items-center justify-between gap-3 lg:hidden bg-amber-50/95 backdrop-blur-sm shadow-sm">
        <div className="flex items-center gap-2 min-w-0">
          <Crown className="h-5 w-5 shrink-0 text-yellow-500" aria-hidden />
          <p className="text-xs font-semibold text-gray-900 truncate">
            {t("plusActive")}
          </p>
        </div>
        <Link
          to="/billing"
          className="text-xs font-semibold text-gray-900 shrink-0 underline-offset-2 hover:underline"
        >
          {t("billing")}
        </Link>
      </div>
    );
  }

  return null;
}
