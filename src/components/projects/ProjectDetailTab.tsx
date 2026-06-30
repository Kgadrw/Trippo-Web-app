import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { projectApi, teamMemberApi, type TeamMemberRecord } from "@/lib/api";
import {
  MILESTONE_STATUSES,
  PROJECT_MEMBER_ROLES,
  PROJECT_PRIORITIES,
  PROJECT_STATUSES,
  PROJECT_TASK_STATUSES,
  formatWeekLabel,
  memberName,
  milestoneStatusLabel,
  projectStatusClass,
  projectStatusLabel,
  taskStatusLabel,
  type ProjectMemberRecord,
  type ProjectMilestoneRecord,
  type ProjectProfilePayload,
  type ProjectTaskRecord,
  type TimeEntryRecord,
} from "@/lib/projectWorkflow";
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
import { cn } from "@/lib/utils";
import { ArrowLeft, Loader2, Plus, Trash2 } from "lucide-react";
import { formatFinanceTableDate } from "@/components/finance/financeTable";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type DetailTab = "overview" | "milestones" | "tasks" | "team" | "time";

export function ProjectDetailTab({ projectId }: { projectId: string }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [profile, setProfile] = useState<ProjectProfilePayload | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMemberRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<DetailTab>("overview");
  const [saving, setSaving] = useState(false);

  const [milestoneOpen, setMilestoneOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [memberOpen, setMemberOpen] = useState(false);
  const [timeOpen, setTimeOpen] = useState(false);

  const [milestoneTitle, setMilestoneTitle] = useState("");
  const [milestoneDueDate, setMilestoneDueDate] = useState("");
  const [milestoneStatus, setMilestoneStatus] = useState("pending");

  const [taskTitle, setTaskTitle] = useState("");
  const [taskMilestoneId, setTaskMilestoneId] = useState("");
  const [taskAssigneeId, setTaskAssigneeId] = useState("");
  const [taskStatus, setTaskStatus] = useState("todo");
  const [taskPriority, setTaskPriority] = useState("medium");
  const [taskEstimatedHours, setTaskEstimatedHours] = useState("");

  const [memberTeamMemberId, setMemberTeamMemberId] = useState("");
  const [memberRole, setMemberRole] = useState("member");

  const [timeMemberId, setTimeMemberId] = useState("");
  const [timeTaskId, setTimeTaskId] = useState("");
  const [timeDate, setTimeDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [timeHours, setTimeHours] = useState("1");
  const [timeNote, setTimeNote] = useState("");

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
    void teamMemberApi.getAll({ status: "active" }).then((res) => {
      setTeamMembers((res.data as TeamMemberRecord[]) || []);
    });
  }, []);

  const tasksChartData = useMemo(
    () =>
      (profile?.velocity.tasksCompletedWeekly || []).map((row) => ({
        label: formatWeekLabel(row.weekStart),
        value: row.value,
      })),
    [profile],
  );

  const hoursChartData = useMemo(
    () =>
      (profile?.velocity.hoursLoggedWeekly || []).map((row) => ({
        label: formatWeekLabel(row.weekStart),
        value: row.value,
      })),
    [profile],
  );

  const tasksByMilestone = useMemo(() => {
    const map = new Map<string, ProjectTaskRecord[]>();
    for (const task of profile?.tasks || []) {
      const key = task.milestoneId || "__none__";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(task);
    }
    return map;
  }, [profile]);

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
    } catch {
      toast({ title: t("projectSaveFailed"), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleAddTask = async () => {
    if (!taskTitle.trim()) return;
    setSaving(true);
    try {
      await projectApi.createTask(projectId, {
        title: taskTitle.trim(),
        milestoneId: taskMilestoneId || undefined,
        assigneeId: taskAssigneeId || undefined,
        status: taskStatus,
        priority: taskPriority,
        estimatedHours: taskEstimatedHours ? Number(taskEstimatedHours) : undefined,
      });
      setTaskOpen(false);
      setTaskTitle("");
      setTaskMilestoneId("");
      setTaskAssigneeId("");
      setTaskStatus("todo");
      setTaskPriority("medium");
      setTaskEstimatedHours("");
      void loadProfile();
    } catch {
      toast({ title: t("projectSaveFailed"), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleAddMember = async () => {
    if (!memberTeamMemberId) return;
    setSaving(true);
    try {
      await projectApi.addMember(projectId, {
        teamMemberId: memberTeamMemberId,
        role: memberRole,
      });
      setMemberOpen(false);
      setMemberTeamMemberId("");
      setMemberRole("member");
      void loadProfile();
    } catch {
      toast({ title: t("projectMemberAddFailed"), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleAddTime = async () => {
    if (!timeMemberId || !timeHours) return;
    setSaving(true);
    try {
      await projectApi.createTimeEntry(projectId, {
        teamMemberId: timeMemberId,
        projectTaskId: timeTaskId || undefined,
        date: timeDate,
        hours: Number(timeHours),
        note: timeNote.trim(),
      });
      setTimeOpen(false);
      setTimeNote("");
      void loadProfile();
    } catch {
      toast({ title: t("projectSaveFailed"), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const updateTaskStatus = async (task: ProjectTaskRecord, status: string) => {
    try {
      await projectApi.updateTask(projectId, task._id, { status });
      void loadProfile();
    } catch {
      toast({ title: t("projectSaveFailed"), variant: "destructive" });
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

  const removeMember = async (member: ProjectMemberRecord) => {
    try {
      await projectApi.removeMember(projectId, member._id);
      void loadProfile();
    } catch {
      toast({ title: t("projectSaveFailed"), variant: "destructive" });
    }
  };

  const removeTimeEntry = async (entry: TimeEntryRecord) => {
    try {
      await projectApi.deleteTimeEntry(projectId, entry._id);
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

  const { project, milestones, members, timeEntries, progress } = profile;
  const tabs: { key: DetailTab; label: string }[] = [
    { key: "overview", label: t("projectTabOverview") },
    { key: "milestones", label: t("projectTabMilestones") },
    { key: "tasks", label: t("projectTabTasks") },
    { key: "team", label: t("projectTabTeam") },
    { key: "time", label: t("projectTabTime") },
  ];

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <div className="flex flex-wrap items-start gap-3">
        <Button asChild variant="ghost" size="sm" className="px-2">
          <Link to="/projects/all">
            <ArrowLeft className="mr-1 h-4 w-4" />
            {t("projectBackToList")}
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
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

      {tab === "overview" && (
        <div className="space-y-4">
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-gray-500">{t("projectTaskProgress")}</p>
              <p className="mt-2 text-2xl font-semibold text-gray-900">{progress.taskCompletionRate}%</p>
              <p className="text-xs text-gray-500">
                {progress.doneTasks}/{progress.totalTasks} {t("projectTasksDone")}
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-gray-500">{t("projectMilestoneProgress")}</p>
              <p className="mt-2 text-2xl font-semibold text-gray-900">{progress.milestoneCompletionRate}%</p>
              <p className="text-xs text-gray-500">
                {progress.doneMilestones}/{progress.totalMilestones}
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-gray-500">{t("projectHoursLogged")}</p>
              <p className="mt-2 text-2xl font-semibold text-gray-900">{progress.totalHoursLogged}</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-gray-500">{t("projectTeamSize")}</p>
              <p className="mt-2 text-2xl font-semibold text-gray-900">{members.length}</p>
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <h3 className="text-sm font-semibold text-gray-900">{t("projectVelocityTasks")}</h3>
              <div className="mt-3 h-48">
                {tasksChartData.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={tasksChartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="py-8 text-center text-sm text-gray-500">{t("projectNoVelocityData")}</p>
                )}
              </div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <h3 className="text-sm font-semibold text-gray-900">{t("projectVelocityHours")}</h3>
              <div className="mt-3 h-48">
                {hoursChartData.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={hoursChartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="py-8 text-center text-sm text-gray-500">{t("projectNoVelocityData")}</p>
                )}
              </div>
            </div>
          </section>
        </div>
      )}

      {tab === "milestones" && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setMilestoneOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              {t("projectAddMilestone")}
            </Button>
          </div>
          {milestones.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">{t("projectNoMilestones")}</p>
          ) : (
            <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
              {milestones.map((milestone) => (
                <li key={milestone._id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div>
                    <p className="font-medium text-gray-900">{milestone.title}</p>
                    <p className="text-xs text-gray-500">
                      {milestone.dueDate ? formatFinanceTableDate(milestone.dueDate) : t("projectNoDueDate")}
                    </p>
                  </div>
                  <Select
                    value={milestone.status || "pending"}
                    onValueChange={(value) => void updateMilestoneStatus(milestone, value)}
                  >
                    <SelectTrigger className="w-[160px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MILESTONE_STATUSES.map((value) => (
                        <SelectItem key={value} value={value}>
                          {milestoneStatusLabel(value, t)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === "tasks" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setTaskOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              {t("projectAddTask")}
            </Button>
          </div>
          {[...tasksByMilestone.entries()].map(([milestoneKey, tasks]) => {
            const milestone =
              milestoneKey === "__none__"
                ? null
                : milestones.find((row) => row._id === milestoneKey);
            return (
              <section key={milestoneKey} className="rounded-lg border border-gray-200 bg-white">
                <div className="border-b border-gray-100 px-4 py-3">
                  <h3 className="text-sm font-semibold text-gray-900">
                    {milestone?.title || t("projectUnassignedTasks")}
                  </h3>
                </div>
                <ul className="divide-y divide-gray-100">
                  {tasks.map((task) => (
                    <li key={task._id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{task.title}</p>
                        <p className="text-xs text-gray-500">
                          {memberName(task.assigneeId as TeamMemberRecord) || t("projectUnassigned")}
                          {task.estimatedHours ? ` · ${task.estimatedHours}h est.` : ""}
                        </p>
                      </div>
                      <Select
                        value={task.status || "todo"}
                        onValueChange={(value) => void updateTaskStatus(task, value)}
                      >
                        <SelectTrigger className="w-[150px]">
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
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
          {profile.tasks.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">{t("projectNoTasks")}</p>
          ) : null}
        </div>
      )}

      {tab === "team" && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setMemberOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              {t("projectAddMember")}
            </Button>
          </div>
          {members.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">{t("projectNoMembers")}</p>
          ) : (
            <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
              {members.map((member) => (
                <li key={member._id} className="flex items-center justify-between gap-3 p-4">
                  <div>
                    <p className="font-medium text-gray-900">{memberName(member.teamMemberId as TeamMemberRecord)}</p>
                    <p className="text-xs capitalize text-gray-500">{member.role || "member"}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => void removeMember(member)}>
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === "time" && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setTimeOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              {t("projectLogTime")}
            </Button>
          </div>
          {timeEntries.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">{t("projectNoTimeEntries")}</p>
          ) : (
            <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
              {timeEntries.map((entry) => (
                <li key={entry._id} className="flex items-center justify-between gap-3 p-4">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {memberName(entry.teamMemberId as TeamMemberRecord)} · {entry.hours}h
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatFinanceTableDate(entry.date)}
                      {typeof entry.projectTaskId === "object" && entry.projectTaskId?.title
                        ? ` · ${entry.projectTaskId.title}`
                        : ""}
                      {entry.note ? ` · ${entry.note}` : ""}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => void removeTimeEntry(entry)}>
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <Dialog open={milestoneOpen} onOpenChange={setMilestoneOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("projectAddMilestone")}</DialogTitle></DialogHeader>
          <div className="grid gap-3 py-2">
            <div>
              <Label>{t("projectMilestoneTitle")}</Label>
              <Input value={milestoneTitle} onChange={(e) => setMilestoneTitle(e.target.value)} />
            </div>
            <div>
              <Label>{t("projectTargetEnd")}</Label>
              <Input type="date" value={milestoneDueDate} onChange={(e) => setMilestoneDueDate(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMilestoneOpen(false)}>{t("cancel")}</Button>
            <Button onClick={() => void handleAddMilestone()} disabled={saving}>{t("save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={taskOpen} onOpenChange={setTaskOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{t("projectAddTask")}</DialogTitle></DialogHeader>
          <div className="grid gap-3 py-2">
            <div>
              <Label>{t("projectTaskTitle")}</Label>
              <Input value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} />
            </div>
            <div>
              <Label>{t("projectMilestone")}</Label>
              <Select value={taskMilestoneId || "__none__"} onValueChange={(v) => setTaskMilestoneId(v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">{t("projectUnassignedTasks")}</SelectItem>
                  {milestones.map((m) => (
                    <SelectItem key={m._id} value={m._id}>{m.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("projectAssignee")}</Label>
              <Select value={taskAssigneeId || "__none__"} onValueChange={(v) => setTaskAssigneeId(v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">{t("projectUnassigned")}</SelectItem>
                  {teamMembers.map((m) => (
                    <SelectItem key={m._id} value={m._id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t("projectStatus")}</Label>
                <Select value={taskStatus} onValueChange={setTaskStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PROJECT_TASK_STATUSES.map((value) => (
                      <SelectItem key={value} value={value}>{taskStatusLabel(value, t)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t("projectEstimatedHours")}</Label>
                <Input type="number" min="0" step="0.25" value={taskEstimatedHours} onChange={(e) => setTaskEstimatedHours(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTaskOpen(false)}>{t("cancel")}</Button>
            <Button onClick={() => void handleAddTask()} disabled={saving}>{t("save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={memberOpen} onOpenChange={setMemberOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("projectAddMember")}</DialogTitle></DialogHeader>
          <div className="grid gap-3 py-2">
            <div>
              <Label>{t("teamMembers")}</Label>
              <Select value={memberTeamMemberId} onValueChange={setMemberTeamMemberId}>
                <SelectTrigger><SelectValue placeholder={t("projectSelectMember")} /></SelectTrigger>
                <SelectContent>
                  {teamMembers.map((m) => (
                    <SelectItem key={m._id} value={m._id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("projectMemberRole")}</Label>
              <Select value={memberRole} onValueChange={setMemberRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PROJECT_MEMBER_ROLES.map((value) => (
                    <SelectItem key={value} value={value}>{value}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMemberOpen(false)}>{t("cancel")}</Button>
            <Button onClick={() => void handleAddMember()} disabled={saving}>{t("save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={timeOpen} onOpenChange={setTimeOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("projectLogTime")}</DialogTitle></DialogHeader>
          <div className="grid gap-3 py-2">
            <div>
              <Label>{t("teamMembers")}</Label>
              <Select value={timeMemberId} onValueChange={setTimeMemberId}>
                <SelectTrigger><SelectValue placeholder={t("projectSelectMember")} /></SelectTrigger>
                <SelectContent>
                  {teamMembers.map((m) => (
                    <SelectItem key={m._id} value={m._id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("projectTask")}</Label>
              <Select value={timeTaskId || "__none__"} onValueChange={(v) => setTimeTaskId(v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">{t("projectNoTaskLinked")}</SelectItem>
                  {profile.tasks.map((task) => (
                    <SelectItem key={task._id} value={task._id}>{task.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t("date")}</Label>
                <Input type="date" value={timeDate} onChange={(e) => setTimeDate(e.target.value)} />
              </div>
              <div>
                <Label>{t("projectHours")}</Label>
                <Input type="number" min="0.25" step="0.25" value={timeHours} onChange={(e) => setTimeHours(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>{t("projectTimeNote")}</Label>
              <Textarea value={timeNote} onChange={(e) => setTimeNote(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTimeOpen(false)}>{t("cancel")}</Button>
            <Button onClick={() => void handleAddTime()} disabled={saving}>{t("save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
