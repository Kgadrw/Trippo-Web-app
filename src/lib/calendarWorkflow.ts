export type CorporateFeedType =
  | "leave"
  | "milestone"
  | "crm_meeting"
  | "announcement";

export type AnnouncementScope = "workspace" | "regional" | "global";
export type AnnouncementPriority = "normal" | "high" | "critical";
export type AnnouncementStatus = "draft" | "published" | "archived";

export const ANNOUNCEMENT_SCOPES: AnnouncementScope[] = ["workspace", "regional", "global"];
export const ANNOUNCEMENT_PRIORITIES: AnnouncementPriority[] = ["normal", "high", "critical"];
export const ANNOUNCEMENT_STATUSES: AnnouncementStatus[] = ["draft", "published", "archived"];
export const REGION_CODES = ["", "Africa", "Americas", "Asia", "Europe", "Oceania"] as const;

export interface CorporateFeedItem {
  id: string;
  feedType: CorporateFeedType;
  title: string;
  startDate: string;
  endDate?: string;
  allDay?: boolean;
  subtitle?: string;
  link?: string;
  color?: string;
  meta?: Record<string, unknown>;
}

export interface CorporateCalendarSummary {
  upcomingMeetings: number;
  activeAnnouncements: number;
  pendingAutomations: number;
  approvedLeaveWindows: number;
  upcomingMilestones: number;
  clientMeetings: number;
}

export interface CompanyAnnouncementRecord {
  _id: string;
  id?: string;
  title: string;
  body?: string;
  startDate: string;
  endDate?: string;
  allDay?: boolean;
  scope?: AnnouncementScope;
  regionCode?: string;
  priority?: AnnouncementPriority;
  status?: AnnouncementStatus;
  createdByName?: string;
}

type TFn = (key: string) => string;

export function announcementScopeLabel(scope: string | undefined, t: TFn) {
  const map: Record<string, string> = {
    workspace: t("corpAnnScopeWorkspace"),
    regional: t("corpAnnScopeRegional"),
    global: t("corpAnnScopeGlobal"),
  };
  return map[scope || "workspace"] || scope || "";
}

export function announcementPriorityLabel(priority: string | undefined, t: TFn) {
  const map: Record<string, string> = {
    normal: t("corpAnnPriorityNormal"),
    high: t("corpAnnPriorityHigh"),
    critical: t("corpAnnPriorityCritical"),
  };
  return map[priority || "normal"] || priority || "";
}

export function announcementStatusLabel(status: string | undefined, t: TFn) {
  const map: Record<string, string> = {
    draft: t("corpAnnStatusDraft"),
    published: t("corpAnnStatusPublished"),
    archived: t("corpAnnStatusArchived"),
  };
  return map[status || "draft"] || status || "";
}

export function corporateFeedTypeLabel(feedType: CorporateFeedType, t: TFn) {
  const map: Record<CorporateFeedType, string> = {
    leave: t("calSourceLeave"),
    milestone: t("calSourceMilestone"),
    crm_meeting: t("calSourceClientMeeting"),
    announcement: t("calSourceAnnouncement"),
  };
  return map[feedType] || feedType;
}

export function announcementPriorityClass(priority?: string) {
  if (priority === "critical") return "bg-red-100 text-red-800";
  if (priority === "high") return "bg-orange-100 text-orange-800";
  return "bg-gray-100 text-gray-700";
}

export function announcementStatusClass(status?: string) {
  if (status === "published") return "bg-emerald-100 text-emerald-800";
  if (status === "archived") return "bg-gray-100 text-gray-600";
  return "bg-amber-100 text-amber-800";
}
