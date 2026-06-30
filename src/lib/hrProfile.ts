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

export interface OrgChartNode {
  member: TeamMemberRecord;
  children: OrgChartNode[];
}

export function buildOrgChartTree(members: TeamMemberRecord[]): OrgChartNode[] {
  const active = members.filter((member) => member.status !== "inactive");
  const byId = new Map(active.map((member) => [member._id, member]));
  const childrenByManager = new Map<string, TeamMemberRecord[]>();

  for (const member of active) {
    const managerId = memberId(member.reportsToId as TeamMemberRecord | string | null);
    if (!managerId || !byId.has(managerId) || managerId === member._id) continue;
    const bucket = childrenByManager.get(managerId) || [];
    bucket.push(member);
    childrenByManager.set(managerId, bucket);
  }

  const buildNode = (member: TeamMemberRecord): OrgChartNode => ({
    member,
    children: (childrenByManager.get(member._id) || [])
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(buildNode),
  });

  const roots = active
    .filter((member) => {
      const managerId = memberId(member.reportsToId as TeamMemberRecord | string | null);
      return !managerId || !byId.has(managerId) || managerId === member._id;
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  return roots.map(buildNode);
}

export function formatHrDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" });
}
