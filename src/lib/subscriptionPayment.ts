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

export type PaymentStatusPayload = {
  payment: {
    status: string;
    providerStatus?: string;
    mtnStatus?: string;
    sync?: {
      latestIssue?: PaymentSyncIssue | null;
      issues?: PaymentSyncIssue[];
    };
  };
  plan?: { hasPlus?: boolean; lastPaidAt?: string | null };
};

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
  };
  const entry = messages[issue.code];
  if (entry) return isRw ? entry.rw : entry.en;
  if (issue.message) return issue.message;
  return null;
}
