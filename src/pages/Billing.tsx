import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
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
import { CheckCircle2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";
import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";
import { subscriptionApi, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { DEFAULT_SUBSCRIPTION_AMOUNT } from "@/lib/subscription";
import {
  clearPendingPaymentRef,
  getPaymentUserMessage,
  hasPaidSubscription,
  isPaymentSettled,
  savePendingPaymentRef,
  type PaymentStatusPayload,
} from "@/lib/subscriptionPayment";

type MobileNetwork = "mtn" | "airtel";

function formatBillingDate(value: string | Date | null | undefined, isRw: boolean) {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(isRw ? "rw-RW" : "en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
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
}: {
  id: string;
  value: MobileNetwork;
  label: string;
  logoSrc: string;
  logoAlt: string;
}) {
  return (
    <label
      htmlFor={id}
      className="flex items-center gap-3 sm:gap-4 cursor-pointer rounded-xl p-4 sm:p-5 w-full"
    >
      <RadioGroupItem
        value={value}
        id={id}
        className="h-6 w-6 shrink-0 rounded-full border-2 border-gray-400 text-foreground data-[state=checked]:border-foreground [&_svg]:h-3 [&_svg]:w-3"
      />
      <img src={logoSrc} alt={logoAlt} className="h-14 w-14 sm:h-16 sm:w-16 object-contain shrink-0" />
      <span className="text-sm font-semibold text-muted-foreground">{label}</span>
    </label>
  );
}

export default function Billing() {
  const { toast } = useToast();
  const { language } = useTranslation();
  const isRw = language === "rw";

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

  const txt = useMemo(
    () => ({
      title: isRw ? "Incamake" : "Summary",
      subtitle: isRw ? "Kurikiza amabwiriza yose yuko bishyura" : "Follow all payment instructions",
      package: isRw ? "Ifatabuguzi" : "Package",
      price: isRw ? "Ayo Rigura" : "Price",
      starts: isRw ? "Rizatangira" : "Starts",
      ends: isRw ? "Rizarangira" : "Ends",
      total: isRw ? "Totali" : "Total",
      pay: isRw ? "Kwishyura" : "Pay",
      tapMethod: isRw ? "Kanda kuburyo uri bukoreshe wishyura" : "Tap your payment method to pay",
      phone: isRw ? "Nomero ya telefone" : "Phone number",
      pinHint: isRw
        ? "Shyiramo PIN wemeze muri telefone yanyu"
        : "Enter your PIN to confirm on your phone",
      noPromptMtn: isRw
        ? "Ntimutabonye ubutumwa kanda: *182*7*1#"
        : "If you don't receive a prompt, dial: *182*7*1#",
      noPromptAirtel: isRw
        ? "Ntimutabonye ubutumwa kanda: *185*7*1#"
        : "If you don't receive a prompt, dial: *185*7*1#",
      processing: isRw ? "Tegereza wishyura..." : "Processing payment...",
      loading: isRw ? "Gukura..." : "Loading...",
      trialEndedBanner: isRw
        ? "Igerageza ryawe ryarangiye. Wishyura kugira ngo ukomeze ukoreshe Trippo."
        : "Your trial has ended. Pay below to unlock Trippo again.",
      payAmount: (n: number) =>
        isRw ? `Kwishyura ${n.toLocaleString()} RWF` : `Pay ${n.toLocaleString()} RWF`,
      cancelPlan: isRw ? "Hagarika gahunda" : "Cancel plan",
      cancelTitle: isRw ? "Hagarika Trippo Plus?" : "Cancel Trippo Plus?",
      cancelTrialDesc: isRw
        ? "Igerageza rirangira ako kanya kandi ntuzongera gukenera kwishyura ubu."
        : "Your trial will end immediately and you will lose Plus access.",
      cancelPaidDesc: isRw
        ? "Ntuzongera kwishyurwa. Uzakomeza ukoreshe Plus kugeza itariki yanyuma yishyuwe."
        : "You will not be charged again. Plus stays active until your current paid period ends.",
      cancelConfirm: isRw ? "Hagarika gahunda" : "Cancel plan",
      cancelledTitle: isRw ? "Gahunda yahagaritswe" : "Plan cancelled",
      cancelledUntil: isRw ? "Plus irakomeza kugeza" : "Plus remains active until",
    }),
    [isRw],
  );

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

  const packageName = plan?.planName ? `${plan.planName} Pack` : "Plus Pack";
  const amount = plan?.amount ?? DEFAULT_SUBSCRIPTION_AMOUNT;
  const currency = plan?.currency || "RWF";

  const isPaidActive = hasPaidSubscription(plan);
  const isTrialEnded = Boolean(plan?.requiresPayment && !plan?.hasPlus);
  const isCancelled = Boolean(plan?.isCancelled);
  const canCancelPlan = Boolean(
    !isCancelled && (plan?.hasPlus || plan?.isOnTrial || isPaidActive),
  );
  const paymentReady = Boolean(paymentConfig?.mock || paymentConfig?.configured);
  const canPay =
    paymentReady &&
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
      title: isRw ? "Wishyura byagenze neza" : "Payment successful",
      description: isRw ? "Trippo Plus irakora." : "Trippo Plus is active for another month.",
    });
    window.dispatchEvent(new Event("subscription-updated"));
  }, [isRw, stopProcessing, toast]);

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
          const issueMessage = getPaymentUserMessage(syncIssue, isRw);

          if (isPaymentSettled(payload)) {
            await refresh(true);
            showPaymentSuccess();
            return;
          }

          if (syncIssue?.code === "REF_OWNED_BY_OTHER_USER") {
            clearPendingPaymentRef();
            toast({
              title: isRw ? "Ikosa ryo kwishyura" : "Payment issue",
              description: issueMessage || syncIssue.message,
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
              (isRw
                ? "MTN/Airtel yanze kwishyura. Reba niba MoMo ikora, ufite amafaranga, cyangwa kanda *182*7*1# (MTN)."
                : "MoMo declined the request. Ensure the wallet is active, you have enough balance, or dial *182*7*1# (MTN) / *185*7*1# (Airtel).");
            toast({
              title: isRw ? "Wishyura byanze" : "Payment failed",
              description: reason,
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
        title: isRw ? "Iracyategereje" : "Still confirming",
        description: isRw
          ? "Niba wishyura byagenze neza, subiza urupapuro — tuzabimenya."
          : "If money was deducted, refresh this page — we will sync your payment.",
      });
    },
    [isRw, refresh, showPaymentSuccess, stopProcessing, toast, updatePlan],
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
        title: txt.cancelledTitle,
        description:
          updatedPlan?.hasPlus && updatedPlan.nextDueDate
            ? `${txt.cancelledUntil} ${formatBillingDate(updatedPlan.nextDueDate, isRw)}.`
            : isRw
              ? "Ntuzongera kubona ibiranga Plus."
              : "You no longer have Plus access.",
      });
      window.dispatchEvent(new Event("subscription-updated"));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Could not cancel plan.";
      toast({ title: isRw ? "Ikosa" : "Error", description: message, variant: "destructive" });
    } finally {
      setCancelling(false);
    }
  };

  const handlePay = async (options?: { forceRetry?: boolean }) => {
    if (!network) {
      toast({
        title: isRw ? "Hitamo uburyo" : "Select network",
        description: isRw ? "Hitamo MTN cyangwa Airtel." : "Choose MTN or Airtel.",
        variant: "destructive",
      });
      return;
    }

    if (!phone.trim()) {
      toast({
        title: isRw ? "Nomero irakenewe" : "Phone required",
        description: isRw ? "Andika nomero ya telefone." : "Enter your mobile money number.",
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
        title: isRw ? "Nomero siyo" : "Invalid number",
        description: isRw ? "Koresha nomero ya MTN (078 cyangwa 079)." : "Use an MTN number (078 or 079).",
        variant: "destructive",
      });
      return;
    }
    if (network === "airtel" && !isAirtel) {
      toast({
        title: isRw ? "Nomero siyo" : "Invalid number",
        description: isRw ? "Koresha nomero ya Airtel (072 cyangwa 073)." : "Use an Airtel number (072 or 073).",
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
          title: isRw ? "Wishyura iracyakora" : "Payment in progress",
          description: isRw
            ? "Reba telefone yawe kugira ngo wemeze. Niba utabonye ubutumwa, kanda Payongera uhereze undi mucyo."
            : "Check your phone to approve. If no prompt appeared, tap Pay again to send a new one.",
        });
      } else {
        toast({
          title: isRw ? "Emeza kuri telefone" : "Approve on your phone",
          description: isRw
            ? "Reba ubutumwa kuri telefone yawe. Niba utabonye, kanda *182*7*1# (MTN) cyangwa *185*7*1# (Airtel)."
            : "Check your phone for the MoMo prompt. If nothing appears within 30 seconds, dial *182*7*1# (MTN) or *185*7*1# (Airtel).",
        });
      }
      void pollPayment(data.referenceId);
    } catch (error: unknown) {
      stopProcessing();
      clearPendingPaymentRef();
      let message = error instanceof Error ? error.message : "Could not start payment.";
      if (error instanceof ApiError) {
        const code = typeof error.response?.code === "string" ? error.response.code : undefined;
        const mapped = getPaymentUserMessage({ code: code || "", message }, isRw);
        if (mapped) message = mapped;
      }
      await refresh(true);
      toast({ title: isRw ? "Ikosa" : "Payment error", description: message, variant: "destructive" });
    } finally {
      setPaying(false);
    }
  };

  return (
    <AppLayout title={isRw ? "Kwishyura" : "Billing"}>
      <div className="flex flex-col min-h-0 w-full space-y-4 pb-4">
        {loading ? (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-20 lg:bg-white lg:rounded-lg">
            <Loader2 className="h-4 w-4 animate-spin" />
            {txt.loading}
          </div>
        ) : (
          <div className="space-y-4 w-full">
            {isTrialEnded ? (
              <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <p className="font-semibold">{isRw ? "Kwishyura bisabwa" : "Payment required"}</p>
                <p className="text-xs text-amber-800 mt-1">{txt.trialEndedBanner}</p>
              </div>
            ) : null}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 w-full">
            {/* Summary */}
            <div className="lg:bg-white lg:rounded-lg p-4 sm:p-5 space-y-1">
              <h1 className="text-lg font-semibold text-foreground">{txt.title}</h1>
              <p className="text-sm text-muted-foreground pb-4">{txt.subtitle}</p>

              <div className="divide-y divide-border/60">
                <SummaryRow label={`${txt.package}:`} value={packageName} />
                <SummaryRow
                  label={`${txt.price}:`}
                  value={`${amount.toLocaleString()} ${currency}`}
                />
                <SummaryRow label={`${txt.starts}:`} value={formatBillingDate(periodStart, isRw)} />
                <SummaryRow label={`${txt.ends}:`} value={formatBillingDate(periodEnd, isRw)} />
              </div>

              <div className="flex items-center justify-between gap-4 pt-4 mt-2 border-t border-border">
                <span className="text-sm font-semibold text-foreground">{txt.total}:</span>
                <span className="text-lg font-bold text-foreground tabular-nums">
                  {amount.toLocaleString()} {currency}
                </span>
              </div>

              {isCancelled ? (
                <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-1">
                  <p className="text-sm font-semibold text-foreground">{txt.cancelledTitle}</p>
                  {plan?.hasPlus && plan.nextDueDate ? (
                    <p className="text-xs text-muted-foreground">
                      {txt.cancelledUntil} {formatBillingDate(plan.nextDueDate, isRw)}.
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      {isRw ? "Ntuzongera kwishyurwa buri kwezi." : "You will not be billed monthly."}
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
                    {txt.cancelPlan}
                  </Button>
                </div>
              ) : null}
            </div>

            {/* Checkout */}
            <div className="lg:bg-white lg:rounded-lg p-4 sm:p-5 space-y-5 relative min-h-[280px]">
              {(paying || polling) && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-background/80 backdrop-blur-[2px] px-4">
                  <Loader2 className="h-8 w-8 animate-spin text-yellow-600" />
                  <p className="text-sm font-medium text-foreground text-center">{txt.processing}</p>
                  <p className="text-xs text-muted-foreground text-center">
                    {isRw
                      ? "Reba telefone yawe kugira ngo wemeze wishyura."
                      : "Check your phone and approve the MoMo prompt."}
                  </p>
                  {polling ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-1"
                      onClick={() => void handlePay({ forceRetry: true })}
                    >
                      {isRw ? "Ohereza undi mucyo" : "Send new prompt"}
                    </Button>
                  ) : null}
                </div>
              )}

              <div>
                <h2 className="text-lg font-semibold text-foreground">{txt.pay}</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {isPaidActive
                    ? isRw
                      ? "Wishyura wawe urakora"
                      : "Your subscription is active"
                    : txt.tapMethod}
                </p>
              </div>

              {isPaidActive ? (
                <div className="rounded-xl border border-green-200 bg-green-50 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-green-900">
                    <CheckCircle2 className="h-5 w-5 shrink-0" />
                    <p className="text-sm font-semibold">
                      {isRw ? "Wishyura byagenze neza" : "Payment successful"}
                    </p>
                  </div>
                  <p className="text-xs text-green-800">
                    {isRw ? "Trippo Plus irakora kugeza" : "Trippo Plus is active until"}{" "}
                    {formatBillingDate(plan.nextDueDate, isRw)}.
                  </p>
                  {plan.lastPaidAt ? (
                    <p className="text-xs text-green-800">
                      {isRw ? "Byishyuwe" : "Last paid"}: {formatBillingDate(plan.lastPaidAt, isRw)}
                    </p>
                  ) : null}
                </div>
              ) : canPay && paymentReady ? (
                <>
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
                    />
                    <NetworkOption
                      id="pay-airtel"
                      value="airtel"
                      label="Airtel Money"
                      logoSrc="/airtel.png"
                      logoAlt="Airtel Money"
                    />
                  </RadioGroup>

                  <div className="space-y-1.5">
                    <Label htmlFor="billing-phone" className="text-sm text-muted-foreground">
                      {txt.phone}
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

                  {network && (
                    <div className="space-y-1 text-xs text-muted-foreground leading-relaxed">
                      <p>{txt.pinHint}</p>
                      <p>
                        {isRw
                          ? `Ukeneye nibura ${Math.ceil(amount * 1.023).toLocaleString()} RWF kuri MoMo (${amount.toLocaleString()} + amafaranga ya serivisi).`
                          : `Have at least ${Math.ceil(amount * 1.023).toLocaleString()} RWF on MoMo (${amount.toLocaleString()} + fees).`}
                      </p>
                      <p>{network === "mtn" ? txt.noPromptMtn : txt.noPromptAirtel}</p>
                      <p>
                        {isRw
                          ? "Niba wishyura byanze, kanda *182*7*1# usibe ibyo wemereje, tegereza iminota 5–10, hanyuma ugerageze rimwe."
                          : "If payment fails, dial *182*7*1#, cancel pending approvals, wait 5–10 min, then try once only."}
                      </p>
                    </div>
                  )}

                  <Button
                    onClick={() => void handlePay(polling ? { forceRetry: true } : undefined)}
                    disabled={paying || !network}
                    className={cn(
                      "w-full h-11 font-semibold",
                      "bg-yellow-500 hover:bg-yellow-600 text-gray-900",
                    )}
                  >
                    {txt.payAmount(amount)}
                  </Button>
                </>
              ) : !paymentReady ? (
                <div className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    {isRw ? "Kwishyura ntibishoboka ubu." : "Payments are not available right now."}
                  </p>
                  {statusError || configError ? (
                    <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2">
                      {isRw
                        ? "Ntitwashoboye kuvugana na seriveri. Reba ko backend ikora kuri port 3000, hanyuma ongera ugerageze."
                        : `${statusError || configError} Make sure the backend is running on port 3000.`}
                    </p>
                  ) : (
                    <p className="text-xs">
                      {isRw
                        ? "Reba niba Paypack yashyizweho muri backend .env (PAYPACK_CLIENT_ID na PAYPACK_CLIENT_SECRET)."
                        : "Check that Paypack is configured in backend .env (PAYPACK_CLIENT_ID and PAYPACK_CLIENT_SECRET)."}
                    </p>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => void refresh()}
                  >
                    {isRw ? "Ongera ugerageze" : "Retry"}
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
          </div>
        )}
      </div>

      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{txt.cancelTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {isPaidActive || (plan?.lastPaidAt && !plan?.isOnTrial)
                ? txt.cancelPaidDesc
                : txt.cancelTrialDesc}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelling}>
              {isRw ? "Subiza inyuma" : "Keep plan"}
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={cancelling}
              onClick={(e) => {
                e.preventDefault();
                void handleCancelPlan();
              }}
            >
              {cancelling ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {isRw ? "Birategereje..." : "Cancelling..."}
                </>
              ) : (
                txt.cancelConfirm
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
