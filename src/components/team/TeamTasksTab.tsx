import { useCallback, useEffect, useMemo, useState } from "react";
import {
  projectApi,
  teamMemberApi,
  teamTaskApi,
  type ProjectRecord,
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
import { cn } from "@/lib/utils";
import { websocketManager } from "@/lib/websocketManager";
import { matchesRealtimeRecord } from "@/lib/workspaceRealtime";
import {
  mergeTaskIntoList,
  taskId,
  taskMatchesListFilters,
  TEAM_TASK_EVENTS,
} from "@/lib/teamTaskRealtime";
import {
  TeamTaskKanbanBoard,
  canCurrentUserChangeTaskStatus,
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
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
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
  const [reminderPreset, setReminderPreset] = useState<ReminderPreset>("default");
  const [customReminderOffsets, setCustomReminderOffsets] = useState<number[]>([]);
  const [taskMonthKey, setTaskMonthKey] = useState(getMonthKey());
  const [linkedProjectId, setLinkedProjectId] = useState("");
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

  const currentTeamMemberId = useMemo(() => {
    const userId = localStorage.getItem("profit-pilot-user-id");
    if (!userId) return null;
    const mine = members.find((m) => m.linkedUserId && String(m.linkedUserId) === String(userId));
    return mine?._id || null;
  }, [members]);

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

    try {
      const projectsRes = await projectApi.getAll();
      setProjects((projectsRes.data as ProjectRecord[]) || []);
    } catch {
      setProjects([]);
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
    const offsets = reminderOffsetsFromRecord(task);
    setReminderPreset(task.dueDate ? detectReminderPreset(offsets) : "none");
    setCustomReminderOffsets(offsets);
    setTaskMonthKey(task.monthKey || monthKey);
    setLinkedProjectId(linkedProjectIdValue(task));
    setOpen(true);
  };

  const openComplete = (task: TeamTaskRecord) => {
    if (!canCurrentUserChangeTaskStatus(task, currentTeamMemberId)) {
      toast({ title: t("teamTaskStatusAssigneeOnly"), variant: "destructive" });
      return;
    }
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
        };
        if (canEditStatus) {
          payload.status = status;
        }
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

  const handleDropTask = (droppedId: string, nextStatus: TeamTaskSection) => {
    const task = tasks.find((row) => taskId(row) === droppedId);
    if (!task) return;
    if ((task.status || "todo") === nextStatus) return;
    void handleStatusChange(task, nextStatus);
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
          <SelectTrigger className={cn(filterSelectClass, "w-full sm:w-auto sm:min-w-[150px]")}>
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
          <SelectTrigger className={cn(filterSelectClass, "w-full sm:w-auto sm:min-w-[180px]")}>
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
        <TeamTaskKanbanBoard
          tasks={visibleTasks}
          t={t}
          currentTeamMemberId={currentTeamMemberId}
          resolveAssigneeAvatar={resolveAssigneeAvatar}
          onComplete={openComplete}
          onStatusChange={(task, nextStatus) => void handleStatusChange(task, nextStatus)}
          onEdit={openEdit}
          onDelete={(task) => void handleDelete(task)}
          onDropTask={handleDropTask}
          deletingId={deletingId}
          emptyLabel={t("teamNoTasks")}
        />
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
