const PENDING_REF_KEY = "trippo-pending-payment-ref";

export function savePendingPaymentRef(referenceId: string) {
  try {
    sessionStorage.setItem(PENDING_REF_KEY, referenceId);
  } catch {
    // ignore storage errors
  }
}

export function clearPendingPaymentRef() {
  try {
    sessionStorage.removeItem(PENDING_REF_KEY);
  } catch {
    // ignore
  }
}

export function getPendingPaymentRef(): string | null {
  try {
    return sessionStorage.getItem(PENDING_REF_KEY);
  } catch {
    return null;
  }
}

export type PaymentSyncIssue = {
  code: string;
  message?: string;
  at?: string;
};

export type SubscriptionPlanSnapshot = {
  hasPlus?: boolean;
  lastPaidAt?: string | null;
  isOnTrial?: boolean;
};

export type PaymentStatusPayload = {
  payment: {
    status: string;
    createdAt?: string;
    paidAt?: string | null;
    providerStatus?: string;
    mtnStatus?: string;
    sync?: {
      latestIssue?: PaymentSyncIssue | null;
      issues?: PaymentSyncIssue[];
    };
  };
  plan?: SubscriptionPlanSnapshot;
};

/** True when the user has paid — not the same as trial access (hasPlus during trial). */
export function hasPaidSubscription(plan?: SubscriptionPlanSnapshot | null): boolean {
  return Boolean(plan?.lastPaidAt && !plan?.isOnTrial);
}

/** True only when Paypack confirmed this specific payment record — never infer from trial/plan. */
export function isPaymentSettled(payload: PaymentStatusPayload): boolean {
  return payload.payment.status === "SUCCESSFUL";
}

export function getPaymentUserMessage(
  issue: PaymentSyncIssue | null | undefined,
  isRw: boolean,
): string | null {
  if (!issue?.code) return null;
  const messages: Record<string, { en: string; rw: string }> = {
    REF_OWNED_BY_OTHER_USER: {
      en: "This payment is linked to another Trippo account. Pay from your own billing page while logged in.",
      rw: "Iyi transaction ihuza n'undi konti ya Trippo. Wishyura uri kwinjiye kuri konti yawe.",
    },
    NETWORK_MISMATCH: {
      en: "Phone number does not match the selected network.",
      rw: "Nomero ntihura n'uburyo wahisemo.",
    },
    CASHIN_FAILED: {
      en: "Could not send the MoMo prompt. Check the number and try again.",
      rw: "Ntibyashoboye kohereza ubutumwa bwo kwishyura. Ongera ugerageze.",
    },
    PAYPACK_NOT_CONFIGURED: {
      en: "Payments are temporarily unavailable. Please try again later.",
      rw: "Kwishyura ntibishoboka ubu. Ongera ugerageze nyuma.",
    },
    PAYPACK_DECLINED: {
      en: "Mobile money declined the request. Dial *182*7*1# (MTN) or *185*7*1# (Airtel), cancel pending approvals, wait 5–10 minutes, then try once.",
      rw: "Mobile money yanze kwishyura. Kanda *182*7*1# (MTN) cyangwa *185*7*1# (Airtel), siba ibyo wemereje, tegereza iminota 5–10, hanyuma ugerageze rimwe.",
    },
    PENDING_MOMO_REQUESTS: {
      en: "Too many pending MoMo requests on this phone. Dial *182*7*1# (MTN), cancel all pending approvals, wait 5–10 minutes, then pay once.",
      rw: "Hari ubutumwa bwinshi bwo kwishyura butegereje kuri iyi telefone. Kanda *182*7*1#, siba byose bitegereje, tegereza iminota 5–10, hanyuma wishyure rimwe.",
    },
    PAYMENT_EXPIRED: {
      en: "The previous payment prompt expired. You can pay again now.",
      rw: "Ubutumwa bwo kwishyura bwa kera bwarangiye. Ushobora kongera kwishyura ubu.",
    },
    MOMO_IMMEDIATE_REJECT: {
      en: "MTN rejected the payment immediately — usually too many pending prompts or not enough balance (10,000 RWF needs about 10,230 RWF including fees). Clear pending via *182*7*1#, wait, then try once.",
      rw: "MTN yanze ako kanya — akenshi ni ubutumwa bwinshi butegereje cyangwa amafaranga ahagije (10,000 RWF bisaba hafi 10,230 RWF). Kanda *182*7*1#, siba bitegereje, tegereza, ugerageze rimwe.",
    },
  };
  const entry = messages[issue.code];
  if (entry) return isRw ? entry.rw : entry.en;
  if (issue.message) return issue.message;
  return null;
}
