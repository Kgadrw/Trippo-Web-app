import {
  createContext,
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

function useSubscriptionAccessState(): SubscriptionAccessValue {
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<SubscriptionPlan | null>(null);
  const [paymentConfig, setPaymentConfig] = useState<SubscriptionPaymentConfig | null>(null);
  const [pendingPayment, setPendingPayment] = useState<PendingSubscriptionPayment | null>(null);

  const load = useCallback(async (sync = false): Promise<SubscriptionPlan | null> => {
    try {
      const res = await subscriptionApi.getStatus(sync);
      const data = res.data as {
        plan: SubscriptionPlan;
        payment?: SubscriptionPaymentConfig;
        mtn?: SubscriptionPaymentConfig;
        pendingPayment?: PendingSubscriptionPayment | null;
      };
      setPlan(data.plan);
      setPaymentConfig(data.payment || data.mtn || null);
      setPendingPayment(data.pendingPayment || null);
      return data.plan;
    } catch {
      setPlan(null);
      setPaymentConfig(null);
      setPendingPayment(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const onUpdate = () => void load();
    window.addEventListener("subscription-updated", onUpdate);
    return () => window.removeEventListener("subscription-updated", onUpdate);
  }, [load]);

  const hasAccess = plan?.hasPlus === true;
  const isOnTrial = plan?.isOnTrial === true;
  const requiresPayment = plan?.requiresPayment === true;
  const isLocked = !loading && !hasAccess && requiresPayment;

  return {
    loading,
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
  return (
    <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>
  );
}

export function useSubscriptionAccess(): SubscriptionAccessValue {
  const context = useContext(SubscriptionContext);
  if (context) return context;
  return useSubscriptionAccessState();
}
