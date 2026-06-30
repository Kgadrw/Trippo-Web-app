export const ASSET_TYPES = [
  "vehicle",
  "machinery",
  "technology",
  "equipment",
  "furniture",
  "building",
  "other",
] as const;

export const ASSET_STATUSES = [
  "active",
  "in_use",
  "maintenance",
  "retired",
  "disposed",
] as const;

export type AssetType = (typeof ASSET_TYPES)[number];
export type AssetStatus = (typeof ASSET_STATUSES)[number];

export interface AssetMaintenanceRecord {
  _id?: string;
  title: string;
  scheduledDate: string;
  completedDate?: string;
  status: "scheduled" | "completed" | "overdue" | "cancelled";
  note?: string;
  performedBy?: string;
}

export interface AssetCustodyRecord {
  _id?: string;
  teamMemberId?: string;
  assigneeName?: string;
  assignedAt: string;
  returnedAt?: string;
  note?: string;
}

export interface AssetLifecycleEvent {
  _id?: string;
  eventType: string;
  summary: string;
  details?: string;
  actorName?: string;
  occurredAt: string;
}

export interface AssetDepreciationRow {
  period: string;
  periodLabel: string;
  openingValue: number;
  depreciation: number;
  accumulatedDepreciation: number;
  closingValue: number;
}

export interface AssetEntry {
  id?: number;
  _id?: string;
  title: string;
  assetTag?: string;
  assetType?: AssetType | string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  purchaseDate: string;
  purchaseCost: number;
  currentValue?: number;
  assignedTo?: string;
  teamMemberId?: string | { _id: string; name: string } | null;
  location?: string;
  warrantyExpires?: string;
  status?: AssetStatus | string;
  depreciationMethod?: "straight_line" | "none";
  usefulLifeMonths?: number;
  salvageValue?: number;
  note?: string;
  maintenanceRecords?: AssetMaintenanceRecord[];
  custodyHistory?: AssetCustodyRecord[];
  lifecycleEvents?: AssetLifecycleEvent[];
}

export function assetId(entry: AssetEntry) {
  return String(entry._id ?? entry.id ?? "");
}

export function assetTypeLabel(type: string | undefined, t: (key: string) => string) {
  const map: Record<string, string> = {
    vehicle: t("assetTypeVehicle"),
    machinery: t("assetTypeMachinery"),
    technology: t("assetTypeTechnology"),
    equipment: t("assetTypeEquipment"),
    furniture: t("assetTypeFurniture"),
    building: t("assetTypeBuilding"),
    other: t("assetTypeOther"),
  };
  return map[type || "equipment"] || type || "—";
}

export function assetStatusLabel(status: string | undefined, t: (key: string) => string) {
  const map: Record<string, string> = {
    active: t("assetStatusActive"),
    in_use: t("assetStatusInUse"),
    maintenance: t("assetStatusMaintenance"),
    retired: t("assetStatusRetired"),
    disposed: t("assetStatusDisposed"),
  };
  return map[status || "active"] || status || "—";
}

export function assetStatusClass(status?: string) {
  if (status === "maintenance") return "text-amber-600 font-medium";
  if (status === "retired" || status === "disposed") return "text-gray-500 font-medium";
  if (status === "in_use") return "text-sky-600 font-medium";
  return "text-emerald-600 font-medium";
}

export function isWarrantyExpiringSoon(warrantyExpires?: string) {
  if (!warrantyExpires) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(warrantyExpires);
  expiry.setHours(0, 0, 0, 0);
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() + 30);
  return expiry >= today && expiry <= cutoff;
}

export function custodianName(asset: AssetEntry) {
  if (typeof asset.teamMemberId === "object" && asset.teamMemberId?.name) {
    return asset.teamMemberId.name;
  }
  return asset.assignedTo || "";
}

export function formatAssetTag(tag?: string) {
  if (!tag) return "—";
  return tag.startsWith("#") ? tag : `#${tag}`;
}

export function lifecycleEventLabel(type: string, t: (key: string) => string) {
  const map: Record<string, string> = {
    registered: t("assetEventRegistered"),
    updated: t("assetEventUpdated"),
    assigned: t("assetEventAssigned"),
    returned: t("assetEventReturned"),
    maintenance: t("assetEventMaintenance"),
    audit: t("assetEventAudit"),
    status_change: t("assetEventStatusChange"),
    disposed: t("assetEventDisposed"),
  };
  return map[type] || type;
}
