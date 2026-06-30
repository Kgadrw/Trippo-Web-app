import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { projectApi, teamMemberApi, type TeamMemberRecord } from "@/lib/api";
import {
  PROJECT_PRIORITIES,
  PROJECT_STATUSES,
  projectStatusClass,
  projectStatusLabel,
  type ProjectRecord,
} from "@/lib/projectWorkflow";
import { useTranslation } from "@/hooks/useTranslation";
import { useToast } from "@/hooks/use-toast";
import { usePageSearch } from "@/hooks/usePageSearch";
import { filterByPageSearch } from "@/lib/pageSearch";
import { HelpTip } from "@/components/ui/help-tip";
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
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { useDeleteConfirm } from "@/hooks/useDeleteConfirm";
import { filterSelectClass } from "@/lib/fieldStyles";
import { cn } from "@/lib/utils";
import { Loader2, MoreVertical, Pencil, Plus, Trash2 } from "lucide-react";
import {
  FINANCE_TD_CLASS,
  FINANCE_TH_CLASS,
  formatFinanceTableDate,
  FinanceTableLoading,
  FinanceTableShell,
} from "@/components/finance/financeTable";

function leadName(project: ProjectRecord) {
  if (typeof project.leadMemberId === "object" && project.leadMemberId?.name) {
    return project.leadMemberId.name;
  }
  return "—";
}

export function ProjectsListTab() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { query: pageSearchQuery } = usePageSearch();
  const deleteConfirm = useDeleteConfirm<ProjectRecord>();

  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMemberRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ProjectRecord | null>(null);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<string>("planning");
  const [priority, setPriority] = useState<string>("medium");
  const [startDate, setStartDate] = useState("");
  const [targetEndDate, setTargetEndDate] = useState("");
  const [leadMemberId, setLeadMemberId] = useState("");
  const [clientName, setClientName] = useState("");

  const loadProjects = useCallback(async () => {
    setLoading(true);
    try {
      const res = await projectApi.getAll(
        statusFilter !== "all" ? { status: statusFilter } : undefined,
      );
      setProjects(((res.data as ProjectRecord[]) || []).slice());
    } catch {
      setProjects([]);
      toast({ title: t("projectLoadFailed"), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [statusFilter, toast, t]);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    void teamMemberApi.getAll({ status: "active" }).then((res) => {
      setTeamMembers((res.data as TeamMemberRecord[]) || []);
    });
  }, []);

  const filtered = useMemo(
    () =>
      filterByPageSearch(projects, pageSearchQuery, (project) => [
        project.name,
        project.description,
        project.clientName,
        leadName(project),
      ]),
    [projects, pageSearchQuery],
  );

  const resetForm = () => {
    setName("");
    setDescription("");
    setStatus("planning");
    setPriority("medium");
    setStartDate("");
    setTargetEndDate("");
    setLeadMemberId("");
    setClientName("");
    setEditing(null);
  };

  const openCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (project: ProjectRecord) => {
    setEditing(project);
    setName(project.name);
    setDescription(project.description || "");
    setStatus(project.status || "planning");
    setPriority(project.priority || "medium");
    setStartDate(project.startDate ? project.startDate.slice(0, 10) : "");
    setTargetEndDate(project.targetEndDate ? project.targetEndDate.slice(0, 10) : "");
    setLeadMemberId(
      typeof project.leadMemberId === "object" && project.leadMemberId?._id
        ? project.leadMemberId._id
        : typeof project.leadMemberId === "string"
          ? project.leadMemberId
          : "",
    );
    setClientName(project.clientName || "");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast({ title: t("projectNameRequired"), variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        status,
        priority,
        startDate: startDate || undefined,
        targetEndDate: targetEndDate || undefined,
        leadMemberId: leadMemberId || undefined,
        clientName: clientName.trim(),
      };
      if (editing) {
        await projectApi.update(editing._id, payload);
        toast({ title: t("projectUpdated") });
      } else {
        await projectApi.create(payload);
        toast({ title: t("projectCreated") });
      }
      setDialogOpen(false);
      resetForm();
      void loadProjects();
    } catch {
      toast({ title: t("projectSaveFailed"), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    const project = deleteConfirm.takeTarget();
    if (!project) return;
    deleteConfirm.setIsDeleting(true);
    try {
      await projectApi.delete(project._id);
      toast({ title: t("projectDeleted") });
      void loadProjects();
    } catch {
      toast({ title: t("projectSaveFailed"), variant: "destructive" });
    } finally {
      deleteConfirm.setIsDeleting(false);
    }
  };

  const handleDelete = (project: ProjectRecord) => {
    deleteConfirm.requestDelete(project);
  };

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5">
            <h2 className="text-lg font-semibold text-gray-900">{t("projectAllProjects")}</h2>
            <HelpTip text={t("helpProjectList")} />
          </div>
          <p className="text-sm text-gray-500">{t("projectAllProjectsSubtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className={cn(filterSelectClass, "w-[160px]")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("projectAllStatuses")}</SelectItem>
              {PROJECT_STATUSES.map((value) => (
                <SelectItem key={value} value={value}>
                  {projectStatusLabel(value, t)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-1.5 h-4 w-4" />
            {t("projectAdd")}
          </Button>
        </div>
      </div>

      <FinanceTableShell>
        {loading ? (
          <FinanceTableLoading />
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-500">{t("projectEmpty")}</div>
        ) : (
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/80">
                <th className={FINANCE_TH_CLASS}>{t("projectName")}</th>
                <th className={FINANCE_TH_CLASS}>{t("projectStatus")}</th>
                <th className={FINANCE_TH_CLASS}>{t("projectLead")}</th>
                <th className={FINANCE_TH_CLASS}>{t("projectTargetEnd")}</th>
                <th className={FINANCE_TH_CLASS} />
              </tr>
            </thead>
            <tbody>
              {filtered.map((project) => (
                <tr key={project._id} className="border-b border-gray-100">
                  <td className={FINANCE_TD_CLASS}>
                    <Link to={`/projects/${project._id}`} className="font-medium text-sky-700 hover:underline">
                      {project.name}
                    </Link>
                    {project.clientName ? (
                      <p className="text-xs text-gray-500">{project.clientName}</p>
                    ) : null}
                  </td>
                  <td className={FINANCE_TD_CLASS}>
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                        projectStatusClass(project.status || "planning"),
                      )}
                    >
                      {projectStatusLabel(project.status || "planning", t)}
                    </span>
                  </td>
                  <td className={FINANCE_TD_CLASS}>{leadName(project)}</td>
                  <td className={FINANCE_TD_CLASS}>
                    {project.targetEndDate ? formatFinanceTableDate(project.targetEndDate) : "—"}
                  </td>
                  <td className={cn(FINANCE_TD_CLASS, "text-right")}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(project)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          {t("edit")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => void handleDelete(project)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {t("delete")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </FinanceTableShell>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? t("projectEdit") : t("projectAdd")}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div>
              <Label>{t("projectName")}</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label>{t("description")}</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>{t("projectStatus")}</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PROJECT_STATUSES.map((value) => (
                      <SelectItem key={value} value={value}>
                        {projectStatusLabel(value, t)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t("teamPriority")}</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PROJECT_PRIORITIES.map((value) => (
                      <SelectItem key={value} value={value}>
                        {t(`projectPriority${value.charAt(0).toUpperCase()}${value.slice(1)}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>{t("projectStartDate")}</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div>
                <Label>{t("projectTargetEnd")}</Label>
                <Input type="date" value={targetEndDate} onChange={(e) => setTargetEndDate(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>{t("projectLead")}</Label>
              <Select value={leadMemberId || "__none__"} onValueChange={(v) => setLeadMemberId(v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder={t("projectSelectLead")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">{t("projectNoLead")}</SelectItem>
                  {teamMembers.map((member) => (
                    <SelectItem key={member._id} value={member._id}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("projectClient")}</Label>
              <Input value={clientName} onChange={(e) => setClientName(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t("cancel")}
            </Button>
            <Button onClick={() => void handleSave()} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={deleteConfirm.open}
        onOpenChange={deleteConfirm.handleOpenChange}
        title={t("projectDeleteTitle")}
        description={
          deleteConfirm.target
            ? t("projectDeleteBody").replace("{name}", deleteConfirm.target.name)
            : ""
        }
        confirmLabel={t("delete")}
        cancelLabel={t("cancel")}
        onConfirm={() => void handleDeleteConfirm()}
        isDeleting={deleteConfirm.isDeleting}
      />
    </div>
  );
}
