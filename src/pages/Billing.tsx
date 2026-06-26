import { useCallback, useEffect, useRef, useState } from "react";
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
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";
import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";
import { subscriptionApi, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { DEFAULT_SUBSCRIPTION_AMOUNT } from "@/lib/subscription";
import type { Language } from "@/lib/translations";
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
import { PlatformContactCard } from "@/components/support/PlatformContactCard";
import { TextWithUssdCodes, ussdToastDescription } from "@/components/billing/TextWithUssdCodes";

type MobileNetwork = "mtn" | "airtel";

function formatBillingDate(value: string | Date | null | undefined, language: Language) {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  const locale = language === "fr" ? "fr-FR" : language === "rw" ? "rw-RW" : "en-GB";
  return date.toLocaleDateString(locale, {
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

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 text-sm">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="font-medium text-foreground text-right">{value}</span>
    </div>
  );
}

function NetworkOption({
  id,
  value,
  label,
  logoSrc,
  logoAlt,
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
        "flex items-center gap-3 sm:gap-4 cursor-pointer rounded-xl p-4 sm:p-5 w-full border-2 transition-all",
        selected
          ? "border-yellow-500 bg-yellow-50 shadow-sm ring-2 ring-yellow-500/25"
          : "border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50",
      )}
    >
      <RadioGroupItem
        value={value}
        id={id}
        aria-label={label}
        className={cn(
          "h-5 w-5 shrink-0 rounded-full border-2 bg-white shadow-sm",
          "border-gray-500 text-yellow-600",
          "data-[state=checked]:border-yellow-500 data-[state=checked]:bg-yellow-500 data-[state=checked]:text-white",
          "[&_svg]:h-2.5 [&_svg]:w-2.5 data-[state=checked]:[&_svg]:fill-white",
        )}
      />
      <img src={logoSrc} alt="" className="h-14 w-14 sm:h-16 sm:w-16 object-contain shrink-0" />
      <span
        className={cn(
          "text-sm font-semibold sr-only sm:not-sr-only",
          selected ? "text-gray-900" : "text-muted-foreground",
        )}
      >
        {label}
      </span>
    </label>
  );
}

export default function Billing({ embedded = false }: { embedded?: boolean }) {
  const { toast } = useToast();
  const { t, language } = useTranslation();
  const { contact } = usePlatformContact();

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
          const issueMessage = getPaymentUserMessage(syncIssue, language, contact, paymentMessageOptions);

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
    [language, refresh, showPaymentSuccess, stopProcessing, t, toast, updatePlan],
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
            ? `${t("billingCancelledUntil")} ${formatBillingDate(updatedPlan.nextDueDate, language)}.`
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
        const mapped = getPaymentUserMessage({ code: code || "", message }, language, contact, paymentMessageOptions);
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
      <div className="flex flex-col min-h-0 w-full space-y-4 pb-4">
        {loading ? (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-20 lg:bg-white lg:rounded-lg">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("loading")}
          </div>
        ) : (
          <div className="space-y-4 w-full">
            {isTrialEnded ? (
              <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <p className="font-semibold">{t("billingPaymentRequired")}</p>
                <p className="text-xs text-amber-800 mt-1">{t("billingTrialEndedBanner")}</p>
              </div>
            ) : null}
            {paymentConfig?.configured && paymentConfig.livePrompts === false && !paymentConfig.mock ? (
              <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <p className="font-semibold">{t("billingPromptsUnavailable")}</p>
                <p className="text-xs text-amber-800 mt-1">
                  {t("billingPromptsUnavailableDesc")}
                  {paymentConfig.webhookMode
                    ? ` (${t("billingWebhookMode")}: ${paymentConfig.webhookMode})`
                    : null}
                </p>
              </div>
            ) : null}
          <div
            className={cn(
              "grid gap-4 w-full",
              !isPaidActive && (canPay || !paymentReady) ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1",
            )}
          >
            <div className="space-y-4">
              {/* Summary */}
              <div className="lg:bg-white lg:rounded-lg p-4 sm:p-5 space-y-1">
                <h1 className="text-lg font-semibold text-foreground">{t("billingSummary")}</h1>
                <p className="text-sm text-muted-foreground pb-4">{t("billingSummarySubtitle")}</p>

                <div className="divide-y divide-border/60">
                  <SummaryRow label={`${t("billingPackage")}:`} value={packageName} />
                  <SummaryRow
                    label={`${t("price")}:`}
                    value={`${amount.toLocaleString()} ${currencyLabel}`}
                  />
                </div>

                <div className="flex items-center justify-between gap-4 pt-4 mt-2 border-t border-border">
                  <span className="text-sm font-semibold text-foreground">{t("total")}:</span>
                  <span className="text-lg font-bold text-foreground tabular-nums">
                    {amount.toLocaleString()} {currencyLabel}
                  </span>
                </div>

                {isCancelled ? (
                  <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-1">
                    <p className="text-sm font-semibold text-foreground">{t("billingCancelledTitle")}</p>
                    {plan?.hasPlus && plan.nextDueDate ? (
                      <p className="text-xs text-muted-foreground">
                        {t("billingCancelledUntil")} {formatBillingDate(plan.nextDueDate, language)}.
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        {t("billingNotBilledMonthly")}
                      </p>
                    )}
                  </div>
                ) : canCancelPlan ? (
                  <div className="mt-4 pt-2">
                    <Button
                      type="button"
                      className={cn(
                        "w-full border border-destructive bg-background text-destructive",
                        "hover:bg-destructive hover:text-white hover:border-destructive",
                      )}
                      onClick={() => setCancelDialogOpen(true)}
                      disabled={paying || polling || cancelling}
                    >
                      {t("billingCancelPlan")}
                    </Button>
                  </div>
                ) : null}
              </div>

              {isPaidActive ? (
                <div className="rounded-2xl border border-green-200 bg-green-50 overflow-hidden lg:bg-white lg:rounded-lg">
                  <div className="p-4 sm:p-5">
                    <div className="flex items-start gap-4">
                      <div className="shrink-0">
                        <img
                          src="/paid.png"
                          alt=""
                          aria-hidden
                          className="h-14 w-14 sm:h-16 sm:w-16 object-contain"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-green-900">
                          {t("billingPaymentSuccess")}
                        </p>

                        <div className="mt-2 space-y-1">
                          <p className="text-xs text-green-800">
                            {t("billingPlusActiveUntil")} {formatBillingDate(plan.nextDueDate, language)}.
                          </p>
                          {plan.lastPaidAt ? (
                            <p className="text-xs text-green-800">
                              {t("billingLastPaid")}: {formatBillingDate(plan.lastPaidAt, language)}
                            </p>
                          ) : null}
                          {phone.trim() ? (
                            <p className="text-xs text-green-800">
                              {t("billingPhone")}: {phone.trim()}
                            </p>
                          ) : null}
                          <p className="text-xs text-green-800">
                            {t("billingPackage")}: {packageName}
                          </p>
                          <p className="text-xs text-green-800">
                            {t("price")}: {amount.toLocaleString()} {currencyLabel}
                          </p>
                        </div>
                      </div>
                    </div>

                    {daysRemaining != null ? (
                      <div className="mt-4 rounded-xl border border-green-200/70 bg-white/60 p-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-green-900/80">{t("daysRemaining")}</span>
                          <span className="font-semibold tabular-nums text-green-900">
                            {daysRemaining.toLocaleString()} day{daysRemaining === 1 ? "" : "s"}
                          </span>
                        </div>
                        <div className="mt-2 h-2 rounded-full bg-green-100 overflow-hidden">
                          <div
                            className="h-full bg-green-500"
                            style={{ width: `${usedPct ?? 0}%` }}
                          />
                        </div>
                        <div className="mt-1 text-[10px] text-green-900/70 tabular-nums text-right">
                          {formatBillingDate(periodStart, language)} → {formatBillingDate(periodEnd, language)}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>

            {!isPaidActive ? (
            <div className="lg:bg-white lg:rounded-lg p-4 sm:p-5 space-y-5 relative min-h-[280px]">
              {(paying || polling) && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-background/80 backdrop-blur-[2px] px-4">
                  <Loader2 className="h-8 w-8 animate-spin text-yellow-600" />
                  <p className="text-sm font-medium text-foreground text-center">{t("billingProcessing")}</p>
                  <p className="text-xs text-muted-foreground text-center">
                    {t("billingCheckPhoneApprove")}
                  </p>
                  {polling ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-1"
                      onClick={() => void handlePay({ forceRetry: true })}
                    >
                      {t("billingSendNewPrompt")}
                    </Button>
                  ) : null}
                </div>
              )}

              {canPay && paymentReady ? (
                <>
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">{t("billingSelectNetwork")}</h2>
                    <p className="text-sm text-muted-foreground mt-1">{t("billingSelectNetworkDesc")}</p>
                  </div>

                  <RadioGroup
                    value={network ?? ""}
                    onValueChange={(v) => setNetwork(v as MobileNetwork)}
                    className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 w-full"
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
                    <Label htmlFor="billing-phone" className="text-sm text-muted-foreground">
                      {t("billingPhone")}
                    </Label>
                    <Input
                      id="billing-phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder={network === "airtel" ? "0721234567" : "0781234567"}
                      className="h-11 text-sm w-full border-border"
                      disabled={paying || polling}
                    />
                  </div>

                  {network ? (
                    <div className="space-y-2 text-xs text-muted-foreground leading-relaxed">
                      <p>{t("billingPinHint")}</p>
                      <p>
                        {t("billingHaveMoMoBalance")
                          .replace("{amount}", Math.ceil(amount * 1.023).toLocaleString())
                          .replace("{base}", amount.toLocaleString())}
                      </p>
                      <p>
                        <TextWithUssdCodes text={getBillingNoPromptHint(language, network, contact)} />
                      </p>
                    </div>
                  ) : null}

                  <Button
                    onClick={() => void handlePay(polling ? { forceRetry: true } : undefined)}
                    disabled={paying || !network}
                    className={cn(
                      "w-full h-11 font-semibold",
                      "bg-yellow-500 hover:bg-yellow-600 text-gray-900",
                    )}
                  >
                    {t("billingPayAmount").replace("{amount}", amount.toLocaleString())}
                  </Button>

                  <PlatformContactCard
                    contact={contact}
                    compact
                    title={t("callSupport")}
                    className="lg:bg-gray-50"
                  />
                </>
              ) : !paymentReady ? (
                <div className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    {t("billingPaymentsUnavailable")}
                  </p>
                  {statusError || configError ? (
                    <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2">
                      {statusError || configError} {t("billingBackendError")}
                    </p>
                  ) : (
                    <p className="text-xs">
                      {t("billingPaypackHint")}
                    </p>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => void refresh()}
                  >
                    {t("billingRetry")}
                  </Button>
                </div>
              ) : null}
            </div>
            ) : null}
          </div>
          </div>
        )}
      </div>

      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("billingCancelTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {isPaidActive || (plan?.lastPaidAt && !plan?.isOnTrial)
                ? t("billingCancelPaidDesc")
                : t("billingCancelTrialDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelling}>
              {t("billingKeepPlan")}
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 text-white hover:bg-red-600 border border-red-500"
              disabled={cancelling}
              onClick={(e) => {
                e.preventDefault();
                void handleCancelPlan();
              }}
            >
              {cancelling ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
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
