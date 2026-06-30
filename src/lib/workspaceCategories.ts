export const WORKSPACE_CATEGORY_TYPES = [
  "department",
  "expense",
  "product",
  "document",
  "income",
] as const;

export type WorkspaceCategoryType = (typeof WORKSPACE_CATEGORY_TYPES)[number];

export interface WorkspaceCategoryOption {
  id: string | null;
  key: string;
  label: string;
  isDefault: boolean;
  isCustom: boolean;
  sortOrder?: number;
}

export const DEPARTMENT_TRANSLATION_KEYS: Record<string, string> = {
  general: "teamDeptGeneral",
  finance: "teamDeptFinance",
  operations: "teamDeptOperations",
  sales: "teamDeptSales",
  marketing: "teamDeptMarketing",
  hr: "teamDeptHr",
};

function humanizeCategoryKey(key: string) {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function formatCategoryLabel(
  key: string,
  options: WorkspaceCategoryOption[],
  t: (key: string) => string,
  type?: WorkspaceCategoryType,
) {
  const normalized = String(key || "").trim().toLowerCase();
  if (!normalized) return "";

  if (type === "department") {
    const translationKey = DEPARTMENT_TRANSLATION_KEYS[normalized];
    if (translationKey) {
      const translated = t(translationKey);
      if (translated !== translationKey) return translated;
    }
  }

  const match = options.find((option) => option.key === normalized);
  if (match?.label) return match.label;

  return humanizeCategoryKey(normalized);
}

export function slugifyCategoryLabel(label: string) {
  const key = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return key || "custom";
}
