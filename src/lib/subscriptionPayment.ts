import { formatPhoneDisplay, type PlatformContact } from "@/lib/platformContact";

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

function momoDial(network?: "mtn" | "airtel" | null) {
  return network === "airtel" ? "*185*7*1#" : "*182*7*1#";
}

function supportLine(contact: PlatformContact | null | undefined): string {
  const phone = formatPhoneDisplay(contact?.supportPhone || "");
  if (!phone) return "";
  return ` If you still need help, call us at ${phone}.`;
}

function noPromptLine(network: "mtn" | "airtel" | null | undefined): string {
  const dial = momoDial(network);
  return ` If you do not see the payment prompt on your phone, dial ${dial} to check pending approvals.`;
}

export function getBillingNoPromptHint(
  network?: "mtn" | "airtel" | null,
  contact?: PlatformContact | null,
): string {
  const phone = formatPhoneDisplay(contact?.supportPhone || "");
  const dial = momoDial(network);
  return phone
    ? `If you do not see the payment prompt, dial ${dial} or call us at ${phone}.`
    : `If you do not see the payment prompt, dial ${dial}.`;
}

export function getPaymentUserMessage(
  issue: PaymentSyncIssue | null | undefined,
  contact?: PlatformContact | null,
  options?: { network?: "mtn" | "airtel" | null; requiredTotal?: number; amount?: number },
): string | null {
  if (!issue?.code) return issue?.message || null;

  const network = options?.network ?? null;
  const dial = momoDial(network);
  const phoneSuffix = supportLine(contact);
  const promptSuffix = noPromptLine(network);
  const total = options?.requiredTotal;
  const amount = options?.amount;

  const messages: Record<string, string> = {
    REF_OWNED_BY_OTHER_USER:
      "This payment is linked to another Trippo account. Open Billing while logged into your own account and pay from there.",
    NETWORK_MISMATCH:
      "The phone number does not match the network you selected. Choose MTN for 078/079 numbers or Airtel for 072/073.",
    INSUFFICIENT_BALANCE:
      total && amount
        ? `Your mobile money wallet does not have enough money. You need about ${total.toLocaleString()} Rwf (${amount.toLocaleString()} Rwf plus fees). Top up your wallet and try again.${promptSuffix}`
        : `Your mobile money wallet does not have enough money for this payment. Top up your wallet and try again.${promptSuffix}`,
    CASHIN_FAILED: `We could not send the payment prompt to your phone.${promptSuffix} Wait a few minutes, then try again once.${phoneSuffix}`,
    PAYPACK_NOT_CONFIGURED:
      "Payments are temporarily unavailable on our side. Please try again later or contact support.",
    PAYPACK_DECLINED: `Mobile money declined this payment.${promptSuffix} Cancel any old pending approvals, wait 5–10 minutes, then try once.${phoneSuffix}`,
    PENDING_MOMO_REQUESTS: `There are too many pending payment requests on this phone. Dial ${dial}, cancel all pending approvals, wait 5–10 minutes, then pay once.${phoneSuffix}`,
    PAYMENT_EXPIRED:
      "The previous payment prompt expired before you approved it. You can start a new payment now.",
    PAYMENT_ABANDONED:
      "The previous payment attempt was cancelled. You can send a new payment prompt now.",
    MOMO_IMMEDIATE_REJECT: `The payment was rejected immediately — usually because of low balance or old pending prompts.${promptSuffix}${phoneSuffix}`,
    NO_PAYMENT_PROMPT: `We sent the payment request, but your phone may not show the prompt.${promptSuffix}${phoneSuffix}`,
  };

  const entry = messages[issue.code];
  if (entry) return entry;

  const raw = String(issue.message || "").toLowerCase();
  if (raw.includes("insufficient") || raw.includes("not enough") || raw.includes("balance")) {
    return getPaymentUserMessage({ code: "INSUFFICIENT_BALANCE" }, contact, options);
  }

  if (issue.message) return `${issue.message}${phoneSuffix}`;
  return null;
}
