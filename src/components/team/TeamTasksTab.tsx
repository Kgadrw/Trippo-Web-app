import { useCallback, useEffect, useMemo, useState } from "react";
import {
  teamMemberApi,
  teamTaskApi,
  type TeamMemberRecord,
  type TeamTaskRecord,
} from "@/lib/api";
import {
  TEAM_DEPARTMENTS,
  TEAM_PRIORITIES,
  TEAM_TASK_STATUSES,
  formatMonthLabel,
  getMonthKey,
  type TeamDepartment,
} from "@/lib/teamConstants";
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
import { Loader2, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface TeamTasksTabProps {
  department?: TeamDepartment;
}

function taskId(task: TeamTaskRecord) {
  return String(task._id);
}

function assigneeName(task: TeamTaskRecord) {
  if (typeof task.assigneeId === "object" && task.assigneeId?.name) {
    return task.assigneeId.name;
  }
  return "";
}

function formatDate(value?: string) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
}

export function TeamTasksTab({ department }: TeamTasksTabProps) {
  const { t } = useTranslation();
  const { toast } = useToast();

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
    if (!title.trim()) {
      toast({ title: t("teamTitleRequired"), variant: "destructive" });
      return;
    }
    if (!assigneeId) {
      toast({ title: t("teamAssigneeRequired"), variant: "destructive" });
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

      if (editing) {
        await teamTaskApi.update(taskId(editing), payload);
        toast({ title: t("teamTaskUpdated") });
      } else {
        await teamTaskApi.create(payload);
        toast({ title: t("teamTaskCreated") });
      }

      setOpen(false);
      resetForm();
      void loadData();
      window.dispatchEvent(new Event("notifications-should-refresh"));
    } catch {
      toast({ title: t("teamSaveFailed"), variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleComplete = async () => {
    if (!completing) return;
    setIsSaving(true);
    try {
      await teamTaskApi.complete(taskId(completing), completionNote.trim());
      toast({ title: t("teamTaskCompleted") });
      setCompleteOpen(false);
      setCompleting(null);
      setCompletionNote("");
      void loadData();
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
    try {
      await teamTaskApi.update(taskId(task), { status: nextStatus });
      void loadData();
    } catch {
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

  const deptLabel = (dept: string) => {
    const key = `teamDept${dept.charAt(0).toUpperCase()}${dept.slice(1)}` as keyof typeof t;
    return t(key);
  };

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
                {t(`teamStatus${s === "in_progress" ? "InProgress" : s.charAt(0).toUpperCase() + s.slice(1)}`)}
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
      ) : tasks.length === 0 ? (
        <p className="text-sm text-gray-500 py-8">{t("teamNoTasks")}</p>
      ) : (
        <div className="overflow-x-auto border border-gray-200">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="px-3 py-2 w-10">{t("teamDone")}</th>
                <th className="px-3 py-2">{t("teamTaskTitle")}</th>
                <th className="px-3 py-2">{t("teamAssignee")}</th>
                <th className="px-3 py-2">{t("teamStatus")}</th>
                <th className="px-3 py-2">{t("teamPriority")}</th>
                <th className="px-3 py-2">{t("teamDueDate")}</th>
                <th className="px-3 py-2 w-10" />
              </tr>
            </thead>
            <tbody>
              {visibleTasks.map((task) => {
                const isDone = task.status === "done";
                return (
                  <tr key={task._id} className="border-b border-gray-100 hover:bg-gray-50/60">
                    <td className="px-3 py-3 align-top">
                      <Checkbox
                        checked={isDone}
                        disabled={isDone}
                        onCheckedChange={() => {
                          if (!isDone) openComplete(task);
                        }}
                        aria-label={t("teamMarkComplete")}
                      />
                    </td>
                    <td className="px-3 py-3 align-top">
                      <p className={cn("font-medium text-gray-900", isDone && "line-through text-gray-500")}>
                        {task.title}
                      </p>
                      {task.description ? (
                        <p className="text-xs text-gray-500 mt-1">{task.description}</p>
                      ) : null}
                      {task.completionNote ? (
                        <p className="text-xs text-emerald-700 mt-1">{task.completionNote}</p>
                      ) : null}
                    </td>
                    <td className="px-3 py-3 align-top text-gray-700">{assigneeName(task)}</td>
                    <td className="px-3 py-3 align-top">
                      <Select
                        value={task.status || "todo"}
                        onValueChange={(v) => void handleStatusChange(task, v)}
                      >
                        <SelectTrigger className="h-8 w-[130px] bg-white text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TEAM_TASK_STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>
                              {t(`teamStatus${s === "in_progress" ? "InProgress" : s.charAt(0).toUpperCase() + s.slice(1)}`)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-3 py-3 align-top capitalize text-gray-700">{task.priority || "medium"}</td>
                    <td className="px-3 py-3 align-top text-gray-700">{formatDate(task.dueDate)}</td>
                    <td className="px-3 py-3 align-top">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical size={16} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(task)}>
                            <Pencil size={14} className="mr-2" />
                            {t("edit")}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600"
                            disabled={deletingId === taskId(task)}
                            onClick={() => void handleDelete(task)}
                          >
                            <Trash2 size={14} className="mr-2" />
                            {t("delete")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? t("teamEditTask") : t("teamAssignTask")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
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
                <Select
                  value={taskDepartment}
                  onValueChange={(v) => setTaskDepartment(v as TeamDepartment)}
                  disabled={Boolean(department)}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TEAM_DEPARTMENTS.map((d) => (
                      <SelectItem key={d} value={d}>
                        {deptLabel(d)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                        {t(`teamStatus${s === "in_progress" ? "InProgress" : s.charAt(0).toUpperCase() + s.slice(1)}`)}
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t("cancel")}
            </Button>
            <Button onClick={() => void handleSave()} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("save")}
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
