import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  projectApi,
  teamMemberApi,
  teamTaskApi,
  type ProjectRecord,
  type TeamMemberRecord,
  type TeamTaskRecord,
  type TeamTaskSubtask,
} from "@/lib/api";
import {
  TEAM_PRIORITIES,
  TEAM_TASK_STATUSES,
  formatMonthLabel,
  getMonthKey,
  teamPriorityClass,
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
import { ReminderPresetPicker } from "@/components/reminders/ReminderPresetPicker";
import {
  detectReminderPreset,
  offsetsFromPreset,
  reminderOffsetsFromRecord,
  type ReminderPreset,
} from "@/lib/workReminders";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useWorkspaceMemberAvatars } from "@/hooks/useWorkspaceMemberAvatars";
import { useWorkspace } from "@/hooks/useWorkspace";
import { cn } from "@/lib/utils";
import { notifyTaskAssigneeOfAdminChange } from "@/lib/teamTaskNotifications";
import { websocketManager } from "@/lib/websocketManager";
import { matchesRealtimeRecord } from "@/lib/workspaceRealtime";
import { mergeTaskIntoList, mergeTaskRecord, taskId, taskMatchesListFilters, TEAM_TASK_EVENTS } from "@/lib/teamTaskRealtime";
import {
  TeamTaskKanbanBoard,
  TaskSubtaskEditor,
  canCurrentUserChangeTaskStatus,
  emptySubtaskRows,
  serializeTaskSubtasks,
  taskSubtasks,
  teamTaskStatusLabel,
  type TeamTaskSection,
} from "@/components/team/TeamTaskBoard";

interface TeamTasksTabProps {
  department?: TeamDepartment;
}

type CreateTaskRow = {
  key: string;
  title: string;
  description: string;
  subtasks: Array<{ key: string; title: string; done?: boolean }>;
};

function newCreateTaskRow(): CreateTaskRow {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    title: "",
    description: "",
    subtasks: emptySubtaskRows(2),
  };
}

function createRowHeading(index: number, t: (key: string) => string) {
  if (index === 0) return t("teamFirstTask");
  if (index === 1) return t("teamSecondTask");
  if (index === 2) return t("teamThirdTask");
  return t("teamNthTask").replace("{n}", String(index + 1));
}

function initialCreateRows(count = 1): CreateTaskRow[] {
  return Array.from({ length: count }, () => newCreateTaskRow());
}

function linkedProjectIdValue(task: TeamTaskRecord | null | undefined) {
  if (!task?.projectId) return "";
  if (typeof task.projectId === "object") return String(task.projectId._id || "");
  return String(task.projectId);
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

function statusLabel(status: string, t: (key: string) => string) {
  return teamTaskStatusLabel(status, t);
}

export function TeamTasksTab({ department }: TeamTasksTabProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { mode, isWorkspaceAdmin } = useWorkspace();
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
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [tasks, setTasks] = useState<TeamTaskRecord[]>([]);
  const [members, setMembers] = useState<TeamMemberRecord[]>([]);
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const membersLoadedRef = useRef(false);
  const projectsLoadedRef = useRef(false);
  const hasLoadedTasksOnceRef = useRef(false);

  const [open, setOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [editingCompletionNote, setEditingCompletionNote] = useState(false);
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
  const [reminderPreset, setReminderPreset] = useState<ReminderPreset>("default");
  const [customReminderOffsets, setCustomReminderOffsets] = useState<number[]>([]);
  const [taskMonthKey, setTaskMonthKey] = useState(getMonthKey());
  const [linkedProjectId, setLinkedProjectId] = useState("");
  const [completionNote, setCompletionNote] = useState("");
  const [subtaskRows, setSubtaskRows] = useState<
    Array<{ key: string; _id?: string; title: string; done?: boolean }>
  >([]);
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

  const currentTeamMemberId = useMemo(() => {
    const userId = localStorage.getItem("profit-pilot-user-id");
    if (!userId) return null;
    const mine = members.find((m) => m.linkedUserId && String(m.linkedUserId) === String(userId));
    return mine?._id || null;
  }, [members]);

  const loadTasks = useCallback(async () => {
    if (hasLoadedTasksOnceRef.current) setRefreshing(true);
    else setInitialLoading(true);

    try {
      const tasksRes = await teamTaskApi.getAll({
        monthKey,
        department: department || undefined,
      });
      setTasks((incoming) => {
        const loaded = (tasksRes.data as TeamTaskRecord[]) || [];
        const prevById = new Map(incoming.map((row) => [taskId(row), row]));
        return loaded.map((task) => {
          const local = prevById.get(taskId(task));
          return local ? mergeTaskRecord(local, task) : task;
        });
      });
      hasLoadedTasksOnceRef.current = true;
    } catch {
      toast({ title: t("teamLoadFailed"), variant: "destructive" });
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
    }
  }, [monthKey, department, toast, t]);

  const loadMembersAndProjects = useCallback(async () => {
    const jobs: Promise<void>[] = [];

    if (!membersLoadedRef.current) {
      jobs.push(
        teamMemberApi
          .getAll({ status: "active" })
          .then((membersRes) => {
            setMembers((membersRes.data as TeamMemberRecord[]) || []);
            membersLoadedRef.current = true;
          })
          .catch(() => {
            setMembers([]);
          }),
      );
    }

    if (!projectsLoadedRef.current) {
      jobs.push(
        projectApi
          .getAll()
          .then((projectsRes) => {
            setProjects((projectsRes.data as ProjectRecord[]) || []);
            projectsLoadedRef.current = true;
          })
          .catch(() => {
            setProjects([]);
          }),
      );
    }

    if (jobs.length) await Promise.all(jobs);
  }, []);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    void loadMembersAndProjects();
  }, [loadMembersAndProjects]);

  const listFilters = useMemo(
    () => ({
      monthKey,
      department,
      statusFilter,
      assigneeFilter,
      projectFilter,
    }),
    [monthKey, department, statusFilter, assigneeFilter, projectFilter],
  );

  const applyTaskUpdate = useCallback(
    (task: TeamTaskRecord) => {
      // Keep the full month list in memory; client filters decide visibility.
      const matchesMonth =
        (!listFilters.department || task.department === listFilters.department) &&
        (!listFilters.monthKey || task.monthKey === listFilters.monthKey);
      setTasks((prev) => mergeTaskIntoList(prev, task, matchesMonth));
    },
    [listFilters.department, listFilters.monthKey],
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
  const visibleTasks = useMemo(() => {
    const filtered = tasks.filter((task) => taskMatchesListFilters(task, listFilters));
    return filterByPageSearch(filtered, pageSearchQuery, (task) => {
      const assignee =
        typeof task.assigneeId === "object" && task.assigneeId
          ? task.assigneeId.name
          : task.assigneeId;
      return [task.title, task.description, task.status, task.priority, assignee, task.department];
    });
  }, [tasks, listFilters, pageSearchQuery]);

  const hasVisibleTasks = visibleTasks.length > 0;

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setAssigneeId(activeMembers[0]?._id || "");
    setTaskDepartment(department || "general");
    setStatus("todo");
    setPriority("medium");
    setDueDate("");
    setReminderPreset("default");
    setCustomReminderOffsets([]);
    setTaskMonthKey(monthKey);
    setLinkedProjectId("");
    setEditing(null);
    setSubtaskRows([]);
    setCreateRows(initialCreateRows());
  };

  const openCreate = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (task: TeamTaskRecord) => {
    if ((task.status || "todo") === "done") {
      openEditCompletionNote(task);
      return;
    }
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
    const offsets = reminderOffsetsFromRecord(task);
    setReminderPreset(task.dueDate ? detectReminderPreset(offsets) : "none");
    setCustomReminderOffsets(offsets);
    setTaskMonthKey(task.monthKey || monthKey);
    setLinkedProjectId(linkedProjectIdValue(task));
    setSubtaskRows(
      taskSubtasks(task).map((row, index) => ({
        key: String(row._id || `${index}-${row.title}`),
        _id: row._id,
        title: row.title,
        done: Boolean(row.done),
      })),
    );
    setOpen(true);
  };

  const openEditCompletionNote = (task: TeamTaskRecord) => {
    if (!canCurrentUserChangeTaskStatus(task, currentTeamMemberId)) {
      toast({ title: t("teamTaskStatusAssigneeOnly"), variant: "destructive" });
      return;
    }
    setCompleting(task);
    setCompletionNote(task.completionNote || "");
    setEditingCompletionNote(true);
    setCompleteOpen(true);
  };

  const openComplete = (task: TeamTaskRecord) => {
    if (!canCurrentUserChangeTaskStatus(task, currentTeamMemberId)) {
      toast({ title: t("teamTaskStatusAssigneeOnly"), variant: "destructive" });
      return;
    }
    setCompleting(task);
    setCompletionNote(task.completionNote || "");
    setEditingCompletionNote(false);
    setCompleteOpen(true);
  };

  const handleSave = async () => {
    if (!assigneeId) {
      toast({ title: t("teamAssigneeRequired"), variant: "destructive" });
      return;
    }

    if (editing) {
      if ((editing.status || "todo") === "done") {
        toast({ title: t("teamDoneLockedHint"), variant: "destructive" });
        return;
      }
      if (!title.trim()) {
        toast({ title: t("teamTitleRequired"), variant: "destructive" });
        return;
      }

      setIsSaving(true);
      try {
        const canEditStatus = canCurrentUserChangeTaskStatus(editing, currentTeamMemberId);
        const payload: Record<string, unknown> = {
          title: title.trim(),
          description: description.trim(),
          assigneeId,
          department: taskDepartment,
          priority,
          dueDate: dueDate || undefined,
          reminders: dueDate ? offsetsFromPreset(reminderPreset, customReminderOffsets) : [],
          monthKey: taskMonthKey,
          projectId: linkedProjectId || null,
          subtasks: serializeTaskSubtasks(subtaskRows),
        };
        if (canEditStatus) {
          payload.status = status;
        }
        const res = await teamTaskApi.update(taskId(editing), payload);
        applyTaskUpdate((res.data as TeamTaskRecord) || { ...editing, ...payload });
        if (mode === "workspace" && isWorkspaceAdmin) {
          void notifyTaskAssigneeOfAdminChange(editing, "updated");
        }
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
        subtasks: serializeTaskSubtasks(row.subtasks),
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
        reminders: dueDate ? offsetsFromPreset(reminderPreset, customReminderOffsets) : [],
        monthKey: taskMonthKey,
        projectId: linkedProjectId || null,
      };

      const created = await Promise.all(
        rowsToCreate.map((row) =>
          teamTaskApi.create({
            ...shared,
            title: row.title,
            description: row.description || undefined,
            subtasks: row.subtasks,
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

  const patchCreateRow = (
    key: string,
    patch: Partial<Pick<CreateTaskRow, "title" | "description" | "subtasks">>,
  ) => {
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
      if (editingCompletionNote) {
        const res = await teamTaskApi.update(taskId(completing), {
          completionNote: completionNote.trim(),
        });
        applyTaskUpdate(
          (res.data as TeamTaskRecord) || {
            ...completing,
            completionNote: completionNote.trim(),
          },
        );
        toast({ title: t("teamTaskUpdated") });
      } else {
        const res = await teamTaskApi.complete(taskId(completing), completionNote.trim());
        applyTaskUpdate(
          (res.data as TeamTaskRecord) || {
            ...completing,
            status: "done",
            completionNote: completionNote.trim(),
          },
        );
        toast({ title: t("teamTaskCompleted") });
      }
      setCompleteOpen(false);
      setCompleting(null);
      setCompletionNote("");
      setEditingCompletionNote(false);
      window.dispatchEvent(new Event("notifications-should-refresh"));
    } catch {
      toast({ title: t("teamSaveFailed"), variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusChange = async (task: TeamTaskRecord, nextStatus: string) => {
    if (!canCurrentUserChangeTaskStatus(task, currentTeamMemberId)) {
      toast({ title: t("teamTaskStatusAssigneeOnly"), variant: "destructive" });
      return;
    }

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
      toast({ title: t("teamTaskStatusAssigneeOnly"), variant: "destructive" });
    }
  };

  const handleSubtasksChange = async (task: TeamTaskRecord, subtasks: TeamTaskSubtask[]) => {
    if ((task.status || "todo") === "done") {
      toast({ title: t("teamDoneLockedHint"), variant: "destructive" });
      return;
    }
    if (!canCurrentUserChangeTaskStatus(task, currentTeamMemberId)) {
      toast({ title: t("teamSubtaskAssigneeOnly"), variant: "destructive" });
      return;
    }
    const previous = task;
    applyTaskUpdate({ ...task, subtasks });
    try {
      const res = await teamTaskApi.update(taskId(task), { subtasks: serializeTaskSubtasks(subtasks) });
      if (res.data) applyTaskUpdate(res.data as TeamTaskRecord);
    } catch {
      applyTaskUpdate(previous);
      toast({ title: t("teamSaveFailed"), variant: "destructive" });
    }
  };

  const handleDropTask = (droppedId: string, nextStatus: TeamTaskSection) => {
    const task = tasks.find((row) => taskId(row) === droppedId);
    if (!task) return;
    if ((task.status || "todo") === nextStatus) return;
    void handleStatusChange(task, nextStatus);
  };

  const handleDelete = async (task: TeamTaskRecord) => {
    const id = taskId(task);
    setDeletingId(id);
    setTasks((prev) => prev.filter((t) => taskId(t) !== id));
    try {
      await teamTaskApi.delete(id);
      if (mode === "workspace" && isWorkspaceAdmin) {
        void notifyTaskAssigneeOfAdminChange(task, "deleted");
      }
      toast({ title: t("teamTaskDeleted") });
    } catch {
      setTasks((prev) => [...prev, task]);
      toast({ title: t("teamDeleteFailed"), variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  const deptLabel = (dept: string) =>
    formatCategoryLabel(dept, departmentCategories, t, "department");

  return (
    <div
      className={cn(
        "flex min-h-0 flex-col gap-3 overflow-hidden md:gap-4",
        // Fill under the app header; account for main padding + mobile bottom safe area.
        "h-[calc(100dvh-var(--app-header-height,3.5rem)-1.25rem)]",
        "max-md:h-[calc(100dvh-var(--app-header-height,3.5rem)-env(safe-area-inset-bottom,0px)-1rem)]",
      )}
    >
      <div className="shrink-0 space-y-3 md:space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h2 className="truncate text-lg font-semibold text-gray-900">
                {department ? deptLabel(department) : t("teamAllTasks")}
              </h2>
              <HelpTip text={t(department === "finance" ? "helpTeamFinanceTasks" : "helpTeamTasks")} />
            </div>
            <p className="hidden text-sm text-gray-600 sm:block">{t("teamTasksSubtitle")}</p>
          </div>
          <AddEntryButton label={t("teamAssignTask")} onClick={openCreate} />
        </div>

        <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
          <div className="min-w-0 space-y-1">
            <Label htmlFor="team-tasks-month" className="block truncate text-xs font-medium text-gray-600">
              {t("teamMonth")}
            </Label>
            <Select value={monthKey} onValueChange={setMonthKey}>
              <SelectTrigger id="team-tasks-month" className={cn(filterSelectClass, "w-full min-w-0 max-w-full")}>
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

          <div className="min-w-0 space-y-1">
            <Label htmlFor="team-tasks-status" className="block truncate text-xs font-medium text-gray-600">
              {t("teamFilterStatus")}
            </Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger
                id="team-tasks-status"
                className={cn(filterSelectClass, "w-full min-w-0 max-w-full")}
              >
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
          </div>

          <div className="min-w-0 space-y-1">
            <Label htmlFor="team-tasks-member" className="block truncate text-xs font-medium text-gray-600">
              {t("teamFilterMember")}
            </Label>
            <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
              <SelectTrigger
                id="team-tasks-member"
                className={cn(filterSelectClass, "w-full min-w-0 max-w-full")}
              >
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

          <div className="min-w-0 space-y-1">
            <Label htmlFor="team-tasks-project" className="block truncate text-xs font-medium text-gray-600">
              {t("teamFilterProject")}
            </Label>
            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger
                id="team-tasks-project"
                className={cn(filterSelectClass, "w-full min-w-0 max-w-full")}
              >
                <SelectValue placeholder={t("teamFilterProject")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("all")}</SelectItem>
                <SelectItem value="none">{t("teamNoProjectLink")}</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project._id} value={project._id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden">
        {initialLoading ? (
          <div className="flex h-full flex-col overflow-hidden border border-gray-200">
            <div className="flex shrink-0 border-b border-gray-200 bg-gray-50 md:hidden">
              {(["todo", "in_progress", "done"] as const).map((statusKey) => (
                <div
                  key={statusKey}
                  className="flex flex-1 flex-col items-center gap-0.5 px-1 py-2.5 text-center text-gray-500"
                >
                  <span className="text-[10px] font-semibold uppercase tracking-wide">
                    {statusLabel(statusKey, t)}
                  </span>
                  <span className="text-[11px] tabular-nums">0</span>
                </div>
              ))}
            </div>
            <div className="hidden min-h-0 flex-1 md:grid md:grid-cols-3 md:divide-x md:divide-gray-200">
              {(["todo", "in_progress", "done"] as const).map((statusKey) => (
                <div key={statusKey} className="flex min-h-0 flex-col">
                  <div className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-gray-50 px-3 py-2.5">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-700">
                      {statusLabel(statusKey, t)}
                    </h3>
                    <span className="text-xs tabular-nums text-gray-500">0</span>
                  </div>
                  <div className="flex flex-1 items-center justify-center text-gray-400">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-1 items-center justify-center text-gray-400 md:hidden">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          </div>
        ) : (
          <div className={cn("h-full min-h-0", refreshing && "pointer-events-none opacity-60")}>
            <TeamTaskKanbanBoard
              tasks={visibleTasks}
              t={t}
              currentTeamMemberId={currentTeamMemberId}
              canManageTasks={mode === "workspace" && isWorkspaceAdmin}
              resolveAssigneeAvatar={resolveAssigneeAvatar}
              onComplete={openComplete}
              onStatusChange={(task, nextStatus) => void handleStatusChange(task, nextStatus)}
              onEdit={openEdit}
              onDelete={(task) => void handleDelete(task)}
              onSubtasksChange={(task, subtasks) => void handleSubtasksChange(task, subtasks)}
              onDropTask={handleDropTask}
              deletingId={deletingId}
              emptyLabel={
                tasks.length === 0
                  ? t("teamNoTasks")
                  : hasVisibleTasks
                    ? t("teamNoTasks")
                    : "No matching tasks."
              }
              fillHeight
            />
          </div>
        )}
      </div>

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
                            <span
                              className={cn(
                                "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                                teamPriorityClass(p),
                              )}
                            >
                              {p}
                            </span>
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
                  {dueDate ? (
                    <div className="sm:col-span-2 lg:col-span-3">
                      <ReminderPresetPicker
                        preset={reminderPreset}
                        customOffsets={customReminderOffsets}
                        onPresetChange={(preset) => {
                          setReminderPreset(preset);
                          if (preset !== "custom") setCustomReminderOffsets(offsetsFromPreset(preset));
                        }}
                        onCustomChange={(offsets) => {
                          setReminderPreset("custom");
                          setCustomReminderOffsets(offsets);
                        }}
                      />
                    </div>
                  ) : null}
                  <div className="sm:col-span-2 lg:col-span-3">
                    <Label>{t("teamLinkProject")}</Label>
                    <Select
                      value={linkedProjectId || "__none__"}
                      onValueChange={(value) => setLinkedProjectId(value === "__none__" ? "" : value)}
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder={t("teamLinkProjectOptional")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">{t("teamNoProjectLink")}</SelectItem>
                        {projects.map((project) => (
                          <SelectItem key={project._id} value={project._id}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="mt-1 text-xs text-gray-500">{t("teamLinkProjectHint")}</p>
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
                  <div className="space-y-3">
                    {createRows.map((row, index) => (
                      <div key={row.key} className="space-y-2 border border-gray-200 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium text-gray-800">{createRowHeading(index, t)}</p>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0 text-gray-500 hover:text-red-600"
                            disabled={createRows.length <= 1}
                            onClick={() => removeCreateRow(row.key)}
                            aria-label={t("delete")}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            value={row.title}
                            onChange={(e) => patchCreateRow(row.key, { title: e.target.value })}
                            placeholder="Create new website"
                            className="h-9 min-w-0 flex-1 bg-white"
                          />
                          <Input
                            value={row.description}
                            onChange={(e) => patchCreateRow(row.key, { description: e.target.value })}
                            placeholder="Optional details"
                            className="h-9 min-w-0 flex-1 bg-white"
                          />
                        </div>
                        <TaskSubtaskEditor
                          rows={row.subtasks}
                          onChange={(subtasks) => patchCreateRow(row.key, { subtasks })}
                          t={t}
                        />
                      </div>
                    ))}
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
            <TaskSubtaskEditor
              rows={subtaskRows}
              onChange={setSubtaskRows}
              t={t}
              canToggleDone={Boolean(
                editing && canCurrentUserChangeTaskStatus(editing, currentTeamMemberId),
              )}
            />
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
                <Select
                  value={status}
                  onValueChange={(v) => setStatus(v as typeof status)}
                  disabled={
                    !editing || !canCurrentUserChangeTaskStatus(editing, currentTeamMemberId)
                  }
                >
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
                {editing && !canCurrentUserChangeTaskStatus(editing, currentTeamMemberId) ? (
                  <p className="mt-1 text-xs text-gray-500">{t("teamTaskStatusAssigneeOnly")}</p>
                ) : null}
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
                        <span
                          className={cn(
                            "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                            teamPriorityClass(p),
                          )}
                        >
                          {p}
                        </span>
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
            {dueDate ? (
              <ReminderPresetPicker
                preset={reminderPreset}
                customOffsets={customReminderOffsets}
                onPresetChange={(preset) => {
                  setReminderPreset(preset);
                  if (preset !== "custom") setCustomReminderOffsets(offsetsFromPreset(preset));
                }}
                onCustomChange={(offsets) => {
                  setReminderPreset("custom");
                  setCustomReminderOffsets(offsets);
                }}
              />
            ) : null}
            <div>
              <Label>{t("teamLinkProject")}</Label>
              <Select
                value={linkedProjectId || "__none__"}
                onValueChange={(value) => setLinkedProjectId(value === "__none__" ? "" : value)}
              >
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder={t("teamLinkProjectOptional")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">{t("teamNoProjectLink")}</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project._id} value={project._id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-1 text-xs text-gray-500">{t("teamLinkProjectHint")}</p>
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

      <Dialog
        open={completeOpen}
        onOpenChange={(next) => {
          setCompleteOpen(next);
          if (!next) {
            setEditingCompletionNote(false);
            setCompleting(null);
            setCompletionNote("");
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCompletionNote ? t("teamEditCompletionNote") : t("teamCompleteTask")}
            </DialogTitle>
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
            {!editingCompletionNote ? (
              <p className="text-xs text-gray-500">{t("teamCompletionNotifyHint")}</p>
            ) : (
              <p className="text-xs text-gray-500">{t("teamDoneLockedHint")}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompleteOpen(false)}>
              {t("cancel")}
            </Button>
            <Button onClick={() => void handleComplete()} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : editingCompletionNote ? (
                t("save")
              ) : (
                t("teamMarkComplete")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
