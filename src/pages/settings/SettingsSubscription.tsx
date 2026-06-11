import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Loader2, Smartphone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { subscriptionApi } from "@/lib/api";
import { SettingsSubpageHeader } from "@/components/settings/SettingsSubpageHeader";
import { cn, formatDateWithTime } from "@/lib/utils";

type PaymentPlan = {
  active: boolean;
  amount: number;
  currency: string;
  intervalMonths: number;
  nextDueDate?: string | null;
  lastPaidAt?: string | null;
  status: string;
};

type MtnConfig = {
  configured: boolean;
  mock?: boolean;
  sandbox: boolean;
  currency: string;
  amount: number;
};

export default function SettingsSubscription() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [polling, setPolling] = useState(false);
  const [plan, setPlan] = useState<PaymentPlan | null>(null);
  const [mtn, setMtn] = useState<MtnConfig | null>(null);
  const [phone, setPhone] = useState("");
  const [activeReferenceId, setActiveReferenceId] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await subscriptionApi.getStatus();
      const data = res.data as {
        plan: PaymentPlan;
        mtn: MtnConfig;
      };
      setPlan(data.plan);
      setMtn(data.mtn);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to load subscription.";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadStatus();
    const storedPhone = localStorage.getItem("profit-pilot-user-phone");
    if (storedPhone) setPhone(storedPhone);
  }, [loadStatus]);

  const pollPayment = async (referenceId: string) => {
    setPolling(true);
    const maxAttempts = 24;
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, 5000));
      try {
        const res = await subscriptionApi.getPaymentStatus(referenceId);
        const payment = (res.data as { payment: { status: string } }).payment;
        if (payment.status === "SUCCESSFUL") {
          toast({
            title: "Payment successful",
            description: "Your subscription is active for another month.",
          });
          setActiveReferenceId(null);
          await loadStatus();
          setPolling(false);
          return;
        }
        if (payment.status === "FAILED") {
          toast({
            title: "Payment failed",
            description: "The MoMo payment was not completed. Try again.",
            variant: "destructive",
          });
          setActiveReferenceId(null);
          setPolling(false);
          return;
        }
      } catch {
        // keep polling
      }
    }
    setPolling(false);
    toast({
      title: "Still pending",
      description: mtn?.mock
        ? "Test payment is taking longer than expected. Refresh this page in a moment."
        : "Check your phone and approve the MoMo prompt, then refresh this page.",
    });
  };

  const handlePay = async () => {
    if (!phone.trim()) {
      toast({
        title: "Phone required",
        description: "Enter your MTN MoMo number.",
        variant: "destructive",
      });
      return;
    }

    setPaying(true);
    try {
      const res = await subscriptionApi.pay(phone.trim());
      const data = res.data as { referenceId: string };
      setActiveReferenceId(data.referenceId);
      toast({
        title: mtn?.mock ? "Test payment started" : "Approve on your phone",
        description: mtn?.mock
          ? "No real charge — this will complete automatically in a few seconds."
          : mtn?.sandbox
            ? "Sandbox: use the test number flow. Approve the USSD prompt if shown."
            : "Check your phone for the MTN MoMo payment request.",
      });
      void pollPayment(data.referenceId);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Could not start payment.";
      toast({ title: "Payment error", description: message, variant: "destructive" });
    } finally {
      setPaying(false);
    }
  };

  const statusColor =
    plan?.status === "active"
      ? "bg-green-100 text-green-800"
      : plan?.status === "past_due"
        ? "bg-red-100 text-red-800"
        : "bg-gray-100 text-gray-800";

  return (
    <div className="flex flex-1 flex-col overflow-y-auto p-5">
      <SettingsSubpageHeader
        icon={CreditCard}
        title="Subscription"
        description="Pay 10,000 RWF per month with MTN Mobile Money to keep Trippo active."
      />

      <Separator className="mb-4 bg-blue-200" />

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-8">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading subscription...
        </div>
      ) : (
        <div className="space-y-6">
          <div className="rounded-lg border border-gray-200 p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-gray-900">Monthly plan</p>
                <p className="text-2xl font-bold text-gray-900 tabular-nums mt-1">
                  {(plan?.amount ?? 10000).toLocaleString()}{" "}
                  <span className="text-sm font-medium text-gray-600">{plan?.currency || "RWF"}</span>
                </p>
              </div>
              <Badge className={cn("capitalize", statusColor)}>{plan?.status || "active"}</Badge>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-500 block">Next due</span>
                <span className="font-medium text-gray-900">
                  {plan?.nextDueDate ? formatDateWithTime(plan.nextDueDate) : "—"}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block">Last paid</span>
                <span className="font-medium text-gray-900">
                  {plan?.lastPaidAt ? formatDateWithTime(plan.lastPaidAt) : "—"}
                </span>
              </div>
            </div>
          </div>

          {!mtn?.configured ? (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
              MTN MoMo is not configured on the server yet. For local testing, set{" "}
              <code className="text-xs">SUBSCRIPTION_MOCK_PAYMENTS=true</code> in{" "}
              <code className="text-xs">backend/.env</code>. For real payments, add MTN keys and run{" "}
              <code className="text-xs">npm run mtn:setup</code>.
            </p>
          ) : (
            <div className="space-y-4">
              {mtn.mock && (
                <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <strong>Test mode:</strong> payments are simulated — no MTN credentials or real MoMo
                  charge. Set <code className="text-[11px]">SUBSCRIPTION_MOCK_PAYMENTS=false</code> when
                  you have valid API keys.
                </p>
              )}
              {mtn.sandbox && !mtn.mock && (
                <p className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg p-3">
                  Sandbox mode: payments are charged in RWF. Use MTN sandbox test MSISDN{" "}
                  <strong>46733123454</strong> to simulate a successful payment.
                </p>
              )}

              <div className="space-y-1.5">
                <Label className="text-xs font-medium flex items-center gap-1.5">
                  <Smartphone size={12} className="text-blue-600" />
                  MTN MoMo number
                </Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0781234567"
                  className="h-10 text-sm"
                  disabled={paying || polling}
                />
              </div>

              <Button
                onClick={() => void handlePay()}
                disabled={paying || polling}
                className="w-full bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-semibold gap-2 h-11"
              >
                {paying || polling ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    {polling ? "Waiting for approval..." : "Starting payment..."}
                  </>
                ) : (
                  <>
                    <CreditCard size={16} />
                    Pay {(plan?.amount ?? 10000).toLocaleString()} RWF with MoMo
                  </>
                )}
              </Button>

              {activeReferenceId && (
                <p className="text-xs text-center text-gray-500">
                  Payment ref: <span className="font-mono">{activeReferenceId.slice(0, 8)}…</span>
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
