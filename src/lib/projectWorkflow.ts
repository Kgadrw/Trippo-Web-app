import type { TeamMemberRecord } from "@/lib/api";

export const PROJECT_STATUSES = ["planning", "active", "on_hold", "completed", "cancelled"] as const;
export const PROJECT_TASK_STATUSES = ["todo", "in_progress", "done"] as const;
export const MILESTONE_STATUSES = ["pending", "in_progress", "completed"] as const;
export const PROJECT_MEMBER_ROLES = ["lead", "member", "viewer"] as const;
export const PROJECT_PRIORITIES = ["low", "medium", "high"] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];
export type ProjectTaskStatus = (typeof PROJECT_TASK_STATUSES)[number];
export type MilestoneStatus = (typeof MILESTONE_STATUSES)[number];
export type ProjectMemberRole = (typeof PROJECT_MEMBER_ROLES)[number];

export interface ProjectRecord {
  _id: string;
  name: string;
  description?: string;
  status?: ProjectStatus;
  priority?: "low" | "medium" | "high";
  startDate?: string;
  targetEndDate?: string;
  completedAt?: string;
  leadMemberId?: TeamMemberRecord | string | null;
  clientName?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProjectMilestoneRecord {
  _id: string;
  projectId: string;
  title: string;
  description?: string;
  status?: MilestoneStatus;
  dueDate?: string;
  completedAt?: string;
  sortOrder?: number;
}

export interface ProjectTaskRecord {
  _id: string;
  projectId: string;
  milestoneId?: string | null;
  title: string;
  description?: string;
  assigneeId?: TeamMemberRecord | string | null;
  status?: ProjectTaskStatus;
  priority?: "low" | "medium" | "high";
  dueDate?: string;
  estimatedHours?: number;
  completedAt?: string;
  sortOrder?: number;
}

export interface ProjectMemberRecord {
  _id: string;
  projectId: string;
  teamMemberId: TeamMemberRecord | string;
  role?: ProjectMemberRole;
}

export interface TimeEntryRecord {
  _id: string;
  projectId: string;
  projectTaskId?: ProjectTaskRecord | string | null;
  teamMemberId: TeamMemberRecord | string;
  date: string;
  hours: number;
  note?: string;
  billable?: boolean;
}

export interface WeeklyVelocityPoint {
  weekStart: string;
  value: number;
}

export interface ProjectsSummary {
  totalProjects: number;
  byStatus: Record<ProjectStatus, number>;
  overdueMilestones: number;
  openTasks: number;
  tasksCompletedWeekly: WeeklyVelocityPoint[];
  hoursLoggedWeekly: WeeklyVelocityPoint[];
}

export interface ProjectProfilePayload {
  project: ProjectRecord;
  milestones: ProjectMilestoneRecord[];
  tasks: ProjectTaskRecord[];
  members: ProjectMemberRecord[];
  timeEntries: TimeEntryRecord[];
  progress: {
    taskCompletionRate: number;
    milestoneCompletionRate: number;
    totalTasks: number;
    doneTasks: number;
    totalMilestones: number;
    doneMilestones: number;
    totalHoursLogged: number;
  };
  velocity: {
    tasksCompletedWeekly: WeeklyVelocityPoint[];
    hoursLoggedWeekly: WeeklyVelocityPoint[];
  };
}

export function projectId(project: ProjectRecord | string) {
  return typeof project === "string" ? project : project._id;
}

export function memberName(member: TeamMemberRecord | string | null | undefined) {
  if (!member) return "";
  if (typeof member === "object") return member.name || "";
  return "";
}

export function projectStatusLabel(status: string, t: (key: string) => string) {
  const map: Record<string, string> = {
    planning: t("projectStatusPlanning"),
    active: t("projectStatusActive"),
    on_hold: t("projectStatusOnHold"),
    completed: t("projectStatusCompleted"),
    cancelled: t("projectStatusCancelled"),
  };
  return map[status] || status;
}

export function projectStatusClass(status: string) {
  switch (status) {
    case "active":
      return "bg-sky-100 text-sky-800";
    case "planning":
      return "bg-violet-100 text-violet-800";
    case "on_hold":
      return "bg-amber-100 text-amber-800";
    case "completed":
      return "bg-emerald-100 text-emerald-800";
    case "cancelled":
      return "bg-slate-100 text-slate-600";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

export function taskStatusLabel(status: string, t: (key: string) => string) {
  return t(
    `teamStatus${status === "in_progress" ? "InProgress" : status.charAt(0).toUpperCase() + status.slice(1)}`,
  );
}

export function milestoneStatusLabel(status: string, t: (key: string) => string) {
  const map: Record<string, string> = {
    pending: t("projectMilestonePending"),
    in_progress: t("projectMilestoneInProgress"),
    completed: t("projectMilestoneCompleted"),
  };
  return map[status] || status;
}

export function formatWeekLabel(weekStart: string) {
  const date = new Date(`${weekStart}T12:00:00`);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
