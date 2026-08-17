import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { projectApi, teamMemberApi, teamTaskApi, type TeamMemberRecord, type TeamTaskRecord } from "@/lib/api";
import {
  MILESTONE_STATUSES,
  PROJECT_PRIORITIES,
  PROJECT_TASK_STATUSES,
  memberName,
  milestoneColumnAccent,
  milestoneStatusClass,
  milestoneStatusLabel,
  projectStatusClass,
  projectStatusLabel,
  taskStatusLabel,
  type ProjectMilestoneRecord,
  type ProjectProfilePayload,
} from "@/lib/projectWorkflow";
import { getMonthKey } from "@/lib/teamConstants";
import { useTranslation } from "@/hooks/useTranslation";
import { useToast } from "@/hooks/use-toast";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { ArrowLeft, Flag, Loader2, MoreVertical } from "lucide-react";
import { formatFinanceTableDate } from "@/components/finance/financeTable";
import { AddEntryButton } from "@/components/ui/add-entry-button";
import { HelpTip } from "@/components/ui/help-tip";
import { useWorkspaceMemberAvatars } from "@/hooks/useWorkspaceMemberAvatars";
import { useWorkspace } from "@/hooks/useWorkspace";
import {
  TeamTaskCardStack,
  TeamTaskKanbanBoard,
  canCurrentUserChangeTaskStatus,
  getAssigneeCardColor,
  type TeamTaskSection,
} from "@/components/team/TeamTaskBoard";
import { taskId } from "@/lib/teamTaskRealtime";
import { notifyTaskAssigneeOfAdminChange } from "@/lib/teamTaskNotifications";
import { UserProfileAvatar } from "@/components/profile/UserProfileAvatar";
import { useTheme } from "@/hooks/useTheme";

type DetailTab = "milestones" | "tasks" | "team";

function assigneeIdOf(task: TeamTaskRecord) {
  if (typeof task.assigneeId === "object" && task.assigneeId) {
    return String(task.assigneeId._id);
  }
  return String(task.assigneeId || "");
}

function milestoneIdOf(task: TeamTaskRecord) {
  if (!task.milestoneId) return "";
  if (typeof task.milestoneId === "object") return String(task.milestoneId._id || "");
  return String(task.milestoneId);
}

export function ProjectDetailTab({ projectId }: { projectId: string }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { mode, isWorkspaceAdmin } = useWorkspace();
  const { resolvedTheme } = useTheme();
  const { visibleMembers, overflowMembers } = useWorkspaceMemberAvatars();
  const [profile, setProfile] = useState<ProjectProfilePayload | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMemberRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<DetailTab>("tasks");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [milestoneOpen, setMilestoneOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [editingCompletionNote, setEditingCompletionNote] = useState(false);
  const [editing, setEditing] = useState<TeamTaskRecord | null>(null);
  const [completing, setCompleting] = useState<TeamTaskRecord | null>(null);
  const [completionNote, setCompletionNote] = useState("");

  const [milestoneTitle, setMilestoneTitle] = useState("");
  const [milestoneDueDate, setMilestoneDueDate] = useState("");
  const [milestoneStatus, setMilestoneStatus] = useState("pending");

  const [taskTitle, setTaskTitle] = useState("");
  const [taskAssigneeId, setTaskAssigneeId] = useState("");
  const [taskMilestoneId, setTaskMilestoneId] = useState("");
  const [taskStatus, setTaskStatus] = useState("todo");
  const [taskPriority, setTaskPriority] = useState("medium");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskDescription, setTaskDescription] = useState("");

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const res = await projectApi.getProfile(projectId);
      setProfile((res.data as ProjectProfilePayload) || null);
    } catch {
      toast({ title: t("projectProfileLoadFailed"), variant: "destructive" });
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [projectId, toast, t]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    void (async () => {
      try {
        const res = await teamMemberApi.getAll({ status: "active" });
        setTeamMembers((res.data as TeamMemberRecord[]) || []);
      } catch {
        setTeamMembers([]);
      }
    })();
  }, []);

  const currentTeamMemberId = useMemo(() => {
    const userId = localStorage.getItem("profit-pilot-user-id");
    if (!userId) return null;
    const mine = teamMembers.find((m) => m.linkedUserId && String(m.linkedUserId) === String(userId));
    return mine?._id || null;
  }, [teamMembers]);

  const assigneeAvatarMaps = useMemo(() => {
    const byEmail = new Map<string, string | undefined>();
    const byName = new Map<string, string | undefined>();
    for (const member of [...visibleMembers, ...overflowMembers]) {
      const picture = member.profilePictureUrl || undefined;
      if (member.email) byEmail.set(member.email.trim().toLowerCase(), picture);
      if (member.name) byName.set(member.name.trim().toLowerCase(), picture);
    }
    return { byEmail, byName };
  }, [visibleMembers, overflowMembers]);

  const resolveAssigneeAvatar = useCallback(
    (task: TeamTaskRecord) => {
      if (typeof task.assigneeId !== "object" || !task.assigneeId) return undefined;
      const email = task.assigneeId.email?.trim().toLowerCase();
      if (email && assigneeAvatarMaps.byEmail.has(email)) {
        return assigneeAvatarMaps.byEmail.get(email) || undefined;
      }
      const name = task.assigneeId.name?.trim().toLowerCase();
      if (name && assigneeAvatarMaps.byName.has(name)) {
        return assigneeAvatarMaps.byName.get(name) || undefined;
      }
      return undefined;
    },
    [assigneeAvatarMaps],
  );

  const linkedTeamTasks = profile?.teamTasks || [];

  const tasksByMilestone = useMemo(() => {
    const map = new Map<string, TeamTaskRecord[]>();
    for (const task of linkedTeamTasks) {
      const key = milestoneIdOf(task) || "__none__";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(task);
    }
    return map;
  }, [linkedTeamTasks]);

  const teamFromTasks = useMemo(() => {
    const byId = new Map<
      string,
      {
        id: string;
        name: string;
        email?: string;
        jobTitle?: string;
        todo: number;
        in_progress: number;
        done: number;
        total: number;
        tasks: TeamTaskRecord[];
      }
    >();

    for (const task of linkedTeamTasks) {
      const id = assigneeIdOf(task);
      if (!id) continue;
      const assignee = typeof task.assigneeId === "object" ? task.assigneeId : null;
      const name = memberName(task.assigneeId as TeamMemberRecord) || t("projectUnassigned");
      const row = byId.get(id) || {
        id,
        name,
        email: assignee?.email,
        jobTitle: assignee?.jobTitle,
        todo: 0,
        in_progress: 0,
        done: 0,
        total: 0,
        tasks: [],
      };
      const status = task.status || "todo";
      if (status === "in_progress") row.in_progress += 1;
      else if (status === "done") row.done += 1;
      else row.todo += 1;
      row.total += 1;
      row.tasks.push(task);
      byId.set(id, row);
    }

    return Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [linkedTeamTasks, t]);

  const resolveMemberPicture = useCallback(
    (member: { id: string; name: string; email?: string }) => {
      const email = member.email?.trim().toLowerCase();
      if (email && assigneeAvatarMaps.byEmail.has(email)) {
        return assigneeAvatarMaps.byEmail.get(email) || undefined;
      }
      const name = member.name.trim().toLowerCase();
      if (name && assigneeAvatarMaps.byName.has(name)) {
        return assigneeAvatarMaps.byName.get(name) || undefined;
      }
      return undefined;
    },
    [assigneeAvatarMaps],
  );

  const resetTaskForm = () => {
    setEditing(null);
    setTaskTitle("");
    setTaskDescription("");
    setTaskAssigneeId(teamMembers[0]?._id || "");
    setTaskMilestoneId("");
    setTaskStatus("todo");
    setTaskPriority("medium");
    setTaskDueDate("");
  };

  const openCreateTask = () => {
    resetTaskForm();
    setTaskOpen(true);
  };

  const openEditTask = (task: TeamTaskRecord) => {
    if ((task.status || "todo") === "done") {
      openEditCompletionNote(task);
      return;
    }
    setEditing(task);
    setTaskTitle(task.title);
    setTaskDescription(task.description || "");
    setTaskAssigneeId(assigneeIdOf(task));
    setTaskMilestoneId(milestoneIdOf(task));
    setTaskStatus(task.status || "todo");
    setTaskPriority(task.priority || "medium");
    setTaskDueDate(task.dueDate ? task.dueDate.split("T")[0] : "");
    setTaskOpen(true);
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

  const handleAddMilestone = async () => {
    if (!milestoneTitle.trim()) return;
    setSaving(true);
    try {
      await projectApi.createMilestone(projectId, {
        title: milestoneTitle.trim(),
        dueDate: milestoneDueDate || undefined,
        status: milestoneStatus,
      });
      setMilestoneOpen(false);
      setMilestoneTitle("");
      setMilestoneDueDate("");
      setMilestoneStatus("pending");
      void loadProfile();
    } catch (err) {
      const message = err instanceof Error && err.message ? err.message : t("projectSaveFailed");
      toast({ title: message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTask = async () => {
    if (editing && (editing.status || "todo") === "done") {
      toast({ title: t("teamDoneLockedHint"), variant: "destructive" });
      return;
    }
    if (!taskTitle.trim()) {
      toast({ title: t("teamTitleRequired"), variant: "destructive" });
      return;
    }
    if (!taskAssigneeId) {
      toast({ title: t("teamAssigneeRequired"), variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        title: taskTitle.trim(),
        description: taskDescription.trim(),
        assigneeId: taskAssigneeId,
        priority: taskPriority,
        dueDate: taskDueDate || undefined,
        monthKey: getMonthKey(),
        projectId,
        milestoneId: taskMilestoneId || null,
      };

      if (editing) {
        if (canCurrentUserChangeTaskStatus(editing, currentTeamMemberId)) {
          payload.status = taskStatus;
        }
        await teamTaskApi.update(taskId(editing), payload);
        if (mode === "workspace" && isWorkspaceAdmin) {
          void notifyTaskAssigneeOfAdminChange(editing, "updated");
        }
        toast({ title: t("teamTaskUpdated") });
      } else {
        payload.status = taskStatus;
        await teamTaskApi.create(payload);
        toast({ title: t("teamTaskUpdated") });
      }
      setTaskOpen(false);
      resetTaskForm();
      void loadProfile();
    } catch (err) {
      const message = err instanceof Error && err.message ? err.message : t("projectSaveFailed");
      toast({ title: message, variant: "destructive" });
    } finally {
      setSaving(false);
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
    try {
      await teamTaskApi.update(taskId(task), { status: nextStatus });
      void loadProfile();
    } catch {
      toast({ title: t("teamTaskStatusAssigneeOnly"), variant: "destructive" });
    }
  };

  const handleDropTask = (droppedId: string, nextStatus: TeamTaskSection) => {
    const task = linkedTeamTasks.find((row) => taskId(row) === droppedId);
    if (!task) return;
    if ((task.status || "todo") === nextStatus) return;
    void handleStatusChange(task, nextStatus);
  };

  const handleDeleteTask = async (task: TeamTaskRecord) => {
    const id = taskId(task);
    setDeletingId(id);
    try {
      await teamTaskApi.delete(id);
      if (mode === "workspace" && isWorkspaceAdmin) {
        void notifyTaskAssigneeOfAdminChange(task, "deleted");
      }
      toast({ title: t("teamTaskDeleted") });
      void loadProfile();
    } catch {
      toast({ title: t("teamDeleteFailed"), variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  const handleCompleteConfirm = async () => {
    if (!completing) return;
    setSaving(true);
    try {
      if (editingCompletionNote) {
        await teamTaskApi.update(taskId(completing), {
          completionNote: completionNote.trim(),
        });
        toast({ title: t("teamTaskUpdated") });
      } else {
        await teamTaskApi.complete(taskId(completing), completionNote.trim());
        toast({ title: t("teamTaskCompleted") });
      }
      setCompleteOpen(false);
      setCompleting(null);
      setCompletionNote("");
      setEditingCompletionNote(false);
      void loadProfile();
    } catch {
      toast({ title: t("teamSaveFailed"), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const updateMilestoneStatus = async (milestone: ProjectMilestoneRecord, status: string) => {
    try {
      await projectApi.updateMilestone(projectId, milestone._id, { status });
      void loadProfile();
    } catch {
      toast({ title: t("projectSaveFailed"), variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        {t("loading")}
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-6 text-center">
        <p className="text-sm text-gray-600">{t("projectProfileNotFound")}</p>
        <Button asChild variant="link" className="mt-2">
          <Link to="/projects/all">{t("projectBackToList")}</Link>
        </Button>
      </div>
    );
  }

  const { project, milestones } = profile;
  const tabs: { key: DetailTab; label: string }[] = [
    { key: "milestones", label: t("projectTabMilestones") },
    { key: "tasks", label: t("projectTabTasks") },
    { key: "team", label: t("projectTabTeam") },
  ];

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <div className="space-y-2">
        <Button asChild variant="ghost" size="sm" className="-ml-2 px-2">
          <Link to="/projects/all">
            <ArrowLeft className="mr-1 h-4 w-4" />
            {t("projectBackToList")}
          </Link>
        </Button>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-gray-900">{project.name}</h2>
            <span
              className={cn(
                "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                projectStatusClass(project.status || "planning"),
              )}
            >
              {projectStatusLabel(project.status || "planning", t)}
            </span>
          </div>
          {project.description ? <p className="mt-1 text-sm text-gray-600">{project.description}</p> : null}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-2">
        {tabs.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium",
              tab === item.key ? "bg-sky-100 text-sky-800" : "text-gray-600 hover:bg-gray-100",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "milestones" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-semibold text-gray-900">{t("projectTabMilestones")}</h3>
              <HelpTip text={t("projectMilestonesBoardHint")} />
            </div>
            <AddEntryButton label={t("projectAddMilestone")} onClick={() => setMilestoneOpen(true)} />
          </div>
          {milestones.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">{t("projectNoMilestones")}</p>
          ) : (
            <div className="border border-gray-200">
              <div className="grid grid-cols-1 divide-y divide-gray-200 md:min-w-0 md:grid-cols-3 md:divide-x md:divide-y-0">
                {MILESTONE_STATUSES.map((statusKey) => {
                  const columnMilestones = milestones.filter(
                    (row) => (row.status || "pending") === statusKey,
                  );
                  return (
                    <div
                      key={statusKey}
                      className="flex min-h-[320px] min-w-0 flex-col border-r border-gray-200 last:border-r-0"
                    >
                      <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-3 py-2.5">
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-700">
                          {milestoneStatusLabel(statusKey, t)}
                        </h3>
                        <span className="text-xs tabular-nums text-gray-500">
                          {columnMilestones.length}
                        </span>
                      </div>
                      <ul className="flex flex-1 flex-col gap-2 p-2">
                        {columnMilestones.length === 0 ? (
                          <li className="flex flex-1 items-center justify-center px-2 py-8 text-center text-xs text-gray-400">
                            —
                          </li>
                        ) : (
                          columnMilestones.map((milestone) => {
                            const related = tasksByMilestone.get(milestone._id) || [];
                            const done = related.filter((task) => task.status === "done").length;
                            const pct = related.length
                              ? Math.round((done / related.length) * 100)
                              : 0;
                            const accent = milestoneColumnAccent(milestone.status || "pending");
                            return (
                              <li
                                key={milestone._id}
                                className="rounded border border-violet-200 p-3"
                                style={{ backgroundColor: accent }}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5">
                                      <Flag className="h-3.5 w-3.5 shrink-0 text-violet-700" />
                                      <p className="text-sm font-medium text-gray-900">
                                        {milestone.title}
                                      </p>
                                    </div>
                                    <p className="mt-1 text-xs text-gray-600">
                                      {milestone.dueDate
                                        ? `${t("teamDueDate")}: ${formatFinanceTableDate(milestone.dueDate)}`
                                        : t("projectNoDueDate")}
                                    </p>
                                    <p className="mt-0.5 text-xs text-gray-600">
                                      {t("projectMilestoneTaskProgress")
                                        .replace("{done}", String(done))
                                        .replace("{total}", String(related.length))}
                                    </p>
                                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/70">
                                      <div
                                        className="h-full rounded-full bg-violet-500"
                                        style={{ width: `${pct}%` }}
                                      />
                                    </div>
                                  </div>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                                        <MoreVertical size={14} />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      {MILESTONE_STATUSES.filter(
                                        (value) => value !== (milestone.status || "pending"),
                                      ).map((value) => (
                                        <DropdownMenuItem
                                          key={value}
                                          onClick={() => void updateMilestoneStatus(milestone, value)}
                                        >
                                          {milestoneStatusLabel(value, t)}
                                        </DropdownMenuItem>
                                      ))}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                                <div className="mt-2">
                                  <span
                                    className={cn(
                                      "inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium uppercase",
                                      milestoneStatusClass(milestone.status || "pending"),
                                    )}
                                  >
                                    {milestoneStatusLabel(milestone.status || "pending", t)}
                                  </span>
                                </div>
                                <div className="mt-3">
                                  <TeamTaskCardStack
                                    tasks={related}
                                    t={t}
                                    currentTeamMemberId={currentTeamMemberId}
                                    canManageTasks={mode === "workspace" && isWorkspaceAdmin}
                                    resolveAssigneeAvatar={resolveAssigneeAvatar}
                                    showProjectLink={false}
                                    onComplete={openComplete}
                                    onStatusChange={(task, nextStatus) =>
                                      void handleStatusChange(task, nextStatus)
                                    }
                                    onEdit={openEditTask}
                                    onDelete={(task) => void handleDeleteTask(task)}
                                    deletingId={deletingId}
                                    emptyLabel={t("projectMilestoneNoTasks")}
                                  />
                                </div>
                              </li>
                            );
                          })
                        )}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "tasks" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-gray-500">{t("projectTasksFromTeamHint")}</p>
            <AddEntryButton label={t("projectAddTask")} onClick={openCreateTask} />
          </div>
          <TeamTaskKanbanBoard
            tasks={linkedTeamTasks}
            t={t}
            currentTeamMemberId={currentTeamMemberId}
            canManageTasks={mode === "workspace" && isWorkspaceAdmin}
            resolveAssigneeAvatar={resolveAssigneeAvatar}
            showProjectLink={false}
            onComplete={openComplete}
            onStatusChange={(task, nextStatus) => void handleStatusChange(task, nextStatus)}
            onEdit={openEditTask}
            onDelete={(task) => void handleDeleteTask(task)}
            onDropTask={handleDropTask}
            deletingId={deletingId}
            emptyLabel={t("projectNoTasks")}
          />
        </div>
      )}

      {tab === "team" && (
        <div className="space-y-4">
          <p className="text-xs text-gray-500">{t("projectTeamFromTasksHint")}</p>
          {teamFromTasks.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">{t("projectNoMembersFromTasks")}</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {teamFromTasks.map((member) => {
                const cardColor = getAssigneeCardColor(member.id, resolvedTheme);
                return (
                  <section
                    key={member.id}
                    className="task-assignee-card rounded border p-3"
                    style={{ borderColor: cardColor, backgroundColor: cardColor }}
                  >
                    <div className="flex items-start gap-2">
                      <UserProfileAvatar
                        name={member.name}
                        profilePictureUrl={resolveMemberPicture(member)}
                        className="h-9 w-9 border border-gray-200"
                        fallbackClassName="bg-sky-100 text-[10px] font-semibold text-sky-700"
                      />
                      <div className="min-w-0 flex-1">
                        <Link
                          to={`/hr/people/${member.id}`}
                          className="truncate text-sm font-medium text-gray-900 hover:underline"
                        >
                          {member.name}
                        </Link>
                        {member.jobTitle ? (
                          <p className="truncate text-xs text-gray-600">{member.jobTitle}</p>
                        ) : null}
                        <p className="mt-1 text-xs text-gray-600">
                          {t("projectMemberTaskSummary")
                            .replace("{total}", String(member.total))
                            .replace("{todo}", String(member.todo))
                            .replace("{progress}", String(member.in_progress))
                            .replace("{done}", String(member.done))}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3">
                      <TeamTaskCardStack
                        tasks={member.tasks}
                        t={t}
                        currentTeamMemberId={currentTeamMemberId}
                        canManageTasks={mode === "workspace" && isWorkspaceAdmin}
                        resolveAssigneeAvatar={resolveAssigneeAvatar}
                        showProjectLink={false}
                        onComplete={openComplete}
                        onStatusChange={(task, nextStatus) => void handleStatusChange(task, nextStatus)}
                        onEdit={openEditTask}
                        onDelete={(task) => void handleDeleteTask(task)}
                        deletingId={deletingId}
                        emptyLabel={t("projectNoTasks")}
                      />
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </div>
      )}

      <Dialog open={milestoneOpen} onOpenChange={setMilestoneOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("projectAddMilestone")}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div>
              <Label>{t("projectMilestoneTitle")}</Label>
              <Input value={milestoneTitle} onChange={(e) => setMilestoneTitle(e.target.value)} />
            </div>
            <div>
              <Label>{t("projectTargetEnd")}</Label>
              <Input
                type="date"
                value={milestoneDueDate}
                onChange={(e) => setMilestoneDueDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMilestoneOpen(false)}>
              {t("cancel")}
            </Button>
            <Button onClick={() => void handleAddMilestone()} disabled={saving}>
              {t("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={taskOpen}
        onOpenChange={(open) => {
          setTaskOpen(open);
          if (!open) resetTaskForm();
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? t("teamEditTask") : t("projectAddTask")}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <p className="text-xs text-gray-500">{t("projectAddTaskCreatesTeamTask")}</p>
            <div>
              <Label>{t("projectTaskTitle")}</Label>
              <Input value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} />
            </div>
            <div>
              <Label>{t("description")}</Label>
              <Textarea
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div>
              <Label>{t("projectAssignee")}</Label>
              <Select
                value={taskAssigneeId || "__none__"}
                onValueChange={(v) => setTaskAssigneeId(v === "__none__" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">{t("projectSelectMember")}</SelectItem>
                  {teamMembers.map((m) => (
                    <SelectItem key={m._id} value={m._id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("projectMilestone")}</Label>
              <Select
                value={taskMilestoneId || "__none__"}
                onValueChange={(v) => setTaskMilestoneId(v === "__none__" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">{t("projectUnassignedTasks")}</SelectItem>
                  {milestones.map((m) => (
                    <SelectItem key={m._id} value={m._id}>
                      {m.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t("projectStatus")}</Label>
                <Select
                  value={taskStatus}
                  onValueChange={setTaskStatus}
                  disabled={
                    Boolean(editing) && !canCurrentUserChangeTaskStatus(editing!, currentTeamMemberId)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROJECT_TASK_STATUSES.map((value) => (
                      <SelectItem key={value} value={value}>
                        {taskStatusLabel(value, t)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t("teamPriority")}</Label>
                <Select value={taskPriority} onValueChange={setTaskPriority}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROJECT_PRIORITIES.map((value) => (
                      <SelectItem key={value} value={value}>
                        {value}
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
                value={taskDueDate}
                onChange={(e) => setTaskDueDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTaskOpen(false)}>
              {t("cancel")}
            </Button>
            <Button onClick={() => void handleSaveTask()} disabled={saving}>
              {t("save")}
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCompletionNote ? t("teamEditCompletionNote") : t("teamCompleteTask")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-gray-700">{completing?.title}</p>
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
            <Button onClick={() => void handleCompleteConfirm()} disabled={saving}>
              {editingCompletionNote ? t("save") : t("teamDone")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
