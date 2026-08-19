import { useEffect, useLayoutEffect, useMemo, useRef, useState, type DragEvent } from "react";
import type { TeamTaskRecord, TeamTaskSubtask } from "@/lib/api";
import { TEAM_TASK_STATUSES, teamPriorityBarClass, teamPriorityClass } from "@/lib/teamConstants";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserProfileAvatar } from "@/components/profile/UserProfileAvatar";
import { cn } from "@/lib/utils";
import { CalendarClock, MoreVertical, Pencil, Plus, Trash2 } from "lucide-react";
import { taskId } from "@/lib/teamTaskRealtime";
import { isIncompleteTaskOverdue } from "@/lib/taskDeadlines";
import { useTheme } from "@/hooks/useTheme";

export type ExtraDeadlineForTask = (task: TeamTaskRecord) => string | null | undefined;

export const TEAM_TASK_SECTION_ORDER = ["todo", "in_progress", "done"] as const;
export type TeamTaskSection = (typeof TEAM_TASK_SECTION_ORDER)[number];

const TEAM_TASK_DND_MIME = "application/x-trippo-team-task";

const ASSIGNEE_COLORS_LIGHT = [
  "#f8fafc",
  "#f6f7fb",
  "#f9fafb",
  "#f5f3ff",
  "#faf5ff",
  "#f4f8fb",
  "#fffaf5",
  "#f5f7ff",
  "#f7faf5",
  "#f4fbfb",
  "#fff5f7",
  "#f8f5ff",
] as const;

/** Muted tinted fills that sit on dark surfaces (same hue order as light). */
const ASSIGNEE_COLORS_DARK = [
  "#1a3345",
  "#1a3a30",
  "#3a321c",
  "#2c2742",
  "#3a2434",
  "#1a3836",
  "#3a2c1e",
  "#242748",
  "#2a361c",
  "#1a343c",
  "#3a2428",
  "#302848",
] as const;

function hashString(input: string) {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function taskAssignees(task: TeamTaskRecord): Array<{ _id: string; name: string }> {
  if (task.assignees?.length) {
    return task.assignees
      .map((a) =>
        typeof a === "object" && a?._id
          ? { _id: String(a._id), name: a.name || "" }
          : { _id: String(a), name: "" },
      )
      .filter((a) => a._id);
  }
  if (typeof task.assigneeId === "object" && task.assigneeId?._id) {
    return [{ _id: String(task.assigneeId._id), name: task.assigneeId.name || "" }];
  }
  if (typeof task.assigneeId === "string" && task.assigneeId) {
    return [{ _id: task.assigneeId, name: "" }];
  }
  return [];
}

export function assigneeName(task: TeamTaskRecord) {
  const list = taskAssignees(task);
  return list.map((a) => a.name).filter(Boolean).join(", ");
}

export function assigneeKey(task: TeamTaskRecord) {
  const list = taskAssignees(task);
  if (list.length > 0) return list.map((a) => a._id).sort().join(",");
  return "unknown";
}

export function canCurrentUserChangeTaskStatus(
  task: TeamTaskRecord,
  currentTeamMemberId: string | null,
) {
  if (!currentTeamMemberId) return false;
  const list = taskAssignees(task);
  return list.some((a) => a._id === currentTeamMemberId);
}

export function getAssigneeCardColor(key: string, mode: "light" | "dark" = "light") {
  const palette = mode === "dark" ? ASSIGNEE_COLORS_DARK : ASSIGNEE_COLORS_LIGHT;
  return palette[hashString(key) % palette.length];
}

function linkedProjectName(task: TeamTaskRecord) {
  if (typeof task.projectId === "object" && task.projectId?.name) {
    return task.projectId.name;
  }
  return "";
}

function linkedMilestoneName(task: TeamTaskRecord) {
  if (typeof task.milestoneId === "object" && task.milestoneId?.title) {
    return task.milestoneId.title;
  }
  return "";
}

function creatorName(task: TeamTaskRecord) {
  if (typeof task.assignedBy === "object" && task.assignedBy?.name) {
    return task.assignedBy.name;
  }
  return "";
}

export function teamTaskStatusLabel(status: string, t: (key: string) => string) {
  return t(
    `teamStatus${status === "in_progress" ? "InProgress" : status.charAt(0).toUpperCase() + status.slice(1)}`,
  );
}

function formatDate(value?: string) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
}

function formatRemainingDays(deadline?: string | null) {
  if (!deadline) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(deadline);
  end.setHours(0, 0, 0, 0);
  if (Number.isNaN(end.getTime())) return null;

  const diffDays = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return `${Math.abs(diffDays)}d overdue`;
  if (diffDays === 0) return "Due today";
  if (diffDays === 1) return "1 day left";
  return `${diffDays} days left`;
}

function deadlineTone(deadline?: string | null) {
  if (!deadline) return "";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(deadline);
  end.setHours(0, 0, 0, 0);
  if (Number.isNaN(end.getTime())) return "";

  const diffDays = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return "text-red-700 dark:text-red-300";
  if (diffDays <= 3) return "text-orange-700 dark:text-orange-300";
  if (diffDays <= 7) return "text-amber-700 dark:text-amber-300";
  return "text-lime-700 dark:text-lime-300";
}

function completedDeadlineMessage(completedAt?: string | null, deadline?: string | null) {
  if (!completedAt || !deadline) return null;
  const completed = new Date(completedAt);
  const end = new Date(deadline);
  completed.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  if (Number.isNaN(completed.getTime()) || Number.isNaN(end.getTime())) return null;

  const diffDays = Math.round((end.getTime() - completed.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays >= 3) return `Finished well before deadline (${diffDays} days early)`;
  if (diffDays >= 1) return `Finished before deadline (${diffDays} day${diffDays === 1 ? "" : "s"} early)`;
  if (diffDays === 0) return "Finished on deadline";
  return `Finished after deadline (${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? "" : "s"} late)`;
}

function TaskCompletionNote({
  note,
  t,
}: {
  note: string;
  t: (key: string) => string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [canToggle, setCanToggle] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    setExpanded(false);
  }, [note]);

  useLayoutEffect(() => {
    const el = textRef.current;
    if (!el || expanded) return;
    setCanToggle(el.scrollHeight > el.clientHeight + 1);
  }, [note, expanded]);

  return (
    <div
      className="rounded border border-emerald-200/70 bg-white/60 px-2.5 py-2"
      onPointerDown={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
    >
      <p className="text-[10px] font-medium uppercase tracking-wide text-emerald-800/80">
        {t("teamCompletionNote")}
      </p>
      <p
        ref={textRef}
        className={cn(
          "mt-1 whitespace-pre-wrap break-words text-xs leading-relaxed text-gray-800",
          !expanded && "line-clamp-4",
        )}
      >
        {note}
      </p>
      {canToggle ? (
        <button
          type="button"
          className="mt-1.5 text-[11px] font-medium text-emerald-800 hover:underline"
          onClick={() => setExpanded((open) => !open)}
        >
          {expanded ? t("viewLess") : t("viewMore")}
        </button>
      ) : null}
    </div>
  );
}

export function taskSubtasks(task: TeamTaskRecord | null | undefined): TeamTaskSubtask[] {
  return Array.isArray(task?.subtasks) ? task.subtasks : [];
}

export function serializeTaskSubtasks(rows: Array<{ _id?: string; title: string; done?: boolean }>) {
  return rows
    .map((row) => ({
      ...(row._id ? { _id: row._id } : {}),
      title: row.title.trim(),
      done: Boolean(row.done),
    }))
    .filter((row) => row.title);
}

export function areAllSubtasksComplete(subtasks: TeamTaskSubtask[]): boolean {
  const rows = subtasks.filter((row) => row.title?.trim());
  return rows.length > 0 && rows.every((row) => Boolean(row.done));
}

export function emptySubtaskRows(count = 2) {
  return Array.from({ length: count }, (_, index) => ({
    key: `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
    title: "",
    done: false,
  }));
}

export function TaskSubtaskEditor({
  rows,
  onChange,
  t,
  canToggleDone = false,
}: {
  rows: Array<{ key: string; _id?: string; title: string; done?: boolean }>;
  onChange: (rows: Array<{ key: string; _id?: string; title: string; done?: boolean }>) => void;
  t: (key: string) => string;
  canToggleDone?: boolean;
}) {
  const addRow = () => {
    onChange([...rows, ...emptySubtaskRows(2)]);
  };

  const doneCount = rows.filter((row) => row.done && row.title.trim()).length;
  const titledCount = rows.filter((row) => row.title.trim()).length;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-sm font-medium">{t("teamSubtasks")}</Label>
        <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={addRow}>
          <Plus size={12} className="mr-1" />
          {t("teamAddSubtask")}
        </Button>
      </div>
      <p className="text-xs text-gray-500">{t("teamSubtaskHint")}</p>
      {titledCount > 0 ? (
        <div className="space-y-1">
          <div className="h-1.5 overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-emerald-500 transition-[width]"
              style={{ width: `${Math.round((doneCount / titledCount) * 100)}%` }}
            />
          </div>
          <p className="text-[11px] text-gray-500">
            {t("teamSubtaskProgress")
              .replace("{done}", String(doneCount))
              .replace("{total}", String(titledCount))}
          </p>
        </div>
      ) : null}
      {rows.length === 0 ? (
        <p className="text-xs text-gray-500">{t("teamSubtaskPlaceholder")}</p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {rows.map((row, index) => (
            <div key={row.key} className="flex min-w-0 items-center gap-2">
              {canToggleDone || rows.some((item) => item._id || item.done) ? (
                <Checkbox
                  checked={Boolean(row.done)}
                  disabled={!canToggleDone}
                  onCheckedChange={(checked) => {
                    if (!canToggleDone) return;
                    onChange(
                      rows.map((item, i) =>
                        i === index ? { ...item, done: checked === true } : item,
                      ),
                    );
                  }}
                  aria-label={row.title || t("teamAddSubtask")}
                />
              ) : null}
              <Input
                value={row.title}
                onChange={(event) => {
                  onChange(
                    rows.map((item, i) =>
                      i === index ? { ...item, title: event.target.value } : item,
                    ),
                  );
                }}
                placeholder={t("teamSubtaskPlaceholder")}
                className="h-8 min-w-0 flex-1"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-gray-500"
                onClick={() => onChange(rows.filter((_, i) => i !== index))}
                aria-label={t("delete")}
              >
                <Trash2 size={14} />
              </Button>
            </div>
          ))}
        </div>
      )}
      {!canToggleDone && rows.some((row) => row._id) ? (
        <p className="text-[11px] text-gray-500">{t("teamSubtaskAssigneeOnly")}</p>
      ) : null}
    </div>
  );
}

function CardSubtasks({
  task,
  t,
  canComplete,
  onSubtasksChange,
}: {
  task: TeamTaskRecord;
  t: (key: string) => string;
  canComplete: boolean;
  onSubtasksChange?: (task: TeamTaskRecord, subtasks: TeamTaskSubtask[]) => void;
}) {
  const subtasks = taskSubtasks(task);
  if (!subtasks.length) return null;

  const doneCount = subtasks.filter((row) => row.done).length;
  const percent = Math.round((doneCount / subtasks.length) * 100);

  return (
    <div
      className="space-y-1.5 pt-1"
      onPointerDown={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
    >
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500">
            {t("teamSubtasks")}
          </p>
          <p className="text-[10px] font-medium text-gray-600">
            {t("teamSubtaskProgress")
              .replace("{done}", String(doneCount))
              .replace("{total}", String(subtasks.length))}
          </p>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-black/10">
          <div
            className="h-full rounded-full bg-emerald-500 transition-[width]"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
      <ul className="space-y-1">
        {subtasks.map((row, index) => {
          const key = String(row._id || `${row.title}-${index}`);
          return (
            <li key={key} className="flex items-start gap-2">
              <Checkbox
                checked={Boolean(row.done)}
                disabled={!canComplete}
                className="mt-0.5 shrink-0"
                onCheckedChange={(checked) => {
                  if (!canComplete || !onSubtasksChange) return;
                  onSubtasksChange(
                    task,
                    subtasks.map((item, i) =>
                      i === index ? { ...item, done: checked === true } : item,
                    ),
                  );
                }}
                aria-label={row.title}
              />
              <span
                className={cn(
                  "min-w-0 flex-1 break-words text-xs leading-snug text-gray-700",
                  row.done && "line-through text-gray-400",
                )}
              >
                {row.title}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function TaskBoardCard({
  task,
  t,
  resolveAssigneeAvatar,
  resolveCreatorAvatar,
  canChangeStatus,
  canManageTask,
  showProjectLink,
  onComplete,
  onStatusChange,
  onEdit,
  onDelete,
  onSubtasksChange,
  deletingId,
  active = false,
  extraDeadline,
}: {
  task: TeamTaskRecord;
  t: (key: string) => string;
  resolveAssigneeAvatar: (task: TeamTaskRecord) => string | undefined;
  resolveCreatorAvatar: (task: TeamTaskRecord) => string | undefined;
  canChangeStatus: boolean;
  canManageTask: boolean;
  showProjectLink: boolean;
  onComplete: (task: TeamTaskRecord) => void;
  onStatusChange: (task: TeamTaskRecord, status: string) => void;
  onEdit: (task: TeamTaskRecord) => void;
  onDelete: (task: TeamTaskRecord) => void;
  onSubtasksChange?: (task: TeamTaskRecord, subtasks: TeamTaskSubtask[]) => void;
  deletingId: string | null;
  active?: boolean;
  extraDeadline?: string | null;
}) {
  const isDone = task.status === "done";
  const overdue = isIncompleteTaskOverdue(task, extraDeadline);
  const id = taskId(task);
  const currentStatus = task.status || "todo";
  const name = assigneeName(task);
  const projectDeadlineRemaining = formatRemainingDays(extraDeadline);
  const projectDeadlineTone = deadlineTone(extraDeadline);
  const projectDeadlineCompletedMessage = completedDeadlineMessage(task.completedAt, extraDeadline);
  const { resolvedTheme } = useTheme();
  const cardColor = getAssigneeCardColor(assigneeKey(task), resolvedTheme);
  const [isDragging, setIsDragging] = useState(false);
  const [finePointer, setFinePointer] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(pointer: fine)");
    const sync = () => setFinePointer(media.matches);
    sync();
    media.addEventListener?.("change", sync);
    return () => media.removeEventListener?.("change", sync);
  }, []);

  const milestoneName = linkedMilestoneName(task);
  const allowDrag = canChangeStatus && finePointer;
  const cardRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    if (!active || !cardRef.current) return;
    cardRef.current.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
  }, [active]);

  return (
    <li
      ref={cardRef}
      data-task-id={id}
      draggable={allowDrag}
      onDragStart={(event) => {
        if (!allowDrag) {
          event.preventDefault();
          return;
        }
        event.dataTransfer.setData(TEAM_TASK_DND_MIME, id);
        event.dataTransfer.effectAllowed = "move";
        setIsDragging(true);
      }}
      onDragEnd={() => setIsDragging(false)}
      className={cn(
        "task-assignee-card flex shrink-0 overflow-hidden rounded border",
        allowDrag && "cursor-grab active:cursor-grabbing",
        isDragging && "opacity-50",
        active && "ring-2 ring-sky-500 ring-offset-2 shadow-md",
        overdue && "border-red-400 bg-red-100 dark:border-red-500 dark:bg-red-950/80",
      )}
      style={overdue ? undefined : { borderColor: cardColor, backgroundColor: cardColor }}
    >
      <span
        aria-hidden
        className={cn("w-1 shrink-0 self-stretch", teamPriorityBarClass(task.priority))}
      />
      <div className="min-w-0 flex-1 p-3">
        <div className="flex gap-2">
          {canChangeStatus ? (
            <Checkbox
              checked={isDone}
              disabled={isDone}
              className="mt-0.5 shrink-0"
              onCheckedChange={() => {
                if (!isDone) onComplete(task);
              }}
              aria-label={t("teamMarkComplete")}
            />
          ) : null}
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex items-start justify-between gap-2">
              <p
                className={cn(
                  "min-w-0 flex-1 break-words text-sm font-medium leading-snug text-gray-900",
                  isDone && "line-through text-gray-500",
                )}
              >
                {task.title}
              </p>
              {canChangeStatus || canManageTask ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                      <MoreVertical size={14} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {canChangeStatus
                      ? TEAM_TASK_STATUSES.filter((s) => s !== currentStatus).map((s) => (
                          <DropdownMenuItem key={s} onClick={() => onStatusChange(task, s)}>
                            {teamTaskStatusLabel(s, t)}
                          </DropdownMenuItem>
                        ))
                      : null}
                    {!isDone && (canChangeStatus || canManageTask) ? (
                      <DropdownMenuItem onClick={() => onEdit(task)}>
                        <Pencil size={14} className="mr-2" />
                        {t("edit")}
                      </DropdownMenuItem>
                    ) : null}
                    {isDone && canChangeStatus ? (
                      <DropdownMenuItem onClick={() => onEdit(task)}>
                        <Pencil size={14} className="mr-2" />
                        {t("teamEditCompletionNote")}
                      </DropdownMenuItem>
                    ) : null}
                    <DropdownMenuItem
                      className="text-red-600"
                      disabled={deletingId === id}
                      onClick={() => onDelete(task)}
                    >
                      <Trash2 size={14} className="mr-2" />
                      {t("delete")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
            </div>
            <CardSubtasks
              task={task}
              t={t}
              canComplete={!isDone && Boolean(onSubtasksChange) && canChangeStatus}
              onSubtasksChange={onSubtasksChange}
            />
            {task.description ? (
              <p
                className={cn(
                  "break-words text-xs leading-relaxed text-gray-500",
                  isDone && "line-through",
                )}
              >
                {task.description}
              </p>
            ) : null}
            {task.completionNote ? <TaskCompletionNote note={task.completionNote} t={t} /> : null}
            <div className="flex flex-col gap-1.5 pt-0.5 text-xs text-gray-500">
              {(() => {
                const assignees = taskAssignees(task);
                if (assignees.length === 0) return null;
                return (
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="flex items-center -space-x-1.5">
                      {assignees.slice(0, 4).map((a) => {
                        const populatedAssignee = (task.assignees || []).find(
                          (x) => typeof x === "object" && x?._id && String(x._id) === a._id,
                        );
                        const avatarUrl = populatedAssignee
                          ? resolveAssigneeAvatar({ ...task, assigneeId: populatedAssignee } as TeamTaskRecord)
                          : resolveAssigneeAvatar(task);
                        return (
                          <UserProfileAvatar
                            key={a._id}
                            name={a.name}
                            profilePictureUrl={avatarUrl}
                            className="h-6 w-6 shrink-0 border-2 border-white dark:border-zinc-800 rounded-full"
                            fallbackClassName="bg-sky-100 text-[9px] font-semibold text-sky-700"
                          />
                        );
                      })}
                      {assignees.length > 4 ? (
                        <span className="ml-1 text-[10px] text-gray-500">+{assignees.length - 4}</span>
                      ) : null}
                    </div>
                    <p className="min-w-0 truncate font-medium text-gray-700 dark:text-gray-300">
                      {assignees.map((a) => a.name).filter(Boolean).join(", ")}
                    </p>
                  </div>
                );
              })()}
              {showProjectLink && linkedProjectName(task) ? (
                <p className="truncate text-sky-700">
                  {t("teamLinkedProject")}: {linkedProjectName(task)}
                </p>
              ) : null}
              {showProjectLink && linkedProjectName(task) && extraDeadline ? (
                <p
                  className={cn(
                    "flex items-center gap-1 truncate text-[11px] font-medium",
                    isDone
                      ? projectDeadlineCompletedMessage?.includes("after deadline")
                        ? "text-red-700 dark:text-red-300"
                        : "text-emerald-700 dark:text-emerald-300"
                      : projectDeadlineTone,
                  )}
                >
                  <CalendarClock className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">
                    Project deadline: {formatDate(extraDeadline)}
                    {isDone
                      ? projectDeadlineCompletedMessage
                        ? ` · ${projectDeadlineCompletedMessage}`
                        : ""
                      : projectDeadlineRemaining
                        ? ` · ${projectDeadlineRemaining}`
                        : ""}
                  </span>
                </p>
              ) : null}
              {milestoneName ? (
                <p className="truncate text-violet-700">
                  {t("projectMilestone")}: {milestoneName}
                </p>
              ) : null}
              {creatorName(task) ? (
                <div className="flex items-center gap-1 text-[11px] font-medium text-gray-600 dark:text-zinc-300">
                  <UserProfileAvatar
                    name={creatorName(task)}
                    profilePictureUrl={resolveCreatorAvatar(task)}
                    className="h-5 w-5 shrink-0 rounded-full border border-white/70 dark:border-zinc-700"
                    fallbackClassName="bg-slate-200 text-[9px] font-semibold text-slate-700 dark:bg-zinc-700 dark:text-zinc-200"
                  />
                  <p className="truncate min-w-0">
                    Created by: {creatorName(task)}
                  </p>
                </div>
              ) : null}
              <div className="flex flex-wrap items-center gap-2">
                {task.createdAt ? (
                  <span>
                    Created: {formatDate(task.createdAt)}
                  </span>
                ) : null}
                {task.dueDate ? (
                  <span className={cn(overdue && "font-medium text-red-700 dark:text-red-300")}>
                    {t("teamDueDate")}: {formatDate(task.dueDate)}
                  </span>
                ) : null}
                {overdue ? (
                  <span className="inline-flex rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                    {t("teamTaskOverdue")}
                  </span>
                ) : null}
                <span
                  className={cn(
                    "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                    teamPriorityClass(task.priority),
                  )}
                >
                  {task.priority || "medium"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}

function TaskBoardColumn({
  statusKey,
  tasks,
  t,
  resolveAssigneeAvatar,
  resolveCreatorAvatar,
  currentTeamMemberId,
  canManageTasks,
  showProjectLink,
  onComplete,
  onStatusChange,
  onEdit,
  onDelete,
  onSubtasksChange,
  onDropTask,
  deletingId,
  fillHeight,
  activeTaskId,
  extraDeadlineForTask,
}: {
  statusKey: TeamTaskSection;
  tasks: TeamTaskRecord[];
  t: (key: string) => string;
  resolveAssigneeAvatar: (task: TeamTaskRecord) => string | undefined;
  resolveCreatorAvatar: (task: TeamTaskRecord) => string | undefined;
  currentTeamMemberId: string | null;
  canManageTasks: boolean;
  showProjectLink: boolean;
  onComplete: (task: TeamTaskRecord) => void;
  onStatusChange: (task: TeamTaskRecord, status: string) => void;
  onEdit: (task: TeamTaskRecord) => void;
  onDelete: (task: TeamTaskRecord) => void;
  onSubtasksChange?: (task: TeamTaskRecord, subtasks: TeamTaskSubtask[]) => void;
  onDropTask: (taskIdValue: string, nextStatus: TeamTaskSection) => void;
  deletingId: string | null;
  fillHeight?: boolean;
  activeTaskId?: string | null;
  extraDeadlineForTask?: ExtraDeadlineForTask;
}) {
  const [isDragOver, setIsDragOver] = useState(false);

  const isTeamTaskDrag = (event: DragEvent) =>
    Array.from(event.dataTransfer.types).includes(TEAM_TASK_DND_MIME);

  return (
    <div
      className={cn(
        "flex min-w-0 flex-col border-r border-gray-200 last:border-r-0",
        fillHeight ? "min-h-0 md:h-full" : "min-h-[280px]",
        isDragOver && "bg-sky-50/70",
      )}
      onDragEnter={(event) => {
        if (!isTeamTaskDrag(event)) return;
        event.preventDefault();
        setIsDragOver(true);
      }}
      onDragOver={(event) => {
        if (!isTeamTaskDrag(event)) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        setIsDragOver(true);
      }}
      onDragLeave={(event) => {
        if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
        setIsDragOver(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragOver(false);
        const droppedId = event.dataTransfer.getData(TEAM_TASK_DND_MIME);
        if (droppedId) onDropTask(droppedId, statusKey);
      }}
    >
      <div
        className={cn(
          "flex shrink-0 items-center justify-between border-b border-gray-200 bg-gray-50 px-3 py-2.5",
          fillHeight && "sticky top-0 z-10 md:static",
        )}
      >
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-700">
          {teamTaskStatusLabel(statusKey, t)}
        </h3>
        <span className="text-xs tabular-nums text-gray-500">{tasks.length}</span>
      </div>
      <ul
        className={cn(
          "flex flex-1 flex-col gap-2 p-2",
          fillHeight && "md:min-h-0 md:overflow-y-auto md:overscroll-contain",
        )}
      >
        {tasks.length === 0 ? (
          <li className="flex flex-1 items-center justify-center px-2 py-8 text-center text-xs text-gray-400">
            —
          </li>
        ) : (
          tasks.map((task) => (
            <TaskBoardCard
              key={task._id}
              task={task}
              t={t}
              resolveAssigneeAvatar={resolveAssigneeAvatar}
              resolveCreatorAvatar={resolveCreatorAvatar}
              canChangeStatus={canCurrentUserChangeTaskStatus(task, currentTeamMemberId)}
              canManageTask={canManageTasks}
              showProjectLink={showProjectLink}
              onComplete={onComplete}
              onStatusChange={onStatusChange}
              onEdit={onEdit}
              onDelete={onDelete}
              onSubtasksChange={onSubtasksChange}
              deletingId={deletingId}
              active={Boolean(activeTaskId) && taskId(task) === activeTaskId}
              extraDeadline={extraDeadlineForTask?.(task)}
            />
          ))
        )}
      </ul>
    </div>
  );
}

export function TeamTaskCardStack({
  tasks,
  t,
  currentTeamMemberId,
  canManageTasks = false,
  resolveAssigneeAvatar,
  resolveCreatorAvatar,
  showProjectLink = true,
  onComplete,
  onStatusChange,
  onEdit,
  onDelete,
  onSubtasksChange,
  deletingId,
  emptyLabel,
  activeTaskId = null,
  extraDeadlineForTask,
}: {
  tasks: TeamTaskRecord[];
  t: (key: string) => string;
  currentTeamMemberId: string | null;
  canManageTasks?: boolean;
  resolveAssigneeAvatar: (task: TeamTaskRecord) => string | undefined;
  resolveCreatorAvatar: (task: TeamTaskRecord) => string | undefined;
  showProjectLink?: boolean;
  onComplete: (task: TeamTaskRecord) => void;
  onStatusChange: (task: TeamTaskRecord, status: string) => void;
  onEdit: (task: TeamTaskRecord) => void;
  onDelete: (task: TeamTaskRecord) => void;
  onSubtasksChange?: (task: TeamTaskRecord, subtasks: TeamTaskSubtask[]) => void;
  deletingId: string | null;
  emptyLabel: string;
  activeTaskId?: string | null;
  extraDeadlineForTask?: ExtraDeadlineForTask;
}) {
  if (!tasks.length) {
    return <p className="py-4 text-center text-xs text-gray-500">{emptyLabel}</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {tasks.map((task) => (
        <TaskBoardCard
          key={task._id}
          task={task}
          t={t}
          resolveAssigneeAvatar={resolveAssigneeAvatar}
          resolveCreatorAvatar={resolveCreatorAvatar}
          canChangeStatus={canCurrentUserChangeTaskStatus(task, currentTeamMemberId)}
          canManageTask={canManageTasks}
          showProjectLink={showProjectLink}
          onComplete={onComplete}
          onStatusChange={onStatusChange}
          onEdit={onEdit}
          onDelete={onDelete}
          onSubtasksChange={onSubtasksChange}
          deletingId={deletingId}
          active={Boolean(activeTaskId) && taskId(task) === activeTaskId}
          extraDeadline={extraDeadlineForTask?.(task)}
        />
      ))}
    </ul>
  );
}

export function TeamTaskKanbanBoard({
  tasks,
  t,
  currentTeamMemberId,
  canManageTasks = false,
  resolveAssigneeAvatar,
  resolveCreatorAvatar,
  showProjectLink = true,
  onComplete,
  onStatusChange,
  onEdit,
  onDelete,
  onSubtasksChange,
  onDropTask,
  deletingId,
  emptyLabel,
  fillHeight = false,
  activeTaskId = null,
  extraDeadlineForTask,
}: {
  tasks: TeamTaskRecord[];
  t: (key: string) => string;
  currentTeamMemberId: string | null;
  canManageTasks?: boolean;
  resolveAssigneeAvatar: (task: TeamTaskRecord) => string | undefined;
  resolveCreatorAvatar: (task: TeamTaskRecord) => string | undefined;
  showProjectLink?: boolean;
  onComplete: (task: TeamTaskRecord) => void;
  onStatusChange: (task: TeamTaskRecord, status: string) => void;
  onEdit: (task: TeamTaskRecord) => void;
  onDelete: (task: TeamTaskRecord) => void;
  onSubtasksChange?: (task: TeamTaskRecord, subtasks: TeamTaskSubtask[]) => void;
  onDropTask: (taskIdValue: string, nextStatus: TeamTaskSection) => void;
  deletingId: string | null;
  emptyLabel: string;
  /** When true, board fills parent height and only task cards scroll. */
  fillHeight?: boolean;
  activeTaskId?: string | null;
  extraDeadlineForTask?: ExtraDeadlineForTask;
}) {
  const [mobileSection, setMobileSection] = useState<TeamTaskSection>("todo");

  const tasksBySection = useMemo(() => {
    const groups: Record<TeamTaskSection, TeamTaskRecord[]> = {
      todo: [],
      in_progress: [],
      done: [],
    };
    for (const task of tasks) {
      const status = (task.status || "todo") as TeamTaskSection;
      if (groups[status]) groups[status].push(task);
      else groups.todo.push(task);
    }
    return groups;
  }, [tasks]);

  const mobileTasks = tasksBySection[mobileSection];

  useEffect(() => {
    if (!activeTaskId) return;
    const task = tasks.find((row) => taskId(row) === activeTaskId);
    if (!task) return;
    const status = (task.status || "todo") as TeamTaskSection;
    if (status === "todo" || status === "in_progress" || status === "done") {
      setMobileSection(status);
    }
  }, [activeTaskId, tasks]);

  // Always keep To do / In progress / Done headers mounted (including empty + refresh).
  void emptyLabel;

  return (
    <div
      className={cn(
        "border border-gray-200",
        fillHeight && "flex h-full min-h-0 flex-col overflow-hidden",
      )}
    >
      {/* Mobile: one status at a time so cards scroll under fixed tabs */}
      <div className={cn("flex min-h-0 flex-col md:hidden", fillHeight && "h-full")}>
        <div className="flex shrink-0 border-b border-gray-200 bg-gray-50">
          {TEAM_TASK_SECTION_ORDER.map((statusKey) => {
            const active = mobileSection === statusKey;
            return (
              <button
                key={statusKey}
                type="button"
                onClick={() => setMobileSection(statusKey)}
                className={cn(
                  "flex min-w-0 flex-1 flex-col items-center gap-0.5 px-1 py-2.5 text-center transition-colors",
                  active
                    ? "border-b-2 border-sky-500 bg-white text-sky-700"
                    : "border-b-2 border-transparent text-gray-500",
                )}
              >
                <span className="text-[10px] font-semibold uppercase tracking-wide">
                  {teamTaskStatusLabel(statusKey, t)}
                </span>
                <span className="text-[11px] tabular-nums text-gray-500">
                  {tasksBySection[statusKey].length}
                </span>
              </button>
            );
          })}
        </div>
        <ul
          className="min-h-0 flex-1 touch-pan-y space-y-2 overflow-y-auto overscroll-contain p-2"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {mobileTasks.length === 0 ? (
            <li className="flex items-center justify-center px-2 py-12 text-center text-xs text-gray-400">
              —
            </li>
          ) : (
            mobileTasks.map((task) => (
              <TaskBoardCard
                key={task._id}
                task={task}
                t={t}
                resolveAssigneeAvatar={resolveAssigneeAvatar}
                resolveCreatorAvatar={resolveCreatorAvatar}
                canChangeStatus={canCurrentUserChangeTaskStatus(task, currentTeamMemberId)}
                canManageTask={canManageTasks}
                showProjectLink={showProjectLink}
                onComplete={onComplete}
                onStatusChange={onStatusChange}
                onEdit={onEdit}
                onDelete={onDelete}
                onSubtasksChange={onSubtasksChange}
                deletingId={deletingId}
                active={Boolean(activeTaskId) && taskId(task) === activeTaskId}
                extraDeadline={extraDeadlineForTask?.(task)}
              />
            ))
          )}
        </ul>
      </div>

      {/* Desktop: three columns */}
      <div
        className={cn(
          "hidden md:grid md:min-w-0 md:grid-cols-3 md:divide-x md:divide-gray-200",
          fillHeight && "min-h-0 flex-1 md:h-full md:grid-rows-1 md:overflow-hidden",
        )}
      >
        {TEAM_TASK_SECTION_ORDER.map((statusKey) => (
          <TaskBoardColumn
            key={statusKey}
            statusKey={statusKey}
            tasks={tasksBySection[statusKey]}
            t={t}
            resolveAssigneeAvatar={resolveAssigneeAvatar}
            resolveCreatorAvatar={resolveCreatorAvatar}
            currentTeamMemberId={currentTeamMemberId}
            canManageTasks={canManageTasks}
            showProjectLink={showProjectLink}
            onComplete={onComplete}
            onStatusChange={onStatusChange}
            onEdit={onEdit}
            onDelete={onDelete}
            onSubtasksChange={onSubtasksChange}
            onDropTask={onDropTask}
            deletingId={deletingId}
            fillHeight={fillHeight}
            activeTaskId={activeTaskId}
            extraDeadlineForTask={extraDeadlineForTask}
          />
        ))}
      </div>
    </div>
  );
}
