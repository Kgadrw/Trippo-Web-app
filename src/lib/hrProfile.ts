import type { TeamMemberRecord } from "@/lib/api";

export const EMPLOYMENT_TYPES = ["full_time", "part_time", "contract", "intern"] as const;

export function employmentTypeLabel(type: string | undefined, t: (key: string) => string) {
  const map: Record<string, string> = {
    full_time: t("hrEmploymentFullTime"),
    part_time: t("hrEmploymentPartTime"),
    contract: t("hrEmploymentContract"),
    intern: t("hrEmploymentIntern"),
  };
  return map[type || "full_time"] || type || t("hrEmploymentFullTime");
}

export function memberId(member: TeamMemberRecord | string | null | undefined) {
  if (!member) return "";
  return typeof member === "string" ? member : String(member._id);
}

export function memberName(member: TeamMemberRecord | string | null | undefined) {
  if (!member) return "";
  return typeof member === "string" ? "" : member.name;
}

export function formatHrDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" });
}
