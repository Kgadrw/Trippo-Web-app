import { Link, useLocation } from "react-router-dom";
import { Crown } from "lucide-react";
import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";
import { useTranslation } from "@/hooks/useTranslation";
import { cn, formatDateWithTime } from "@/lib/utils";
import { DEFAULT_SUBSCRIPTION_AMOUNT } from "@/lib/subscription";

const payButtonClass = cn(
  "inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-xs font-semibold shrink-0",
  "bg-yellow-500 text-gray-900 hover:bg-yellow-600 transition-colors",
);

type PlusBannerProps = {
  variant?: "content" | "sidebar";
  expanded?: boolean;
};

function PlusBadge({ expanded, subtitle }: { expanded: boolean; subtitle?: string }) {
  return (
    <div className={cn("min-w-0", expanded ? "space-y-0.5" : "flex flex-col items-center gap-1")}>
      <div className={cn("flex items-center", expanded ? "gap-1.5" : "flex-col gap-1")}>
        <Crown
          className={cn("shrink-0 text-yellow-400", expanded ? "h-4 w-4" : "h-5 w-5")}
          aria-hidden
        />
        <span
          className={cn(
            "font-bold text-yellow-400 leading-none",
            expanded ? "text-sm tracking-tight" : "text-[10px] uppercase",
          )}
        >
          Plus
        </span>
      </div>
      {expanded && subtitle ? (
        <p className="text-[11px] text-blue-100 leading-snug">{subtitle}</p>
      ) : null}
    </div>
  );
}

function ContentBannerShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "mb-4 rounded-lg border border-yellow-500 px-4 py-3",
        "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3",
        "lg:hidden",
      )}
    >
      {children}
    </div>
  );
}

function SidebarBannerShell({
  children,
  expanded,
}: {
  children: React.ReactNode;
  expanded: boolean;
}) {
  return (
    <div
      className={cn(
        "shrink-0 border-t border-blue-500/50",
        expanded ? "px-3 py-3" : "px-2 py-2",
      )}
    >
      <Link
        to="/billing"
        className={cn(
          "block rounded-lg border border-yellow-500 transition-colors hover:bg-blue-700/40",
          expanded ? "px-3 py-3 space-y-2.5" : "p-2",
        )}
      >
        {children}
      </Link>
    </div>
  );
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
  const showSidebarPlus =
    isSidebar &&
    (plan.isOnTrial || plan.requiresPayment || plan.status === "past_due" || plan.hasPlus);

  if (showSidebarPlus && !expanded) {
    return (
      <SidebarBannerShell expanded={false}>
        <PlusBadge expanded={false} />
      </SidebarBannerShell>
    );
  }

  if (plan.isOnTrial) {
    const days = plan.trialDaysLeft ?? 0;
    const trialSubtitle = t("plusThenPrice")
      .replace("{days}", String(days))
      .replace("{amount}", amount.toLocaleString())
      .replace("{currency}", currency);

    const body = (
      <>
        <div className={cn("flex gap-2.5 min-w-0", isSidebar ? "items-start justify-between gap-3" : "items-start")}>
          {isSidebar ? (
            <PlusBadge expanded subtitle={t("plusTrial")} />
          ) : (
            <>
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
            </>
          )}
        </div>
        {isSidebar ? (
          <>
            <p className="text-[11px] text-blue-100 leading-relaxed">{trialSubtitle}</p>
            <span className={cn(payButtonClass, "w-full justify-center pointer-events-none")}>{t("payNow")}</span>
          </>
        ) : (
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
        )}
      </>
    );

    if (isSidebar) {
      return <SidebarBannerShell expanded={expanded}>{body}</SidebarBannerShell>;
    }
    return <ContentBannerShell>{body}</ContentBannerShell>;
  }

  if (plan.requiresPayment || plan.status === "past_due") {
    const body = (
      <>
        <div className="flex items-start gap-2.5 min-w-0">
          {isSidebar ? (
            <PlusBadge expanded subtitle={t("subscribeToPlus")} />
          ) : (
            <>
              <Crown className="h-5 w-5 shrink-0 text-yellow-500 mt-0.5" aria-hidden />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900">{t("subscribeToPlus")}</p>
                <p className="text-xs text-gray-900 mt-0.5 leading-relaxed">
                  {t("trialEndedPay")
                    .replace("{amount}", amount.toLocaleString())
                    .replace("{currency}", currency)}
                </p>
              </div>
            </>
          )}
        </div>
        {isSidebar ? (
          <>
            <p className="text-[11px] text-blue-100 leading-relaxed">
              {t("payWithMomo")
                .replace("{amount}", amount.toLocaleString())
                .replace("{currency}", currency)}
            </p>
            <span className={cn(payButtonClass, "w-full justify-center pointer-events-none")}>{t("payNow")}</span>
          </>
        ) : (
          <Link to="/billing" className={payButtonClass}>
            {t("payNow")}
          </Link>
        )}
      </>
    );

    if (isSidebar) {
      return <SidebarBannerShell expanded={expanded}>{body}</SidebarBannerShell>;
    }
    return <ContentBannerShell>{body}</ContentBannerShell>;
  }

  if (plan.hasPlus) {
    const body = (
      <>
        {isSidebar ? (
          <PlusBadge expanded subtitle={t("plusActive")} />
        ) : (
          <div className="flex items-center gap-2 min-w-0">
            <Crown className="h-5 w-5 shrink-0 text-yellow-500" aria-hidden />
            <p className="text-xs font-semibold text-gray-900 truncate">
              {t("plusActive")}
            </p>
          </div>
        )}
        {!isSidebar ? (
          <Link
            to="/billing"
            className="text-xs font-semibold text-gray-900 shrink-0 underline-offset-2 hover:underline"
          >
            {t("billing")}
          </Link>
        ) : (
          <p className="text-[11px] font-semibold text-blue-100 text-center">{t("billing")}</p>
        )}
      </>
    );

    if (isSidebar) {
      return <SidebarBannerShell expanded={expanded}>{body}</SidebarBannerShell>;
    }
    return (
      <div className="mb-4 rounded-lg border border-yellow-500 px-4 py-2.5 flex items-center justify-between gap-3 lg:hidden">
        {body}
      </div>
    );
  }

  return null;
}
