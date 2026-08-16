import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { displayCurrencyCode } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, HelpCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";
import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";
import { subscriptionApi, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { DEFAULT_SUBSCRIPTION_AMOUNT } from "@/lib/subscription";
import {
  clearPendingPaymentRef,
  getBillingNoPromptHint,
  getPaymentUserMessage,
  hasPaidSubscription,
  isPaymentSettled,
  savePendingPaymentRef,
  type PaymentStatusPayload,
} from "@/lib/subscriptionPayment";
import { usePlatformContact } from "@/hooks/usePlatformContact";
import { TextWithUssdCodes, ussdToastDescription } from "@/components/billing/TextWithUssdCodes";
import { useSettingsModal } from "@/components/settings/SettingsModalContext";

type MobileNetwork = "mtn" | "airtel";

function formatBillingDate(value: string | Date | null | undefined) {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getDaysRemaining(value: string | Date | null | undefined): number | null {
  if (!value) return null;
  const end = typeof value === "string" ? new Date(value) : value;
  const endMs = end.getTime();
  if (Number.isNaN(endMs)) return null;
  const now = new Date();
  const diffMs = endMs - now.getTime();
  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(0, days);
}

function getPeriodTotalDays(
  startValue: string | Date | null | undefined,
  endValue: string | Date | null | undefined,
): number | null {
  if (!startValue || !endValue) return null;
  const start = typeof startValue === "string" ? new Date(startValue) : startValue;
  const end = typeof endValue === "string" ? new Date(endValue) : endValue;
  const startMs = start.getTime();
  const endMs = end.getTime();
  if (Number.isNaN(startMs) || Number.isNaN(endMs)) return null;
  const diffMs = endMs - startMs;
  if (diffMs <= 0) return null;
  return Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

function SummaryRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-gray-100 py-3 last:border-b-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-right text-sm font-medium text-gray-900">{value}</span>
    </div>
  );
}

function SectionCard({
  title,
  description,
  children,
  className,
}: {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-lg border border-gray-200 bg-white", className)}>
      {(title || description) && (
        <header className="border-b border-gray-100 px-4 py-3 sm:px-5">
          {title ? <h2 className="text-sm font-semibold text-gray-900">{title}</h2> : null}
          {description ? (
            <p className={cn("text-xs leading-relaxed text-gray-500", title && "mt-0.5")}>
              {description}
            </p>
          ) : null}
        </header>
      )}
      <div className="px-4 py-4 sm:px-5 sm:py-5">{children}</div>
    </section>
  );
}

function NetworkOption({
  id,
  value,
  label,
  logoSrc,
  selected,
}: {
  id: string;
  value: MobileNetwork;
  label: string;
  logoSrc: string;
  logoAlt: string;
  selected?: boolean;
}) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-md border border-gray-200 bg-white px-2.5 py-2 transition-colors",
        selected ? "border-sky-400 bg-sky-50" : "hover:border-gray-300 hover:bg-gray-50",
      )}
    >
      <RadioGroupItem
        value={value}
        id={id}
        aria-label={label}
        className={cn(
          "h-5 w-5 shrink-0 rounded border border-solid !border-gray-400 bg-white text-white shadow-none",
          "hover:!border-gray-500",
          "data-[state=checked]:bg-sky-400 data-[state=checked]:!border-gray-400 data-[state=checked]:text-white",
          "focus-visible:outline-none focus-visible:ring-0",
          "[&_svg]:h-2.5 [&_svg]:w-2.5 data-[state=checked]:[&_svg]:fill-white",
        )}
      />
      <img src={logoSrc} alt="" className="h-6 w-6 shrink-0 object-contain" />
      <span
        className={cn(
          "truncate text-xs font-medium sm:text-sm",
          selected ? "text-gray-900" : "text-gray-600",
        )}
      >
        {label}
      </span>
    </label>
  );
}

export default function Billing({ embedded = false }: { embedded?: boolean }) {
  const { toast } = useToast();
  const { t } = useTranslation();
  const { contact } = usePlatformContact();
  const { openSettings } = useSettingsModal();

  const {
    loading,
    statusError,
    configError,
    plan,
    paymentConfig,
    pendingPayment,
    refresh,
    updatePlan,
  } = useSubscriptionAccess();
  const [paying, setPaying] = useState(false);
  const [polling, setPolling] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [network, setNetwork] = useState<MobileNetwork | null>(null);
  const pollStartedRef = useRef(false);

  useEffect(() => {
    const storedPhone = localStorage.getItem("profit-pilot-user-phone");
    if (storedPhone) setPhone(storedPhone);
  }, []);

  useEffect(() => {
    void refresh(true);
  }, [refresh]);

  // Drop stale client-side refs unless the server still has a pending payment
  useEffect(() => {
    if (loading) return;
    if (!pendingPayment?.referenceId) {
      clearPendingPaymentRef();
    }
  }, [loading, pendingPayment?.referenceId]);

  const periodStart = plan?.isOnTrial
    ? plan.startDate || plan.lastPaidAt
    : plan?.lastPaidAt || plan?.startDate;

  const periodEnd = plan?.isOnTrial ? plan.trialEndsAt : plan?.nextDueDate;
  const daysRemaining = getDaysRemaining(periodEnd);
  const totalDays = getPeriodTotalDays(periodStart, periodEnd);
  const usedPct =
    daysRemaining == null || totalDays == null ? null : Math.min(100, Math.max(0, Math.round(((totalDays - daysRemaining) / totalDays) * 100)));

  const packageName = plan?.planName ? `${plan.planName} Pack` : t("plusPack");
  const amount = plan?.amount ?? DEFAULT_SUBSCRIPTION_AMOUNT;
  const currency = plan?.currency || "RWF";
  const currencyLabel = displayCurrencyCode(currency);
  const requiredTotal = Math.ceil(amount * 1.023);
  const paymentMessageOptions = {
    network,
    amount,
    requiredTotal,
  };

  const isPaidActive = hasPaidSubscription(plan);
  const isTrialEnded = Boolean(plan?.requiresPayment && !plan?.hasPlus);
  const isCancelled = Boolean(plan?.isCancelled);
  const canCancelPlan = Boolean(
    !isCancelled && (plan?.hasPlus || plan?.isOnTrial || isPaidActive),
  );
  const paymentReady = Boolean(paymentConfig?.mock || paymentConfig?.configured);
  const promptsEnabled = Boolean(paymentConfig?.mock || paymentConfig?.livePrompts !== false);
  const canPay =
    paymentReady &&
    promptsEnabled &&
    !isPaidActive &&
    ((plan?.isOnTrial && !isCancelled) ||
      plan?.requiresPayment ||
      plan?.status === "past_due" ||
      (isCancelled && !plan?.hasPlus));

  const stopProcessing = useCallback(() => {
    pollStartedRef.current = false;
    setPolling(false);
    setPaying(false);
  }, []);

  const showPaymentSuccess = useCallback(() => {
    clearPendingPaymentRef();
    stopProcessing();
    toast({
      title: t("billingPaymentSuccess"),
      description: t("billingPaymentSuccessDesc"),
    });
    window.dispatchEvent(new Event("subscription-updated"));
  }, [t, stopProcessing, toast]);

  const pollPayment = useCallback(
    async (referenceId: string) => {
      savePendingPaymentRef(referenceId);
      setPolling(true);
      const maxAttempts = 48;

      const checkStatus = async () => {
        const res = await subscriptionApi.getPaymentStatus(referenceId);
        const payload = res.data as PaymentStatusPayload;
        if (payload.plan) updatePlan(payload.plan as typeof plan);
        return payload;
      };

      for (let i = 0; i < maxAttempts; i++) {
        if (i > 0) {
          await new Promise((r) => setTimeout(r, 5000));
        }
        try {
          const payload = await checkStatus();
          const status = payload.payment.status;
          const syncIssue = payload.payment.sync?.latestIssue;
          const issueMessage = getPaymentUserMessage(syncIssue, contact, paymentMessageOptions);

          if (isPaymentSettled(payload)) {
            await refresh(true);
            showPaymentSuccess();
            return;
          }

          if (syncIssue?.code === "REF_OWNED_BY_OTHER_USER") {
            clearPendingPaymentRef();
            toast({
              title: t("billingPaymentIssue"),
              description: ussdToastDescription(issueMessage || syncIssue.message || ""),
              variant: "destructive",
            });
            stopProcessing();
            return;
          }

          if (status === "FAILED") {
            clearPendingPaymentRef();
            stopProcessing();
            await refresh(true);
            const reason =
              issueMessage ||
              payload.payment.providerStatus ||
              payload.payment.mtnStatus ||
              t("billingMoMoDeclined");
            toast({
              title: t("billingPaymentFailed"),
              description: ussdToastDescription(reason),
              variant: "destructive",
            });
            stopProcessing();
            return;
          }
        } catch {
          // keep polling through transient errors
        }
      }

      try {
        const finalCheck = await subscriptionApi.getPaymentStatus(referenceId);
        const finalPayload = finalCheck.data as PaymentStatusPayload;
        if (isPaymentSettled(finalPayload)) {
          if (finalPayload.plan) updatePlan(finalPayload.plan as typeof plan);
          await refresh(true);
          showPaymentSuccess();
          return;
        }
        if (finalPayload.payment?.status === "FAILED") {
          clearPendingPaymentRef();
          await refresh(true);
          stopProcessing();
          return;
        }
      } catch {
        // ignore
      }

      await refresh(true);
      stopProcessing();
      toast({
        title: t("billingStillConfirming"),
        description: t("billingStillConfirmingDesc"),
      });
    },
    [refresh, showPaymentSuccess, stopProcessing, t, toast, updatePlan],
  );

  // Resume polling only for a live server-side PENDING payment after sync
  useEffect(() => {
    if (loading || pollStartedRef.current || paying || polling) return;
    if (!pendingPayment?.referenceId || pendingPayment.status !== "PENDING") return;
    if (hasPaidSubscription(plan)) {
      clearPendingPaymentRef();
      return;
    }

    pollStartedRef.current = true;
    void (async () => {
      await refresh(true);
      void pollPayment(pendingPayment.referenceId);
    })();
  }, [loading, paying, polling, pendingPayment, plan, pollPayment, refresh]);

  const handleCancelPlan = async () => {
    if (cancelling) return;
    setCancelling(true);
    try {
      stopProcessing();
      clearPendingPaymentRef();
      const res = await subscriptionApi.cancel();
      const data = res.data as { plan?: typeof plan };
      const updatedPlan = data?.plan ?? null;
      if (updatedPlan) updatePlan(updatedPlan);
      await refresh(true);
      setCancelDialogOpen(false);
      toast({
        title: t("billingCancelledTitle"),
        description:
          updatedPlan?.hasPlus && updatedPlan.nextDueDate
            ? `${t("billingCancelledUntil")} ${formatBillingDate(updatedPlan.nextDueDate)}.`
            : t("billingCancelNoPlusAccess"),
      });
      window.dispatchEvent(new Event("subscription-updated"));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Could not cancel plan.";
      toast({ title: t("error"), description: message, variant: "destructive" });
    } finally {
      setCancelling(false);
    }
  };

  const handlePay = async (options?: { forceRetry?: boolean }) => {
    if (!network) {
      toast({
        title: t("billingSelectNetwork"),
        description: t("billingSelectNetworkDesc"),
        variant: "destructive",
      });
      return;
    }

    if (!phone.trim()) {
      toast({
        title: t("billingPhoneRequired"),
        description: t("billingPhoneRequiredDesc"),
        variant: "destructive",
      });
      return;
    }

    const digits = phone.replace(/\D/g, "");
    const isMtn =
      digits.startsWith("078") ||
      digits.startsWith("079") ||
      digits.startsWith("25078") ||
      digits.startsWith("25079");
    const isAirtel =
      digits.startsWith("072") ||
      digits.startsWith("073") ||
      digits.startsWith("25072") ||
      digits.startsWith("25073");

    if (network === "mtn" && !isMtn) {
      toast({
        title: t("billingInvalidNumber"),
        description: t("billingInvalidMtn"),
        variant: "destructive",
      });
      return;
    }
    if (network === "airtel" && !isAirtel) {
      toast({
        title: t("billingInvalidNumber"),
        description: t("billingInvalidAirtel"),
        variant: "destructive",
      });
      return;
    }

    if (paying) return;
    if (polling && !options?.forceRetry) return;

    if (polling && options?.forceRetry) {
      stopProcessing();
    }

    setPaying(true);
    try {
      try {
        localStorage.setItem("profit-pilot-user-phone", phone.trim());
      } catch {
        // ignore storage errors
      }
      const res = await subscriptionApi.pay(phone.trim(), network ?? undefined, {
        forceRetry: options?.forceRetry,
      });
      const data = res.data as {
        referenceId: string;
        inProgress?: boolean;
        status?: string;
      };

      if (data.status === "SUCCESSFUL") {
        await refresh(true);
        showPaymentSuccess();
        return;
      }

      if (data.inProgress) {
        toast({
          title: t("billingPaymentInProgress"),
          description: t("billingPayInProgressDesc"),
        });
      } else {
        toast({
          title: t("billingApproveOnPhone"),
          description: ussdToastDescription(t("billingApproveOnPhoneDesc")),
        });
      }
      void pollPayment(data.referenceId);
    } catch (error: unknown) {
      stopProcessing();
      clearPendingPaymentRef();
      let message = error instanceof Error ? error.message : "Could not start payment.";
      if (error instanceof ApiError) {
        const code = typeof error.response?.code === "string" ? error.response.code : undefined;
        const mapped = getPaymentUserMessage({ code: code || "", message }, contact, paymentMessageOptions);
        if (mapped) message = mapped;
      }
      await refresh(true);
      toast({ title: t("billingPaymentError"), description: ussdToastDescription(message), variant: "destructive" });
    } finally {
      setPaying(false);
    }
  };

  const billingBody = (
    <>
      <div className="flex w-full min-h-0 flex-col space-y-4 pb-4">
        {loading ? (
          <div className="flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white py-16 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("loading")}
          </div>
        ) : (
          <div className="space-y-4">
            {isTrialEnded ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="text-sm font-semibold text-amber-950">{t("billingPaymentRequired")}</p>
                <p className="mt-1 text-xs text-amber-800">{t("billingTrialEndedBanner")}</p>
              </div>
            ) : null}

            {paymentConfig?.configured && paymentConfig.livePrompts === false && !paymentConfig.mock ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="text-sm font-semibold text-amber-950">{t("billingPromptsUnavailable")}</p>
                <p className="mt-1 text-xs text-amber-800">
                  {t("billingPromptsUnavailableDesc")}
                  {paymentConfig.webhookMode
                    ? ` (${t("billingWebhookMode")}: ${paymentConfig.webhookMode})`
                    : null}
                </p>
              </div>
            ) : null}

            <div
              className={cn(
                "grid gap-4",
                !isPaidActive && (canPay || !paymentReady) ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1",
              )}
            >
              <div className="space-y-4">
                {!isPaidActive ? (
                  <SectionCard title={t("billingSummary")} description={t("billingSummarySubtitle")}>
                    <div>
                      <SummaryRow label={t("billingPackage")} value={packageName} />
                      <SummaryRow
                        label={t("price")}
                        value={`${amount.toLocaleString()} ${currencyLabel}`}
                      />
                      {plan?.status ? (
                        <SummaryRow
                          label="Status"
                          value={
                            <Badge
                              className={cn(
                                "border capitalize shadow-none",
                                plan.status === "past_due"
                                  ? "border-red-200 bg-red-50 text-red-800 hover:bg-red-50"
                                  : plan.status === "active"
                                    ? "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-50"
                                    : "border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-50",
                              )}
                            >
                              {plan.status}
                            </Badge>
                          }
                        />
                      ) : null}
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-gray-200 pt-4">
                      <span className="text-sm font-semibold text-gray-900">{t("total")}</span>
                      <span className="text-base font-semibold tabular-nums text-gray-900">
                        {amount.toLocaleString()} {currencyLabel}
                      </span>
                    </div>

                    {isCancelled ? (
                      <div className="mt-4 rounded-md border border-gray-200 bg-gray-50 px-3 py-3">
                        <p className="text-sm font-medium text-gray-900">{t("billingCancelledTitle")}</p>
                        <p className="mt-1 text-xs text-gray-500">
                          {plan?.hasPlus && plan.nextDueDate
                            ? `${t("billingCancelledUntil")} ${formatBillingDate(plan.nextDueDate)}.`
                            : t("billingNotBilledMonthly")}
                        </p>
                      </div>
                    ) : canCancelPlan ? (
                      <div className="mt-4">
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full border-red-300 text-red-700 hover:bg-red-50 hover:text-red-800"
                          onClick={() => setCancelDialogOpen(true)}
                          disabled={paying || polling || cancelling}
                        >
                          {t("billingCancelPlan")}
                        </Button>
                      </div>
                    ) : null}
                  </SectionCard>
                ) : null}

                {isPaidActive ? (
                  <>
                    <SectionCard>
                      <div className="flex items-start gap-3">
                        <img
                          src="/paid.png"
                          alt=""
                          aria-hidden
                          className="h-10 w-10 shrink-0 object-contain"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-gray-900">
                              {t("billingPaymentSuccess")}
                            </p>
                            <Badge className="border border-emerald-200 bg-emerald-50 capitalize text-emerald-800 shadow-none hover:bg-emerald-50">
                              {plan?.status === "past_due" || plan?.status === "cancelled"
                                ? plan.status
                                : "active"}
                            </Badge>
                          </div>
                          <dl className="mt-3 space-y-1.5 text-xs text-gray-600">
                            <div className="flex justify-between gap-3">
                              <dt>{t("billingPlusActiveUntil")}</dt>
                              <dd className="font-medium text-gray-900">
                                {formatBillingDate(plan.nextDueDate)}
                              </dd>
                            </div>
                            {plan.lastPaidAt ? (
                              <div className="flex justify-between gap-3">
                                <dt>{t("billingLastPaid")}</dt>
                                <dd className="font-medium text-gray-900">
                                  {formatBillingDate(plan.lastPaidAt)}
                                </dd>
                              </div>
                            ) : null}
                            {phone.trim() ? (
                              <div className="flex justify-between gap-3">
                                <dt>{t("billingPhone")}</dt>
                                <dd className="font-medium text-gray-900">{phone.trim()}</dd>
                              </div>
                            ) : null}
                            <div className="flex justify-between gap-3">
                              <dt>{t("billingPackage")}</dt>
                              <dd className="font-medium text-gray-900">{packageName}</dd>
                            </div>
                            <div className="flex justify-between gap-3">
                              <dt>{t("price")}</dt>
                              <dd className="font-medium text-gray-900">
                                {amount.toLocaleString()} {currencyLabel}
                              </dd>
                            </div>
                          </dl>
                        </div>
                      </div>

                      {daysRemaining != null ? (
                        <div className="mt-4 border-t border-gray-100 pt-4">
                          <div className="flex items-center justify-between text-xs text-gray-600">
                            <span>{t("daysRemaining").replace("{days}", String(daysRemaining))}</span>
                            <span className="font-semibold tabular-nums text-gray-900">
                              {daysRemaining.toLocaleString()}{" "}
                              {daysRemaining === 1 ? "day" : "days"}
                            </span>
                          </div>
                          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100">
                            <div
                              className="h-full bg-emerald-500"
                              style={{ width: `${usedPct ?? 0}%` }}
                            />
                          </div>
                          <p className="mt-1.5 text-right text-[11px] tabular-nums text-gray-400">
                            {formatBillingDate(periodStart)} → {formatBillingDate(periodEnd)}
                          </p>
                        </div>
                      ) : null}
                    </SectionCard>

                    {isCancelled ? (
                      <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
                        <p className="text-sm font-medium text-gray-900">{t("billingCancelledTitle")}</p>
                        <p className="mt-1 text-xs text-gray-500">
                          {plan?.hasPlus && plan.nextDueDate
                            ? `${t("billingCancelledUntil")} ${formatBillingDate(plan.nextDueDate)}.`
                            : t("billingNotBilledMonthly")}
                        </p>
                      </div>
                    ) : canCancelPlan ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full border-red-300 text-red-700 hover:bg-red-50 hover:text-red-800"
                        onClick={() => setCancelDialogOpen(true)}
                        disabled={paying || polling || cancelling}
                      >
                        {t("billingCancelPlan")}
                      </Button>
                    ) : null}
                  </>
                ) : null}
              </div>

              {!isPaidActive ? (
                <SectionCard
                  title={canPay && paymentReady ? t("billingSelectNetwork") : undefined}
                  description={canPay && paymentReady ? t("billingSelectNetworkDesc") : undefined}
                  className="relative min-h-[280px]"
                >
                  {(paying || polling) && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-lg border border-gray-200 bg-white/95 px-4">
                      <Loader2 className="h-7 w-7 animate-spin text-sky-600" />
                      <p className="text-center text-sm font-medium text-gray-900">
                        {t("billingProcessing")}
                      </p>
                      <p className="text-center text-xs text-gray-500">
                        {t("billingCheckPhoneApprove")}
                      </p>
                      {polling ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="mt-1 shadow-none"
                          onClick={() => void handlePay({ forceRetry: true })}
                        >
                          {t("billingSendNewPrompt")}
                        </Button>
                      ) : null}
                    </div>
                  )}

                  {canPay && paymentReady ? (
                    <div className="space-y-4">
                      <RadioGroup
                        value={network ?? ""}
                        onValueChange={(v) => setNetwork(v as MobileNetwork)}
                        className="flex w-full flex-row gap-2"
                        disabled={paying || polling}
                      >
                        <NetworkOption
                          id="pay-mtn"
                          value="mtn"
                          label="MTN MoMo"
                          logoSrc="/mtn.png"
                          logoAlt="MTN MoMo"
                          selected={network === "mtn"}
                        />
                        <NetworkOption
                          id="pay-airtel"
                          value="airtel"
                          label="Airtel Money"
                          logoSrc="/airtel.png"
                          logoAlt="Airtel Money"
                          selected={network === "airtel"}
                        />
                      </RadioGroup>

                      <div className="space-y-1.5">
                        <Label htmlFor="billing-phone">{t("billingPhone")}</Label>
                        <Input
                          id="billing-phone"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder={network === "airtel" ? "0721234567" : "0781234567"}
                          disabled={paying || polling}
                          className="border border-gray-300 shadow-none focus-visible:shadow-none"
                        />
                      </div>

                      {network ? (
                        <div className="space-y-1.5 rounded-md border border-gray-100 bg-gray-50 px-3 py-2.5 text-xs leading-relaxed text-gray-600">
                          <p>{t("billingPinHint")}</p>
                          <p>
                            {t("billingHaveMoMoBalance")
                              .replace("{amount}", Math.ceil(amount * 1.023).toLocaleString())
                              .replace("{base}", amount.toLocaleString())}
                          </p>
                          <p>
                            <TextWithUssdCodes text={getBillingNoPromptHint(network, contact)} />
                          </p>
                        </div>
                      ) : null}

                      <Button
                        onClick={() => void handlePay(polling ? { forceRetry: true } : undefined)}
                        disabled={paying || !network}
                        className="h-10 w-full bg-sky-500 font-semibold text-white shadow-none hover:bg-sky-600"
                      >
                        {t("billingPayAmount").replace("{amount}", amount.toLocaleString())}
                      </Button>

                      <button
                        type="button"
                        onClick={() => openSettings("help")}
                        className="inline-flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-gray-800"
                      >
                        <span>Any help?</span>
                        <HelpCircle className="h-3.5 w-3.5" aria-hidden />
                      </button>
                    </div>
                  ) : !paymentReady ? (
                    <div className="space-y-3 text-sm text-gray-600">
                      <p>{t("billingPaymentsUnavailable")}</p>
                      {statusError || configError ? (
                        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                          {statusError || configError} {t("billingBackendError")}
                        </p>
                      ) : (
                        <p className="text-xs text-gray-500">{t("billingPaypackHint")}</p>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full shadow-none"
                        onClick={() => void refresh()}
                      >
                        {t("billingRetry")}
                      </Button>
                    </div>
                  ) : null}
                </SectionCard>
              ) : null}
            </div>
          </div>
        )}
      </div>

      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent className="shadow-none">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("billingCancelTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {isPaidActive || (plan?.lastPaidAt && !plan?.isOnTrial)
                ? t("billingCancelPaidDesc")
                : t("billingCancelTrialDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelling}>{t("billingKeepPlan")}</AlertDialogCancel>
            <AlertDialogAction
              className="border border-red-500 bg-red-500 text-white shadow-none hover:bg-red-600"
              disabled={cancelling}
              onClick={(e) => {
                e.preventDefault();
                void handleCancelPlan();
              }}
            >
              {cancelling ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("billingCancelling")}
                </>
              ) : (
                t("billingCancelConfirm")
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );

  if (embedded) {
    return billingBody;
  }

  return billingBody;
}
