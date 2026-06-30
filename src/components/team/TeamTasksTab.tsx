import { useCallback, useEffect, useMemo, useState } from "react";
import {
  teamMemberApi,
  teamTaskApi,
  type TeamMemberRecord,
  type TeamTaskRecord,
} from "@/lib/api";
import {
  TEAM_PRIORITIES,
  TEAM_TASK_STATUSES,
  formatMonthLabel,
  getMonthKey,
  type TeamDepartment,
} from "@/lib/teamConstants";
import { CategorySelect } from "@/components/categories/CategorySelect";
import { useWorkspaceCategories } from "@/hooks/useWorkspaceCategories";
import { formatCategoryLabel } from "@/lib/workspaceCategories";
import { filterByPageSearch } from "@/lib/pageSearch";
import { usePageSearch } from "@/hooks/usePageSearch";
import { useTranslation } from "@/hooks/useTranslation";
import { useToast } from "@/hooks/use-toast";
import { AddEntryButton } from "@/components/ui/add-entry-button";
import { filterSelectClass } from "@/lib/fieldStyles";
import { HelpTip } from "@/components/ui/help-tip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Loader2, MoreVertical, Pencil, Plus, Trash2 } from "lucide-react";
import { UserProfileAvatar } from "@/components/profile/UserProfileAvatar";
import { useWorkspaceMemberAvatars } from "@/hooks/useWorkspaceMemberAvatars";
import { cn } from "@/lib/utils";
import { websocketManager } from "@/lib/websocketManager";
import { matchesRealtimeRecord } from "@/lib/workspaceRealtime";
import {
  mergeTaskIntoList,
  taskId,
  taskMatchesListFilters,
  TEAM_TASK_EVENTS,
} from "@/lib/teamTaskRealtime";

interface TeamTasksTabProps {
  department?: TeamDepartment;
}

type CreateTaskRow = {
  key: string;
  title: string;
  description: string;
};

function newCreateTaskRow(): CreateTaskRow {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    title: "",
    description: "",
  };
}

function initialCreateRows(count = 3): CreateTaskRow[] {
  return Array.from({ length: count }, () => newCreateTaskRow());
}

function assigneeName(task: TeamTaskRecord) {
  if (typeof task.assigneeId === "object" && task.assigneeId?.name) {
    return task.assigneeId.name;
  }
  return "";
}

function resolveAssigneeProfilePicture(
  task: TeamTaskRecord,
  avatarByEmail: Map<string, string | undefined>,
  avatarByName: Map<string, string | undefined>,
) {
  if (typeof task.assigneeId !== "object" || !task.assigneeId) return undefined;

  const email = task.assigneeId.email?.trim().toLowerCase();
  if (email && avatarByEmail.has(email)) {
    return avatarByEmail.get(email) || undefined;
  }

  const name = task.assigneeId.name?.trim().toLowerCase();
  if (name && avatarByName.has(name)) {
    return avatarByName.get(name) || undefined;
  }

  return undefined;
}

function statusLabel(
  status: string,
  t: (key: string) => string,
) {
  return t(
    `teamStatus${status === "in_progress" ? "InProgress" : status.charAt(0).toUpperCase() + status.slice(1)}`,
  );
}

const TASK_SECTION_ORDER = ["todo", "in_progress", "done"] as const;

const ASSIGNEE_BORDER_COLORS = [
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

function hashString(input: string) {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function assigneeKey(task: TeamTaskRecord) {
  if (typeof task.assigneeId === "object" && task.assigneeId?._id) {
    return String(task.assigneeId._id);
  }
  if (typeof task.assigneeId === "string") {
    return task.assigneeId;
  }
  return assigneeName(task) || "unknown";
}

function getAssigneeCardColor(key: string) {
  return ASSIGNEE_BORDER_COLORS[hashString(key) % ASSIGNEE_BORDER_COLORS.length];
}

function formatDate(value?: string) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
}

function TaskBoardCard({
  task,
  t,
  assigneeProfilePictureUrl,
  onComplete,
  onStatusChange,
  onEdit,
  onDelete,
  deletingId,
}: {
  task: TeamTaskRecord;
  t: (key: string) => string;
  assigneeProfilePictureUrl?: string;
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
  const cardColor = getAssigneeCardColor(assigneeKey(task));

  return (
    <li
      className="rounded border p-3"
      style={{ borderColor: cardColor, backgroundColor: cardColor }}
    >
      <div className="flex gap-2">
        <Checkbox
          checked={isDone}
          disabled={isDone}
          className="mt-0.5 shrink-0"
          onCheckedChange={() => {
            if (!isDone) onComplete(task);
          }}
          aria-label={t("teamMarkComplete")}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-1">
            <p className={cn("text-sm font-medium text-gray-900", isDone && "line-through text-gray-500")}>
              {task.title}
            </p>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                  <MoreVertical size={14} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {TEAM_TASK_STATUSES.filter((s) => s !== currentStatus).map((s) => (
                  <DropdownMenuItem key={s} onClick={() => onStatusChange(task, s)}>
                    {statusLabel(s, t)}
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
            {task.dueDate ? <p>{t("teamDueDate")}: {formatDate(task.dueDate)}</p> : null}
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
  onComplete,
  onStatusChange,
  onEdit,
  onDelete,
  deletingId,
}: {
  statusKey: (typeof TASK_SECTION_ORDER)[number];
  tasks: TeamTaskRecord[];
  t: (key: string) => string;
  resolveAssigneeAvatar: (task: TeamTaskRecord) => string | undefined;
  onComplete: (task: TeamTaskRecord) => void;
  onStatusChange: (task: TeamTaskRecord, status: string) => void;
  onEdit: (task: TeamTaskRecord) => void;
  onDelete: (task: TeamTaskRecord) => void;
  deletingId: string | null;
}) {
  return (
    <div className="flex min-h-[280px] min-w-0 flex-col border-r border-gray-200 last:border-r-0">
      <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-3 py-2.5">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-700">
          {statusLabel(statusKey, t)}
        </h3>
        <span className="text-xs tabular-nums text-gray-500">{tasks.length}</span>
      </div>
      <ul className="flex flex-1 flex-col gap-2 p-2">
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

export function TeamTasksTab({ department }: TeamTasksTabProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { categories: departmentCategories } = useWorkspaceCategories("department");
  const { visibleMembers, overflowMembers } = useWorkspaceMemberAvatars();

  const assigneeAvatarMaps = useMemo(() => {
    const byEmail = new Map<string, string | undefined>();
    const byName = new Map<string, string | undefined>();

    for (const member of [...visibleMembers, ...overflowMembers]) {
      const picture = member.profilePictureUrl || undefined;
      if (member.email) {
        byEmail.set(member.email.trim().toLowerCase(), picture);
      }
      if (member.name) {
        byName.set(member.name.trim().toLowerCase(), picture);
      }
    }

    return { byEmail, byName };
  }, [visibleMembers, overflowMembers]);

  const resolveAssigneeAvatar = useCallback(
    (task: TeamTaskRecord) =>
      resolveAssigneeProfilePicture(task, assigneeAvatarMaps.byEmail, assigneeAvatarMaps.byName),
    [assigneeAvatarMaps],
  );

  const [monthKey, setMonthKey] = useState(getMonthKey());
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  const [tasks, setTasks] = useState<TeamTaskRecord[]>([]);
  const [members, setMembers] = useState<TeamMemberRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [editing, setEditing] = useState<TeamTaskRecord | null>(null);
  const [completing, setCompleting] = useState<TeamTaskRecord | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [taskDepartment, setTaskDepartment] = useState<TeamDepartment>(department || "general");
  const [status, setStatus] = useState<(typeof TEAM_TASK_STATUSES)[number]>("todo");
  const [priority, setPriority] = useState<(typeof TEAM_PRIORITIES)[number]>("medium");
  const [dueDate, setDueDate] = useState("");
  const [taskMonthKey, setTaskMonthKey] = useState(getMonthKey());
  const [completionNote, setCompletionNote] = useState("");
  const [createRows, setCreateRows] = useState<CreateTaskRow[]>(() => initialCreateRows());

  const monthOptions = useMemo(() => {
    const options: string[] = [];
    const now = new Date();
    for (let i = -2; i <= 4; i += 1) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      options.push(getMonthKey(d));
    }
    return options;
  }, []);

  const activeMembers = useMemo(
    () => members.filter((m) => m.status !== "inactive"),
    [members],
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [tasksRes, membersRes] = await Promise.all([
        teamTaskApi.getAll({
          monthKey,
          department: department || undefined,
          status: statusFilter === "all" ? undefined : statusFilter,
          assigneeId: assigneeFilter === "all" ? undefined : assigneeFilter,
        }),
        teamMemberApi.getAll({ status: "active" }),
      ]);
      setTasks((tasksRes.data as TeamTaskRecord[]) || []);
      setMembers((membersRes.data as TeamMemberRecord[]) || []);
    } catch {
      toast({ title: t("teamLoadFailed"), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [monthKey, department, statusFilter, assigneeFilter, toast, t]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const listFilters = useMemo(
    () => ({
      monthKey,
      department,
      statusFilter,
      assigneeFilter,
    }),
    [monthKey, department, statusFilter, assigneeFilter],
  );

  const applyTaskUpdate = useCallback(
    (task: TeamTaskRecord) => {
      const matches = taskMatchesListFilters(task, listFilters);
      setTasks((prev) => mergeTaskIntoList(prev, task, matches));
    },
    [listFilters],
  );

  useEffect(() => {
    const onTaskChange = (task: TeamTaskRecord) => {
      if (!matchesRealtimeRecord(task)) return;
      applyTaskUpdate(task);
    };

    const onTaskDeleted = (data: { _id: string; workspaceId?: string | null }) => {
      if (!matchesRealtimeRecord(data)) return;
      const id = String(data._id);
      setTasks((prev) => prev.filter((row) => taskId(row) !== id));
    };

    const unsubCreated = websocketManager.subscribe(TEAM_TASK_EVENTS.created, onTaskChange);
    const unsubUpdated = websocketManager.subscribe(TEAM_TASK_EVENTS.updated, onTaskChange);
    const unsubDeleted = websocketManager.subscribe(TEAM_TASK_EVENTS.deleted, onTaskDeleted);

    return () => {
      unsubCreated();
      unsubUpdated();
      unsubDeleted();
    };
  }, [applyTaskUpdate]);

  const { query: pageSearchQuery } = usePageSearch();
  const visibleTasks = useMemo(
    () =>
      filterByPageSearch(tasks, pageSearchQuery, (task) => {
        const assignee =
          typeof task.assigneeId === "object" && task.assigneeId
            ? task.assigneeId.name
            : task.assigneeId;
        return [task.title, task.description, task.status, task.priority, assignee, task.department];
      }),
    [tasks, pageSearchQuery],
  );

  const tasksBySection = useMemo(() => {
    const groups: Record<(typeof TASK_SECTION_ORDER)[number], TeamTaskRecord[]> = {
      todo: [],
      in_progress: [],
      done: [],
    };
    for (const task of visibleTasks) {
      const key = (task.status || "todo") as (typeof TASK_SECTION_ORDER)[number];
      if (groups[key]) {
        groups[key].push(task);
      }
    }
    return groups;
  }, [visibleTasks]);

  const hasVisibleTasks = TASK_SECTION_ORDER.some((key) => tasksBySection[key].length > 0);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setAssigneeId(activeMembers[0]?._id || "");
    setTaskDepartment(department || "general");
    setStatus("todo");
    setPriority("medium");
    setDueDate("");
    setTaskMonthKey(monthKey);
    setEditing(null);
    setCreateRows(initialCreateRows());
  };

  const openCreate = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (task: TeamTaskRecord) => {
    setEditing(task);
    setTitle(task.title);
    setDescription(task.description || "");
    setAssigneeId(
      typeof task.assigneeId === "object" ? task.assigneeId._id : String(task.assigneeId),
    );
    setTaskDepartment((task.department as TeamDepartment) || department || "general");
    setStatus(task.status || "todo");
    setPriority(task.priority || "medium");
    setDueDate(task.dueDate ? task.dueDate.split("T")[0] : "");
    setTaskMonthKey(task.monthKey || monthKey);
    setOpen(true);
  };

  const openComplete = (task: TeamTaskRecord) => {
    setCompleting(task);
    setCompletionNote(task.completionNote || "");
    setCompleteOpen(true);
  };

  const handleSave = async () => {
    if (!assigneeId) {
      toast({ title: t("teamAssigneeRequired"), variant: "destructive" });
      return;
    }

    if (editing) {
      if (!title.trim()) {
        toast({ title: t("teamTitleRequired"), variant: "destructive" });
        return;
      }

      setIsSaving(true);
      try {
        const payload = {
          title: title.trim(),
          description: description.trim(),
          assigneeId,
          department: taskDepartment,
          status,
          priority,
          dueDate: dueDate || undefined,
          monthKey: taskMonthKey,
        };
        const res = await teamTaskApi.update(taskId(editing), payload);
        applyTaskUpdate((res.data as TeamTaskRecord) || { ...editing, ...payload });
        toast({ title: t("teamTaskUpdated") });
        setOpen(false);
        resetForm();
        window.dispatchEvent(new Event("notifications-should-refresh"));
      } catch {
        toast({ title: t("teamSaveFailed"), variant: "destructive" });
      } finally {
        setIsSaving(false);
      }
      return;
    }

    const rowsToCreate = createRows
      .map((row) => ({
        title: row.title.trim(),
        description: row.description.trim(),
      }))
      .filter((row) => row.title);

    if (rowsToCreate.length === 0) {
      toast({ title: t("teamTitleRequired"), variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      const shared = {
        assigneeId,
        department: taskDepartment,
        status,
        priority,
        dueDate: dueDate || undefined,
        monthKey: taskMonthKey,
      };

      const created = await Promise.all(
        rowsToCreate.map((row) =>
          teamTaskApi.create({
            ...shared,
            title: row.title,
            description: row.description || undefined,
          }),
        ),
      );

      for (const res of created) {
        if (res.data) applyTaskUpdate(res.data as TeamTaskRecord);
      }

      toast({
        title:
          rowsToCreate.length === 1
            ? t("teamTaskCreated")
            : `${rowsToCreate.length} tasks created`,
      });
      setOpen(false);
      resetForm();
      window.dispatchEvent(new Event("notifications-should-refresh"));
    } catch {
      toast({ title: t("teamSaveFailed"), variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const patchCreateRow = (key: string, patch: Partial<Pick<CreateTaskRow, "title" | "description">>) => {
    setCreateRows((prev) =>
      prev.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
  };

  const addCreateRow = () => {
    setCreateRows((prev) => [...prev, newCreateTaskRow()]);
  };

  const removeCreateRow = (key: string) => {
    setCreateRows((prev) => (prev.length <= 1 ? prev : prev.filter((row) => row.key !== key)));
  };

  const handleComplete = async () => {
    if (!completing) return;
    setIsSaving(true);
    try {
      const res = await teamTaskApi.complete(taskId(completing), completionNote.trim());
      applyTaskUpdate((res.data as TeamTaskRecord) || { ...completing, status: "done", completionNote: completionNote.trim() });
      toast({ title: t("teamTaskCompleted") });
      setCompleteOpen(false);
      setCompleting(null);
      setCompletionNote("");
      window.dispatchEvent(new Event("notifications-should-refresh"));
    } catch {
      toast({ title: t("teamSaveFailed"), variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusChange = async (task: TeamTaskRecord, nextStatus: string) => {
    if (nextStatus === "done") {
      openComplete(task);
      return;
    }

    const previous = task;
    const optimistic: TeamTaskRecord = {
      ...task,
      status: nextStatus as TeamTaskRecord["status"],
    };
    applyTaskUpdate(optimistic);

    try {
      const res = await teamTaskApi.update(taskId(task), { status: nextStatus });
      if (res.data) {
        applyTaskUpdate(res.data as TeamTaskRecord);
      }
    } catch {
      applyTaskUpdate(previous);
      toast({ title: t("teamSaveFailed"), variant: "destructive" });
    }
  };

  const handleDelete = async (task: TeamTaskRecord) => {
    const id = taskId(task);
    setTasks((prev) => prev.filter((t) => taskId(t) !== id));
    try {
      await teamTaskApi.delete(id);
      toast({ title: t("teamTaskDeleted") });
    } catch {
      setTasks((prev) => [...prev, task]);
      toast({ title: t("teamDeleteFailed"), variant: "destructive" });
    }
  };

  const deptLabel = (dept: string) =>
    formatCategoryLabel(dept, departmentCategories, t, "department");

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5">
            <h2 className="text-lg font-semibold text-gray-900">
              {department ? deptLabel(department) : t("teamAllTasks")}
            </h2>
            <HelpTip text={t(department === "finance" ? "helpTeamFinanceTasks" : "helpTeamTasks")} />
          </div>
          <p className="text-sm text-gray-600">{t("teamTasksSubtitle")}</p>
        </div>
        <AddEntryButton label={t("teamAssignTask")} onClick={openCreate} />
      </div>

      <div className="flex flex-wrap gap-3">
        <Select value={monthKey} onValueChange={setMonthKey}>
          <SelectTrigger className={filterSelectClass}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {monthOptions.map((key) => (
              <SelectItem key={key} value={key}>
                {formatMonthLabel(key)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className={cn(filterSelectClass, "min-w-[150px]")}>
            <SelectValue placeholder={t("teamFilterStatus")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("all")}</SelectItem>
            {TEAM_TASK_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {statusLabel(s, t)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
          <SelectTrigger className={cn(filterSelectClass, "min-w-[180px]")}>
            <SelectValue placeholder={t("teamFilterMember")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("all")}</SelectItem>
            {activeMembers.map((m) => (
              <SelectItem key={m._id} value={m._id}>
                {m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-500">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          {t("loading")}
        </div>
      ) : !hasVisibleTasks ? (
        <p className="text-sm text-gray-500 py-8">
          {tasks.length === 0 ? t("teamNoTasks") : "No matching tasks."}
        </p>
      ) : (
        <div className="overflow-x-auto border border-gray-200">
          <div className="grid min-w-[720px] grid-cols-3">
            {TASK_SECTION_ORDER.map((statusKey) => (
              <TaskBoardColumn
                key={statusKey}
                statusKey={statusKey}
                tasks={tasksBySection[statusKey]}
                t={t}
                resolveAssigneeAvatar={resolveAssigneeAvatar}
                onComplete={openComplete}
                onStatusChange={(task, nextStatus) => void handleStatusChange(task, nextStatus)}
                onEdit={openEdit}
                onDelete={(task) => void handleDelete(task)}
                deletingId={deletingId}
              />
            ))}
          </div>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className={cn(editing ? "max-w-lg" : "max-w-3xl max-h-[90vh] overflow-y-auto")}>
          <DialogHeader>
            <DialogTitle>{editing ? t("teamEditTask") : t("teamAssignTask")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {!editing ? (
              <>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <Label>{t("teamAssignee")}</Label>
                    <Select value={assigneeId} onValueChange={setAssigneeId}>
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder={t("teamSelectMember")} />
                      </SelectTrigger>
                      <SelectContent>
                        {activeMembers.map((m) => (
                          <SelectItem key={m._id} value={m._id}>
                            {m.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>{t("teamDepartment")}</Label>
                    <CategorySelect
                      type="department"
                      value={taskDepartment}
                      onValueChange={setTaskDepartment}
                      disabled={Boolean(department)}
                    />
                  </div>
                  <div>
                    <Label>{t("teamStatus")}</Label>
                    <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
                      <SelectTrigger className="bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TEAM_TASK_STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {statusLabel(s, t)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>{t("teamPriority")}</Label>
                    <Select value={priority} onValueChange={(v) => setPriority(v as typeof priority)}>
                      <SelectTrigger className="bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TEAM_PRIORITIES.map((p) => (
                          <SelectItem key={p} value={p}>
                            {p}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>{t("teamMonth")}</Label>
                    <Select value={taskMonthKey} onValueChange={setTaskMonthKey}>
                      <SelectTrigger className={filterSelectClass}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {monthOptions.map((key) => (
                          <SelectItem key={key} value={key}>
                            {formatMonthLabel(key)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>{t("teamDueDate")}</Label>
                    <Input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label>Tasks</Label>
                    <Button type="button" variant="outline" size="sm" className="h-8 gap-1" onClick={addCreateRow}>
                      <Plus size={14} />
                      Add row
                    </Button>
                  </div>
                  <div className="overflow-x-auto border border-gray-200">
                    <table className="w-full min-w-[520px] text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                          <th className="px-3 py-2 w-[38%]">{t("teamTaskTitle")}</th>
                          <th className="px-3 py-2">{t("description")}</th>
                          <th className="px-3 py-2 w-10" />
                        </tr>
                      </thead>
                      <tbody>
                        {createRows.map((row) => (
                          <tr key={row.key} className="border-b border-gray-100 last:border-b-0">
                            <td className="px-3 py-2 align-top">
                              <Input
                                value={row.title}
                                onChange={(e) => patchCreateRow(row.key, { title: e.target.value })}
                                placeholder="Create new website"
                                className="h-9 bg-white"
                              />
                            </td>
                            <td className="px-3 py-2 align-top">
                              <Input
                                value={row.description}
                                onChange={(e) => patchCreateRow(row.key, { description: e.target.value })}
                                placeholder="Optional details"
                                className="h-9 bg-white"
                              />
                            </td>
                            <td className="px-3 py-2 align-top">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-gray-500 hover:text-red-600"
                                disabled={createRows.length <= 1}
                                onClick={() => removeCreateRow(row.key)}
                                aria-label={t("delete")}
                              >
                                <Trash2 size={14} />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <>
            <div>
              <Label>{t("teamTaskTitle")}</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div>
              <Label>{t("description")}</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>{t("teamAssignee")}</Label>
                <Select value={assigneeId} onValueChange={setAssigneeId}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder={t("teamSelectMember")} />
                  </SelectTrigger>
                  <SelectContent>
                    {activeMembers.map((m) => (
                      <SelectItem key={m._id} value={m._id}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t("teamDepartment")}</Label>
                <CategorySelect
                  type="department"
                  value={taskDepartment}
                  onValueChange={setTaskDepartment}
                  disabled={Boolean(department)}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label>{t("teamStatus")}</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TEAM_TASK_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {statusLabel(s, t)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t("teamPriority")}</Label>
                <Select value={priority} onValueChange={(v) => setPriority(v as typeof priority)}>
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TEAM_PRIORITIES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t("teamMonth")}</Label>
                <Select value={taskMonthKey} onValueChange={setTaskMonthKey}>
                  <SelectTrigger className={filterSelectClass}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {monthOptions.map((key) => (
                      <SelectItem key={key} value={key}>
                        {formatMonthLabel(key)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>{t("teamDueDate")}</Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t("cancel")}
            </Button>
            <Button onClick={() => void handleSave()} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : editing ? (
                t("save")
              ) : (
                "Create tasks"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={completeOpen} onOpenChange={setCompleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("teamCompleteTask")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-gray-600">{completing?.title}</p>
            <div>
              <Label>{t("teamCompletionNote")}</Label>
              <Textarea
                value={completionNote}
                onChange={(e) => setCompletionNote(e.target.value)}
                placeholder={t("teamCompletionNotePlaceholder")}
                rows={3}
              />
            </div>
            <p className="text-xs text-gray-500">{t("teamCompletionNotifyHint")}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompleteOpen(false)}>
              {t("cancel")}
            </Button>
            <Button onClick={() => void handleComplete()} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("teamMarkComplete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
