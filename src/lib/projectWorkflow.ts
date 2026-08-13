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

export interface ProjectWorkQueueItem {
  _id: string;
  name: string;
  status: ProjectStatus;
  priority?: "low" | "medium" | "high";
  startDate?: string | null;
  targetEndDate?: string | null;
  clientName?: string;
  leadName?: string;
  openTasks: number;
  updatedAt?: string | null;
}

export interface ProjectContributionDay {
  date: string;
  hours: number;
  tasks: number;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
}

export interface ProjectContributionGraph {
  projectId: string | null;
  projectName: string | null;
  days: ProjectContributionDay[];
}

export interface ProjectReminderItem {
  id: string;
  type: "overdue_task" | "due_soon_task" | "overdue_milestone";
  title: string;
  dueDate?: string | null;
  projectId?: string;
  projectName?: string;
  priority?: "low" | "medium" | "high";
}

export interface ProjectAchievementItem {
  id: string;
  type:
    | "tasks_completed_week"
    | "milestones_completed_week"
    | "milestone_completed"
    | "project_completed";
  title: string;
  count?: number;
  projectId?: string;
  projectName?: string;
  completedAt?: string | null;
}

export interface ProjectsSummary {
  totalProjects: number;
  byStatus: Record<ProjectStatus, number>;
  overdueMilestones: number;
  openTasks: number;
  taskStatus?: { todo: number; in_progress: number; done: number };
  reminders?: ProjectReminderItem[];
  achievements?: ProjectAchievementItem[];
  tasksCompletedWeekly: WeeklyVelocityPoint[];
  hoursLoggedWeekly: WeeklyVelocityPoint[];
  workQueue?: ProjectWorkQueueItem[];
  projectOptions?: Array<{ _id: string; name: string; status?: ProjectStatus }>;
  contributionGraph?: ProjectContributionGraph;
}

export interface ProjectProfilePayload {
  project: ProjectRecord;
  milestones: ProjectMilestoneRecord[];
  tasks: ProjectTaskRecord[];
  teamTasks?: import("@/lib/api").TeamTaskRecord[];
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
    taskStatus?: { todo: number; in_progress: number; done: number };
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

export function milestoneStatusClass(status: string) {
  switch (status) {
    case "in_progress":
      return "bg-sky-100 text-sky-800";
    case "completed":
      return "bg-emerald-100 text-emerald-800";
    case "pending":
    default:
      return "bg-slate-100 text-slate-700";
  }
}

export function milestoneColumnAccent(status: string) {
  switch (status) {
    case "in_progress":
      return "#e0f2fe";
    case "completed":
      return "#d1fae5";
    case "pending":
    default:
      return "#f1f5f9";
  }
}

export function formatWeekLabel(weekStart: string) {
  const date = new Date(`${weekStart}T12:00:00`);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatShortDate(value: string) {
  const date = new Date(`${value.split("T")[0]}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value.split("T")[0];
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function formatProjectTimeframe(startDate?: string | null, targetEndDate?: string | null) {
  const start = startDate ? startDate.split("T")[0] : "";
  const end = targetEndDate ? targetEndDate.split("T")[0] : "";
  if (start && end) return `${formatShortDate(start)} → ${formatShortDate(end)}`;
  if (start) return `From ${formatShortDate(start)}`;
  if (end) return `Due ${formatShortDate(end)}`;
  return "No timeframe set";
}

export function contributionLevelClass(level: number) {
  switch (level) {
    case 1:
      return "bg-emerald-200";
    case 2:
      return "bg-emerald-400";
    case 3:
      return "bg-emerald-600";
    case 4:
      return "bg-emerald-800";
    default:
      return "bg-gray-100";
  }
}
