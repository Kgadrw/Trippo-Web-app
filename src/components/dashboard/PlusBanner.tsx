import { Link } from "react-router-dom";
import { Crown, Sparkles } from "lucide-react";
import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";
import { cn, formatDateWithTime } from "@/lib/utils";

export function PlusBanner() {
  const { plan } = useSubscriptionAccess();

  if (!plan) return null;

  if (plan.isOnTrial) {
    const days = plan.trialDaysLeft ?? 0;
    return (
      <div className="mb-4 rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="h-9 w-9 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
            <Sparkles className="h-4 w-4 text-blue-700" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-blue-900 flex items-center gap-1.5">
              <Crown size={14} className="text-yellow-600" />
              Trippo Plus trial
            </p>
            <p className="text-xs text-blue-800 mt-0.5">
              {days} day{days === 1 ? "" : "s"} left in your free trial
              {plan.trialEndsAt ? ` · ends ${formatDateWithTime(plan.trialEndsAt)}` : ""}. Then{" "}
              {(plan.amount ?? 10000).toLocaleString()} {plan.currency || "RWF"}/month.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Link
            to="/billing"
            className={cn(
              "inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-xs font-semibold",
              "bg-yellow-500 text-gray-900 hover:bg-yellow-600 transition-colors",
            )}
          >
            Pay now
          </Link>
          <Link
            to="/billing"
            className="text-xs font-semibold text-blue-700 hover:text-blue-900 underline-offset-2 hover:underline"
          >
            Billing
          </Link>
        </div>
      </div>
    );
  }

  if (plan.requiresPayment || plan.status === "past_due") {
    return (
      <>
        {/* Reserve space on desktop so content is not hidden under the fixed bar */}
        <div className="hidden lg:block h-[4.25rem] mb-3 shrink-0" aria-hidden="true" />
        <div
          className={cn(
            "mb-4 rounded-xl border border-amber-300 bg-gradient-to-r from-amber-50 to-yellow-50 px-4 py-3",
            "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-sm",
            "lg:fixed lg:top-6 lg:z-50 lg:right-6 lg:px-6",
            "lg:bg-amber-50/95 lg:backdrop-blur-md lg:mb-0",
          )}
          style={{ left: "var(--banner-left, calc(14.5rem + 0.75rem))" }}
        >
          <div className="flex items-start gap-3 min-w-0">
            <div className="h-9 w-9 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
              <Crown className="h-4 w-4 text-amber-800" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-amber-900">Subscribe to Trippo Plus</p>
              <p className="text-xs text-amber-800 mt-0.5">
                Your trial has ended. Pay {(plan.amount ?? 10000).toLocaleString()} {plan.currency || "RWF"}/month
              with mobile money to keep using Trippo.
              </p>
            </div>
          </div>
          <Link
            to="/billing"
            className={cn(
              "inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-xs font-semibold shrink-0",
              "bg-yellow-500 text-gray-900 hover:bg-yellow-600 transition-colors",
            )}
          >
            Pay now
          </Link>
        </div>
      </>
    );
  }

  if (plan.hasPlus) {
    return (
      <div className="mb-4 rounded-xl border border-yellow-200 bg-gradient-to-r from-yellow-50 to-amber-50 px-4 py-2.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Crown className="h-4 w-4 text-yellow-700 shrink-0" />
          <p className="text-xs font-medium text-yellow-900 truncate">
            Trippo <span className="font-bold">Plus</span> active
          </p>
        </div>
        <Link
          to="/billing"
          className="text-xs text-yellow-800 hover:text-yellow-950 shrink-0 underline-offset-2 hover:underline"
        >
          Billing
        </Link>
      </div>
    );
  }

  return null;
}
