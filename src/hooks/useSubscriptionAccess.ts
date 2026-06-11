import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { subscriptionApi } from "@/lib/api";

export type SubscriptionPlan = {
  planName: string;
  active?: boolean;
  isOnTrial?: boolean;
  trialDaysLeft?: number;
  trialEndsAt?: string;
  requiresPayment?: boolean;
  hasPlus?: boolean;
  status: string;
  amount: number;
  currency: string;
  intervalMonths?: number;
  startDate?: string | null;
  nextDueDate?: string | null;
  lastPaidAt?: string | null;
};

export type SubscriptionPaymentConfig = {
  configured: boolean;
  mock?: boolean;
  provider?: string;
  currency: string;
  amount: number;
};

export type PendingSubscriptionPayment = {
  referenceId: string;
  status: string;
  createdAt?: string;
  msisdn?: string;
};

type SubscriptionAccessValue = {
  loading: boolean;
  statusError: string | null;
  configError: string | null;
  plan: SubscriptionPlan | null;
  paymentConfig: SubscriptionPaymentConfig | null;
  pendingPayment: PendingSubscriptionPayment | null;
  hasAccess: boolean;
  isOnTrial: boolean;
  requiresPayment: boolean;
  isLocked: boolean;
  refresh: (sync?: boolean) => Promise<SubscriptionPlan | null>;
  updatePlan: (plan: SubscriptionPlan | null) => void;
};

const SubscriptionContext = createContext<SubscriptionAccessValue | null>(null);

function normalizePaymentConfig(
  payment?: SubscriptionPaymentConfig | null,
  mtn?: SubscriptionPaymentConfig | null,
): SubscriptionPaymentConfig | null {
  return payment || mtn || null;
}

function formatLoadError(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return fallback;
}

function useSubscriptionAccessState(): SubscriptionAccessValue {
  const [loading, setLoading] = useState(true);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const [plan, setPlan] = useState<SubscriptionPlan | null>(null);
  const [paymentConfig, setPaymentConfig] = useState<SubscriptionPaymentConfig | null>(null);
  const [pendingPayment, setPendingPayment] = useState<PendingSubscriptionPayment | null>(null);

  const loadPaymentConfig = useCallback(async (): Promise<SubscriptionPaymentConfig | null> => {
    setConfigError(null);
    let lastError: unknown = null;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      if (attempt > 0) {
        await new Promise((resolve) => setTimeout(resolve, 400 * attempt));
      }
      try {
        const res = await subscriptionApi.getPaymentConfig();
        const data = res.data as SubscriptionPaymentConfig;
        if (data) {
          setPaymentConfig(data);
          return data;
        }
      } catch (error) {
        lastError = error;
      }
    }

    const message = formatLoadError(
      lastError,
      "Could not reach the payment service. Check that the backend is running.",
    );
    setConfigError(message);
    return null;
  }, []);

  const load = useCallback(
    async (sync = false): Promise<SubscriptionPlan | null> => {
      setLoading(true);
      setStatusError(null);

      const [configResult, statusResult] = await Promise.allSettled([
        loadPaymentConfig(),
        (async () => {
          const res = await subscriptionApi.getStatus(sync);
          return res.data as {
            plan: SubscriptionPlan;
            payment?: SubscriptionPaymentConfig;
            mtn?: SubscriptionPaymentConfig;
            pendingPayment?: PendingSubscriptionPayment | null;
          };
        })(),
      ]);

      if (statusResult.status === "fulfilled") {
        const data = statusResult.value;
        setPlan(data.plan);
        const cfg = normalizePaymentConfig(data.payment, data.mtn);
        if (cfg) setPaymentConfig(cfg);
        setPendingPayment(data.pendingPayment || null);
        setLoading(false);
        return data.plan;
      }

      const message = formatLoadError(
        statusResult.reason,
        "Could not load subscription status.",
      );
      setStatusError(message);
      setPlan(null);
      setPendingPayment(null);
      setLoading(false);

      if (configResult.status === "fulfilled" && configResult.value) {
        return null;
      }

      return null;
    },
    [loadPaymentConfig],
  );

  useEffect(() => {
    void load();
    const onUpdate = () => {
      void load();
    };
    window.addEventListener("subscription-updated", onUpdate);
    return () => window.removeEventListener("subscription-updated", onUpdate);
  }, [load]);

  const hasAccess = plan?.hasPlus === true;
  const isOnTrial = plan?.isOnTrial === true;
  const requiresPayment = plan?.requiresPayment === true;
  const isLocked = !loading && !hasAccess && requiresPayment;

  return {
    loading,
    statusError,
    configError,
    plan,
    paymentConfig,
    pendingPayment,
    hasAccess,
    isOnTrial,
    requiresPayment,
    isLocked,
    refresh: load,
    updatePlan: setPlan,
  };
}

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const value = useSubscriptionAccessState();
  return createElement(SubscriptionContext.Provider, { value }, children);
}

export function useSubscriptionAccess(): SubscriptionAccessValue {
  const context = useContext(SubscriptionContext);
  if (context) return context;
  return useSubscriptionAccessState();
}
