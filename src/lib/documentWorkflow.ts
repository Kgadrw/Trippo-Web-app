export const REGISTRY_TYPES = ["general", "contract", "policy", "template"] as const;
export const REGISTRY_STATUSES = ["draft", "active", "archived", "expired"] as const;
export const SHARE_PERMISSIONS = ["view", "download", "edit"] as const;

export type RegistryType = (typeof REGISTRY_TYPES)[number];
export type RegistryStatus = (typeof REGISTRY_STATUSES)[number];

export interface DocumentVersionRecord {
  _id?: string;
  versionNumber: number;
  fileUrl: string;
  fileName: string;
  fileSize?: number;
  contentHash?: string;
  changeNote?: string;
  uploadedByName?: string;
  uploadedAt?: string;
}

export interface DocumentShareRecord {
  _id?: string;
  targetUserId: string;
  targetName?: string;
  permission?: "view" | "download" | "edit";
  grantedByName?: string;
  grantedAt?: string;
}

export interface DocumentSignatureRecord {
  _id?: string;
  signerName: string;
  signerEmail?: string;
  documentHash: string;
  signatureHash: string;
  algorithm?: string;
  signedAt?: string;
  verificationStatus?: "verified" | "pending" | "invalid";
}

export interface CompanyDocumentRecord {
  _id: string;
  title: string;
  category?: string;
  registryType?: RegistryType;
  registryStatus?: RegistryStatus;
  effectiveDate?: string;
  expiryDate?: string;
  renewalDate?: string;
  policyScope?: string;
  date: string;
  note?: string;
  fileUrl: string;
  fileName: string;
  fileSize?: number;
  contentHash?: string;
  currentVersionNumber?: number;
  versions?: DocumentVersionRecord[];
  shares?: DocumentShareRecord[];
  signatures?: DocumentSignatureRecord[];
  createdAt?: string;
  updatedAt?: string;
}

export interface DocumentsSummary {
  totalDocuments: number;
  byType: Record<RegistryType, number>;
  byStatus: Record<RegistryStatus, number>;
  expiringSoon: number;
  signedCount: number;
  sharedCount: number;
}

export interface DocumentProfilePayload {
  document: CompanyDocumentRecord;
  versionCount: number;
  shareCount: number;
  signatureCount: number;
  isSigned: boolean;
}

export function registryTypeLabel(type: string, t: (key: string) => string) {
  const map: Record<string, string> = {
    general: t("docTypeGeneral"),
    contract: t("docTypeContract"),
    policy: t("docTypePolicy"),
    template: t("docTypeTemplate"),
  };
  return map[type] || type;
}

export function registryStatusLabel(status: string, t: (key: string) => string) {
  const map: Record<string, string> = {
    draft: t("docStatusDraft"),
    active: t("docStatusActive"),
    archived: t("docStatusArchived"),
    expired: t("docStatusExpired"),
  };
  return map[status] || status;
}

export function registryStatusClass(status: string) {
  switch (status) {
    case "active":
      return "bg-emerald-100 text-emerald-800";
    case "draft":
      return "bg-slate-100 text-slate-700";
    case "archived":
      return "bg-amber-100 text-amber-800";
    case "expired":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

export function sharePermissionLabel(permission: string, t: (key: string) => string) {
  const map: Record<string, string> = {
    view: t("docShareView"),
    download: t("docShareDownload"),
    edit: t("docShareEdit"),
  };
  return map[permission] || permission;
}

export function truncateHash(hash?: string, length = 12) {
  if (!hash) return "—";
  if (hash.length <= length) return hash;
  return `${hash.slice(0, length)}…`;
}
