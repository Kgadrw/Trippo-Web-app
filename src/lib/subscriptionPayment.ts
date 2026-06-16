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

type Lang = "en" | "rw" | "fr";

function momoDial(network?: "mtn" | "airtel" | null) {
  return network === "airtel" ? "*185*7*1#" : "*182*7*1#";
}

function supportLine(contact: PlatformContact | null | undefined, language: Lang): string {
  const phone = formatPhoneDisplay(contact?.supportPhone || "");
  if (!phone) return "";
  if (language === "rw") return ` Niba ikibazo gikomeje, hamagara ${phone}.`;
  if (language === "fr") return ` Si le problème persiste, appelez-nous au ${phone}.`;
  return ` If you still need help, call us at ${phone}.`;
}

function noPromptLine(network: "mtn" | "airtel" | null | undefined, language: Lang): string {
  const dial = momoDial(network);
  if (language === "rw") {
    return ` Niba utabonye ubutumwa bwo kwemeza kuri telefone, kanda ${dial} urebe ibyo bitegereje.`;
  }
  if (language === "fr") {
    return ` Si vous ne voyez pas la demande de paiement sur votre téléphone, composez ${dial} pour vérifier les approbations en attente.`;
  }
  return ` If you do not see the payment prompt on your phone, dial ${dial} to check pending approvals.`;
}

export function getBillingNoPromptHint(
  language: Lang,
  network?: "mtn" | "airtel" | null,
  contact?: PlatformContact | null,
): string {
  const phone = formatPhoneDisplay(contact?.supportPhone || "");
  const dial = momoDial(network);
  if (language === "rw") {
    return phone
      ? `Niba utabonye ubutumwa bwo kwishyura, kanda ${dial} urebe ibyo bitegereje, cyangwa hamagara ${phone}.`
      : `Niba utabonye ubutumwa bwo kwishyura, kanda ${dial} urebe ibyo bitegereje.`;
  }
  if (language === "fr") {
    return phone
      ? `Si vous ne voyez pas la demande de paiement, composez ${dial} ou appelez-nous au ${phone}.`
      : `Si vous ne voyez pas la demande de paiement, composez ${dial}.`;
  }
  return phone
    ? `If you do not see the payment prompt, dial ${dial} or call us at ${phone}.`
    : `If you do not see the payment prompt, dial ${dial}.`;
}

export function getPaymentUserMessage(
  issue: PaymentSyncIssue | null | undefined,
  language: Lang,
  contact?: PlatformContact | null,
  options?: { network?: "mtn" | "airtel" | null; requiredTotal?: number; amount?: number },
): string | null {
  if (!issue?.code) return issue?.message || null;

  const network = options?.network ?? null;
  const dial = momoDial(network);
  const phoneSuffix = supportLine(contact, language);
  const promptSuffix = noPromptLine(network, language);
  const total = options?.requiredTotal;
  const amount = options?.amount;

  const messages: Record<string, Record<Lang, string>> = {
    REF_OWNED_BY_OTHER_USER: {
      en: "This payment is linked to another Trippo account. Open Billing while logged into your own account and pay from there.",
      rw: "Iyi transaction ihuza n'undi konti ya Trippo. Jya kuri Billing uri kwinjiye kuri konti yawe wishyure.",
      fr: "Ce paiement est lié à un autre compte Trippo. Ouvrez Facturation connecté à votre propre compte.",
    },
    NETWORK_MISMATCH: {
      en: "The phone number does not match the network you selected. Choose MTN for 078/079 numbers or Airtel for 072/073.",
      rw: "Nomero ntihura n'uburyo wahisemo. Hitamo MTN kuri 078/079 cyangwa Airtel kuri 072/073.",
      fr: "Le numéro ne correspond pas au réseau choisi. Choisissez MTN pour 078/079 ou Airtel pour 072/073.",
    },
    INSUFFICIENT_BALANCE: {
      en:
        total && amount
          ? `Your mobile money wallet does not have enough money. You need about ${total.toLocaleString()} RWF (${amount.toLocaleString()} RWF plus fees). Top up your wallet and try again.${promptSuffix}`
          : `Your mobile money wallet does not have enough money for this payment. Top up your wallet and try again.${promptSuffix}`,
      rw:
        total && amount
          ? `Amafaranga kuri MoMo ntahagije. Ukeneye hafi ${total.toLocaleString()} RWF (${amount.toLocaleString()} RWF n'inyongera). Ongera amafaranga hanyuma ugerageze.${promptSuffix}`
          : `Amafaranga kuri MoMo ntahagije wishyura. Ongera amafaranga hanyuma ugerageze.${promptSuffix}`,
      fr:
        total && amount
          ? `Votre portefeuille mobile n'a pas assez d'argent. Il vous faut environ ${total.toLocaleString()} RWF (${amount.toLocaleString()} RWF + frais). Rechargez puis réessayez.${promptSuffix}`
          : `Votre portefeuille mobile n'a pas assez d'argent pour ce paiement. Rechargez puis réessayez.${promptSuffix}`,
    },
    CASHIN_FAILED: {
      en: `We could not send the payment prompt to your phone.${promptSuffix} Wait a few minutes, then try again once.${phoneSuffix}`,
      rw: `Ntibyashoboye kohereza ubutumwa bwo kwishyura kuri telefone yawe.${promptSuffix} Tegereza iminota nkeya, hanyuma ugerageze rimwe.${phoneSuffix}`,
      fr: `Nous n'avons pas pu envoyer la demande de paiement à votre téléphone.${promptSuffix} Attendez quelques minutes, puis réessayez une fois.${phoneSuffix}`,
    },
    PAYPACK_NOT_CONFIGURED: {
      en: "Payments are temporarily unavailable on our side. Please try again later or contact support.",
      rw: "Kwishyura ntibishoboka ubu ku ruhande rwacu. Ongera ugerageze nyuma cyangwa uhamagare abafasha.",
      fr: "Les paiements sont temporairement indisponibles. Réessayez plus tard ou contactez le support.",
    },
    PAYPACK_DECLINED: {
      en: `Mobile money declined this payment.${promptSuffix} Cancel any old pending approvals, wait 5–10 minutes, then try once.${phoneSuffix}`,
      rw: `Mobile money yanze kwishyura.${promptSuffix} Siba ibyo wemereje bya kera, tegereza iminota 5–10, hanyuma ugerageze rimwe.${phoneSuffix}`,
      fr: `Mobile money a refusé ce paiement.${promptSuffix} Annulez les anciennes approbations, attendez 5–10 minutes, puis réessayez une fois.${phoneSuffix}`,
    },
    PENDING_MOMO_REQUESTS: {
      en: `There are too many pending payment requests on this phone. Dial ${dial}, cancel all pending approvals, wait 5–10 minutes, then pay once.${phoneSuffix}`,
      rw: `Hari ubutumwa bwinshi bwo kwishyura butegereje kuri iyi telefone. Kanda ${dial}, siba byose bitegereje, tegereza iminota 5–10, hanyuma wishyure rimwe.${phoneSuffix}`,
      fr: `Trop de demandes de paiement en attente sur ce téléphone. Composez ${dial}, annulez toutes les approbations, attendez 5–10 minutes, puis payez une fois.${phoneSuffix}`,
    },
    PAYMENT_EXPIRED: {
      en: "The previous payment prompt expired before you approved it. You can start a new payment now.",
      rw: "Ubutumwa bwo kwishyura bwa kera bwarangiye utarabwemeza. Ushobora gutangira undi mwishyura ubu.",
      fr: "La demande de paiement précédente a expiré avant votre approbation. Vous pouvez recommencer maintenant.",
    },
    PAYMENT_ABANDONED: {
      en: "The previous payment attempt was cancelled. You can send a new payment prompt now.",
      rw: "Ugerageza rwo kwishyura rwa kera rwahagaritswe. Ushobora kohereza undi mucyo ubu.",
      fr: "La tentative de paiement précédente a été annulée. Vous pouvez envoyer une nouvelle demande.",
    },
    MOMO_IMMEDIATE_REJECT: {
      en: `The payment was rejected immediately — usually because of low balance or old pending prompts.${promptSuffix}${phoneSuffix}`,
      rw: `Wishyura byanze ako kanya — akenshi ni amafaranga make cyangwa ubutumwa bwa kera butegereje.${promptSuffix}${phoneSuffix}`,
      fr: `Le paiement a été refusé immédiatement — souvent solde insuffisant ou anciennes demandes en attente.${promptSuffix}${phoneSuffix}`,
    },
    NO_PAYMENT_PROMPT: {
      en: `We sent the payment request, but your phone may not show the prompt.${promptSuffix}${phoneSuffix}`,
      rw: `Twakohereje icyifuzo cyo kwishyura, ariko telefone yawe ishobora kutabigaragaza.${promptSuffix}${phoneSuffix}`,
      fr: `Nous avons envoyé la demande, mais votre téléphone peut ne pas l'afficher.${promptSuffix}${phoneSuffix}`,
    },
  };

  const entry = messages[issue.code];
  if (entry) return entry[language] || entry.en;

  const raw = String(issue.message || "").toLowerCase();
  if (raw.includes("insufficient") || raw.includes("not enough") || raw.includes("balance")) {
    return getPaymentUserMessage({ code: "INSUFFICIENT_BALANCE" }, language, contact, options);
  }

  if (issue.message) return `${issue.message}${phoneSuffix}`;
  return null;
}
