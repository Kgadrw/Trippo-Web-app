import { useEffect, useMemo, useState, type DragEvent } from "react";
import type { TeamTaskRecord } from "@/lib/api";
import { TEAM_TASK_STATUSES } from "@/lib/teamConstants";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserProfileAvatar } from "@/components/profile/UserProfileAvatar";
import { cn } from "@/lib/utils";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import { taskId } from "@/lib/teamTaskRealtime";
import { useTheme } from "@/hooks/useTheme";

export const TEAM_TASK_SECTION_ORDER = ["todo", "in_progress", "done"] as const;
export type TeamTaskSection = (typeof TEAM_TASK_SECTION_ORDER)[number];

const TEAM_TASK_DND_MIME = "application/x-trippo-team-task";

const ASSIGNEE_COLORS_LIGHT = [
  "#bae6fd",
  "#a7f3d0",
  "#fde68a",
  "#ddd6fe",
  "#fbcfe8",
  "#99f6e4",
  "#fed7aa",
  "#c7d2fe",
  "#d9f99d",
  "#a5f3fc",
  "#fecdd3",
  "#e9d5ff",
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

export function assigneeName(task: TeamTaskRecord) {
  if (typeof task.assigneeId === "object" && task.assigneeId?.name) {
    return task.assigneeId.name;
  }
  return "";
}

export function assigneeKey(task: TeamTaskRecord) {
  if (typeof task.assigneeId === "object" && task.assigneeId?._id) {
    return String(task.assigneeId._id);
  }
  if (typeof task.assigneeId === "string") {
    return task.assigneeId;
  }
  return assigneeName(task) || "unknown";
}

export function canCurrentUserChangeTaskStatus(
  task: TeamTaskRecord,
  currentTeamMemberId: string | null,
) {
  if (!currentTeamMemberId) return false;
  return assigneeKey(task) === currentTeamMemberId;
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

export function teamTaskStatusLabel(status: string, t: (key: string) => string) {
  return t(
    `teamStatus${status === "in_progress" ? "InProgress" : status.charAt(0).toUpperCase() + status.slice(1)}`,
  );
}

function formatDate(value?: string) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
}

function TaskBoardCard({
  task,
  t,
  assigneeProfilePictureUrl,
  canChangeStatus,
  showProjectLink,
  onComplete,
  onStatusChange,
  onEdit,
  onDelete,
  deletingId,
}: {
  task: TeamTaskRecord;
  t: (key: string) => string;
  assigneeProfilePictureUrl?: string;
  canChangeStatus: boolean;
  showProjectLink: boolean;
  onComplete: (task: TeamTaskRecord) => void;
  onStatusChange: (task: TeamTaskRecord, status: string) => void;
  onEdit: (task: TeamTaskRecord) => void;
  onDelete: (task: TeamTaskRecord) => void;
  deletingId: string | null;
}) {
  const isDone = task.status === "done";
  const id = taskId(task);
  const currentStatus = task.status || "todo";
  const name = assigneeName(task);
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

  return (
    <li
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
        "task-assignee-card rounded border p-3",
        allowDrag && "cursor-grab active:cursor-grabbing",
        isDragging && "opacity-50",
      )}
      style={{ borderColor: cardColor, backgroundColor: cardColor }}
    >
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
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-1">
            <p className={cn("text-sm font-medium text-gray-900", isDone && "line-through text-gray-500")}>
              {task.title}
            </p>
            {canChangeStatus ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                    <MoreVertical size={14} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {TEAM_TASK_STATUSES.filter((s) => s !== currentStatus).map((s) => (
                    <DropdownMenuItem key={s} onClick={() => onStatusChange(task, s)}>
                      {teamTaskStatusLabel(s, t)}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuItem onClick={() => onEdit(task)}>
                    <Pencil size={14} className="mr-2" />
                    {t("edit")}
                  </DropdownMenuItem>
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
          {task.description ? (
            <p className={cn("mt-1 text-xs text-gray-500", isDone && "line-through")}>{task.description}</p>
          ) : null}
          {task.completionNote ? (
            <p className="mt-1 text-xs text-emerald-700">{task.completionNote}</p>
          ) : null}
          <div className="mt-2 space-y-1 text-xs text-gray-500">
            {name ? (
              <div className="flex items-center gap-2">
                <UserProfileAvatar
                  name={name}
                  profilePictureUrl={assigneeProfilePictureUrl}
                  className="h-6 w-6 border border-gray-200"
                  fallbackClassName="bg-sky-100 text-[9px] font-semibold text-sky-700"
                />
                <p className="truncate font-medium text-gray-700">{name}</p>
              </div>
            ) : null}
            {showProjectLink && linkedProjectName(task) ? (
              <p className="truncate text-sky-700">
                {t("teamLinkedProject")}: {linkedProjectName(task)}
              </p>
            ) : null}
            {milestoneName ? (
              <p className="truncate text-violet-700">
                {t("projectMilestone")}: {milestoneName}
              </p>
            ) : null}
            {task.dueDate ? (
              <p>
                {t("teamDueDate")}: {formatDate(task.dueDate)}
              </p>
            ) : null}
            <p className="capitalize">{task.priority || "medium"}</p>
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
  currentTeamMemberId,
  showProjectLink,
  onComplete,
  onStatusChange,
  onEdit,
  onDelete,
  onDropTask,
  deletingId,
  fillHeight,
}: {
  statusKey: TeamTaskSection;
  tasks: TeamTaskRecord[];
  t: (key: string) => string;
  resolveAssigneeAvatar: (task: TeamTaskRecord) => string | undefined;
  currentTeamMemberId: string | null;
  showProjectLink: boolean;
  onComplete: (task: TeamTaskRecord) => void;
  onStatusChange: (task: TeamTaskRecord, status: string) => void;
  onEdit: (task: TeamTaskRecord) => void;
  onDelete: (task: TeamTaskRecord) => void;
  onDropTask: (taskIdValue: string, nextStatus: TeamTaskSection) => void;
  deletingId: string | null;
  fillHeight?: boolean;
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
              assigneeProfilePictureUrl={resolveAssigneeAvatar(task)}
              canChangeStatus={canCurrentUserChangeTaskStatus(task, currentTeamMemberId)}
              showProjectLink={showProjectLink}
              onComplete={onComplete}
              onStatusChange={onStatusChange}
              onEdit={onEdit}
              onDelete={onDelete}
              deletingId={deletingId}
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
  resolveAssigneeAvatar,
  showProjectLink = true,
  onComplete,
  onStatusChange,
  onEdit,
  onDelete,
  deletingId,
  emptyLabel,
}: {
  tasks: TeamTaskRecord[];
  t: (key: string) => string;
  currentTeamMemberId: string | null;
  resolveAssigneeAvatar: (task: TeamTaskRecord) => string | undefined;
  showProjectLink?: boolean;
  onComplete: (task: TeamTaskRecord) => void;
  onStatusChange: (task: TeamTaskRecord, status: string) => void;
  onEdit: (task: TeamTaskRecord) => void;
  onDelete: (task: TeamTaskRecord) => void;
  deletingId: string | null;
  emptyLabel: string;
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
          assigneeProfilePictureUrl={resolveAssigneeAvatar(task)}
          canChangeStatus={canCurrentUserChangeTaskStatus(task, currentTeamMemberId)}
          showProjectLink={showProjectLink}
          onComplete={onComplete}
          onStatusChange={onStatusChange}
          onEdit={onEdit}
          onDelete={onDelete}
          deletingId={deletingId}
        />
      ))}
    </ul>
  );
}

export function TeamTaskKanbanBoard({
  tasks,
  t,
  currentTeamMemberId,
  resolveAssigneeAvatar,
  showProjectLink = true,
  onComplete,
  onStatusChange,
  onEdit,
  onDelete,
  onDropTask,
  deletingId,
  emptyLabel,
  fillHeight = false,
}: {
  tasks: TeamTaskRecord[];
  t: (key: string) => string;
  currentTeamMemberId: string | null;
  resolveAssigneeAvatar: (task: TeamTaskRecord) => string | undefined;
  showProjectLink?: boolean;
  onComplete: (task: TeamTaskRecord) => void;
  onStatusChange: (task: TeamTaskRecord, status: string) => void;
  onEdit: (task: TeamTaskRecord) => void;
  onDelete: (task: TeamTaskRecord) => void;
  onDropTask: (taskIdValue: string, nextStatus: TeamTaskSection) => void;
  deletingId: string | null;
  emptyLabel: string;
  /** When true, board fills parent height and only task cards scroll. */
  fillHeight?: boolean;
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
                assigneeProfilePictureUrl={resolveAssigneeAvatar(task)}
                canChangeStatus={canCurrentUserChangeTaskStatus(task, currentTeamMemberId)}
                showProjectLink={showProjectLink}
                onComplete={onComplete}
                onStatusChange={onStatusChange}
                onEdit={onEdit}
                onDelete={onDelete}
                deletingId={deletingId}
              />
            ))
          )}
        </ul>
      </div>

      {/* Desktop: three columns */}
      <div
        className={cn(
          "hidden md:grid md:min-w-0 md:grid-cols-3 md:divide-x md:divide-gray-200",
          fillHeight && "min-h-0 flex-1 md:h-full md:overflow-hidden",
        )}
      >
        {TEAM_TASK_SECTION_ORDER.map((statusKey) => (
          <TaskBoardColumn
            key={statusKey}
            statusKey={statusKey}
            tasks={tasksBySection[statusKey]}
            t={t}
            resolveAssigneeAvatar={resolveAssigneeAvatar}
            currentTeamMemberId={currentTeamMemberId}
            showProjectLink={showProjectLink}
            onComplete={onComplete}
            onStatusChange={onStatusChange}
            onEdit={onEdit}
            onDelete={onDelete}
            onDropTask={onDropTask}
            deletingId={deletingId}
            fillHeight={fillHeight}
          />
        ))}
      </div>
    </div>
  );
}
