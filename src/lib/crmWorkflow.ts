import type { TeamMemberRecord } from "@/lib/api";

export const LIFECYCLE_STAGES = ["lead", "prospect", "customer", "inactive"] as const;
export const DEAL_STAGES = ["lead", "qualified", "proposal", "negotiation", "won", "lost"] as const;
export const OPEN_DEAL_STAGES = ["lead", "qualified", "proposal", "negotiation"] as const;
export const QUOTE_STATUSES = ["draft", "sent", "accepted", "rejected", "expired"] as const;
export const CONTRACT_STATUSES = ["draft", "active", "expired", "terminated"] as const;
export const ACTIVITY_TYPES = ["note", "call", "email", "meeting", "message"] as const;
export const COMM_CHANNELS = ["internal", "phone", "email", "sms", "whatsapp", "in_person", "other"] as const;

export type LifecycleStage = (typeof LIFECYCLE_STAGES)[number];
export type DealStage = (typeof DEAL_STAGES)[number];
export type QuoteStatus = (typeof QUOTE_STATUSES)[number];
export type ContractStatus = (typeof CONTRACT_STATUSES)[number];

export interface CrmContactRecord {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  businessType?: string;
  notes?: string;
  lifecycleStage?: LifecycleStage;
  source?: string;
  companyName?: string;
  address?: string;
  ownerUserId?: string | null;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface DealRecord {
  _id: string;
  clientId: CrmContactRecord | string;
  title: string;
  stage?: DealStage;
  value?: number;
  probability?: number;
  expectedCloseDate?: string;
  ownerUserId?: string | null;
  notes?: string;
  lostReason?: string;
}

export interface QuoteLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface QuoteRecord {
  _id: string;
  quoteNumber: string;
  title: string;
  clientId: CrmContactRecord | string;
  dealId?: string | null;
  clientName?: string;
  lineItems?: QuoteLineItem[];
  amount: number;
  issueDate: string;
  validUntil?: string;
  status?: QuoteStatus;
  notes?: string;
  terms?: string;
  convertedInvoiceId?: string | null;
}

export interface ContractRecord {
  _id: string;
  clientId: CrmContactRecord | string;
  dealId?: string | null;
  title: string;
  status?: ContractStatus;
  startDate?: string;
  endDate?: string;
  renewalDate?: string;
  value?: number;
  notes?: string;
}

export interface CrmActivityRecord {
  _id: string;
  clientId: string;
  dealId?: string | null;
  activityType?: string;
  channel?: string;
  subject?: string;
  body?: string;
  occurredAt: string;
  createdByName?: string;
}

export interface CrmSummary {
  totalContacts: number;
  funnel: Record<LifecycleStage, number>;
  pipeline: Record<string, { count: number; value: number }>;
  openPipelineValue: number;
  activeContracts: number;
  quotesByStatus: Record<string, number>;
  pendingQuoteValue: number;
  recentActivities: CrmActivityRecord[];
}

export interface CrmContactProfile {
  client: CrmContactRecord;
  deals: DealRecord[];
  quotes: QuoteRecord[];
  contracts: ContractRecord[];
  activities: CrmActivityRecord[];
  invoices: Array<{ _id: string; invoiceNumber: string; amount: number; status?: string; issueDate?: string }>;
}

export function contactName(contact: CrmContactRecord | string | null | undefined) {
  if (!contact) return "";
  if (typeof contact === "object") return contact.name || "";
  return "";
}

export function lifecycleLabel(stage: string, t: (key: string) => string) {
  const map: Record<string, string> = {
    lead: t("crmLifecycleLead"),
    prospect: t("crmLifecycleProspect"),
    customer: t("crmLifecycleCustomer"),
    inactive: t("crmLifecycleInactive"),
  };
  return map[stage] || stage;
}

export function dealStageLabel(stage: string, t: (key: string) => string) {
  const map: Record<string, string> = {
    lead: t("crmStageLead"),
    qualified: t("crmStageQualified"),
    proposal: t("crmStageProposal"),
    negotiation: t("crmStageNegotiation"),
    won: t("crmStageWon"),
    lost: t("crmStageLost"),
  };
  return map[stage] || stage;
}

export function quoteStatusLabel(status: string, t: (key: string) => string) {
  const map: Record<string, string> = {
    draft: t("crmQuoteDraft"),
    sent: t("crmQuoteSent"),
    accepted: t("crmQuoteAccepted"),
    rejected: t("crmQuoteRejected"),
    expired: t("crmQuoteExpired"),
  };
  return map[status] || status;
}

export function contractStatusLabel(status: string, t: (key: string) => string) {
  const map: Record<string, string> = {
    draft: t("crmContractDraft"),
    active: t("crmContractActive"),
    expired: t("crmContractExpired"),
    terminated: t("crmContractTerminated"),
  };
  return map[status] || status;
}

export function activityTypeLabel(type: string, t: (key: string) => string) {
  const map: Record<string, string> = {
    note: t("crmActivityNote"),
    call: t("crmActivityCall"),
    email: t("crmActivityEmail"),
    meeting: t("crmActivityMeeting"),
    message: t("crmActivityMessage"),
  };
  return map[type] || type;
}

export function channelLabel(channel: string, t: (key: string) => string) {
  const map: Record<string, string> = {
    internal: t("crmChannelInternal"),
    phone: t("crmChannelPhone"),
    email: t("crmChannelEmail"),
    sms: t("crmChannelSms"),
    whatsapp: t("crmChannelWhatsapp"),
    in_person: t("crmChannelInPerson"),
    other: t("crmChannelOther"),
  };
  return map[channel] || channel;
}

export function lifecycleClass(stage: string) {
  switch (stage) {
    case "lead":
      return "bg-violet-100 text-violet-800";
    case "prospect":
      return "bg-sky-100 text-sky-800";
    case "customer":
      return "bg-emerald-100 text-emerald-800";
    case "inactive":
      return "bg-slate-100 text-slate-600";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

export function dealStageClass(stage: string) {
  switch (stage) {
    case "won":
      return "bg-emerald-100 text-emerald-800";
    case "lost":
      return "bg-red-100 text-red-800";
    case "negotiation":
      return "bg-amber-100 text-amber-800";
    default:
      return "bg-sky-100 text-sky-800";
  }
}
