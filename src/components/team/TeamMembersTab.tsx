import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { filterByPageSearch } from "@/lib/pageSearch";
import { usePageSearch } from "@/hooks/usePageSearch";
import { Link } from "react-router-dom";
import { useApi } from "@/hooks/useApi";
import { teamMemberApi, type TeamMemberRecord } from "@/lib/api";
import { type TeamDepartment } from "@/lib/teamConstants";
import { EMPLOYMENT_TYPES, employmentTypeLabel, memberId } from "@/lib/hrProfile";
import { useWorkspaceMemberAvatars } from "@/hooks/useWorkspaceMemberAvatars";
import { useWorkspace } from "@/hooks/useWorkspace";
import { CategorySelect } from "@/components/categories/CategorySelect";
import { useWorkspaceCategories } from "@/hooks/useWorkspaceCategories";
import { formatCategoryLabel } from "@/lib/workspaceCategories";
import {
  buildPayrollImportRows,
  normalizeMemberName,
} from "@/lib/teamPayrollImport";
import { useTranslation } from "@/hooks/useTranslation";
import { useToast } from "@/hooks/use-toast";
import { AddEntryButton } from "@/components/ui/add-entry-button";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { DesktopDataTable, MobileDataList, MobileListCard } from "@/components/ui/mobile-list-card";
import { Loader2, MoreVertical, Pencil, RefreshCw, Trash2, Users } from "lucide-react";
import { HelpTip } from "@/components/ui/help-tip";
import { UserProfileAvatar } from "@/components/profile/UserProfileAvatar";

interface PayrollEntryLike {
  employeeName: string;
}

export function TeamMembersTab() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { mode, activeWorkspace } = useWorkspace();
  const { categories: departmentCategories } = useWorkspaceCategories("department");
  const { members: workspaceMembers } = useWorkspaceMemberAvatars();
  const avatarByUserId = useMemo(() => {
    const map = new Map<string, string | undefined>();
    for (const member of workspaceMembers) {
      map.set(String(member.userId), member.profilePictureUrl || undefined);
    }
    return map;
  }, [workspaceMembers]);
  const avatarByEmail = useMemo(() => {
    const map = new Map<string, string | undefined>();
    for (const member of workspaceMembers) {
      if (member.email) {
        map.set(member.email.trim().toLowerCase(), member.profilePictureUrl || undefined);
      }
    }
    return map;
  }, [workspaceMembers]);

  const resolveMemberPicture = (member: TeamMemberRecord) => {
    if (member.linkedUserId && avatarByUserId.has(String(member.linkedUserId))) {
      return avatarByUserId.get(String(member.linkedUserId));
    }
    if (member.email) {
      return avatarByEmail.get(member.email.trim().toLowerCase());
    }
    return undefined;
  };

  const { items: payrolls, isLoading: payrollsLoading } = useApi<PayrollEntryLike>({
    endpoint: "payrolls",
    defaultValue: [],
  });

  const [members, setMembers] = useState<TeamMemberRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editing, setEditing] = useState<TeamMemberRecord | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedImportKeys, setSelectedImportKeys] = useState<Set<string>>(new Set());
  const autoSyncedWorkspaceRef = useRef<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [department, setDepartment] = useState<TeamDepartment>("general");
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const [notes, setNotes] = useState("");
  const [employeeNumber, setEmployeeNumber] = useState("");
  const [hireDate, setHireDate] = useState("");
  const [employmentType, setEmploymentType] =
    useState<TeamMemberRecord["employmentType"]>("full_time");
  const [reportsToId, setReportsToId] = useState("");
  const [location, setLocation] = useState("");
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("");
  const [linkedUserId, setLinkedUserId] = useState("");
  const [annualLeaveAllowance, setAnnualLeaveAllowance] = useState("21");
  const [sickLeaveAllowance, setSickLeaveAllowance] = useState("10");

  const loadMembers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await teamMemberApi.getAll();
      setMembers((res.data as TeamMemberRecord[]) || []);
    } catch {
      toast({ title: t("teamLoadFailed"), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast, t]);

  const applySyncResult = useCallback(
    (res: Awaited<ReturnType<typeof teamMemberApi.syncFromWorkspace>>, notify: boolean) => {
      const syncedMembers = (res.data as TeamMemberRecord[]) || [];
      setMembers(syncedMembers);
      const sync = res.sync;
      const created = Number(sync?.created || 0);
      const updated = Number(sync?.updated || 0) + Number(sync?.reactivated || 0);
      if (!notify) return;
      if (created > 0 || updated > 0) {
        toast({
          title: t("teamSyncFromWorkspaceSuccess")
            .replace("{created}", String(created))
            .replace("{updated}", String(updated)),
        });
      } else {
        toast({ title: t("teamSyncFromWorkspaceUpToDate") });
      }
    },
    [t, toast],
  );

  const handleSyncFromWorkspace = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (mode !== "workspace" || !activeWorkspace?.id) {
        if (!opts?.silent) {
          toast({ title: t("teamSyncFromWorkspacePersonal"), variant: "destructive" });
        }
        return;
      }

      setIsSyncing(true);
      try {
        const res = await teamMemberApi.syncFromWorkspace();
        applySyncResult(res, !opts?.silent);
      } catch {
        if (!opts?.silent) {
          toast({ title: t("teamSyncFromWorkspaceFailed"), variant: "destructive" });
        }
      } finally {
        setIsSyncing(false);
      }
    },
    [mode, activeWorkspace?.id, applySyncResult, t, toast],
  );

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  useEffect(() => {
    if (mode !== "workspace" || !activeWorkspace?.id) {
      autoSyncedWorkspaceRef.current = null;
      return;
    }
    if (autoSyncedWorkspaceRef.current === activeWorkspace.id) return;
    autoSyncedWorkspaceRef.current = activeWorkspace.id;
    void handleSyncFromWorkspace({ silent: true });
  }, [mode, activeWorkspace?.id, handleSyncFromWorkspace]);

  const resetForm = () => {
    setName("");
    setEmail("");
    setPhone("");
    setJobTitle("");
    setDepartment("general");
    setStatus("active");
    setNotes("");
    setEmployeeNumber("");
    setHireDate("");
    setEmploymentType("full_time");
    setReportsToId("");
    setLocation("");
    setEmergencyContactName("");
    setEmergencyContactPhone("");
    setLinkedUserId("");
    setAnnualLeaveAllowance("21");
    setSickLeaveAllowance("10");
    setEditing(null);
  };

  const openCreate = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (member: TeamMemberRecord) => {
    setEditing(member);
    setName(member.name);
    setEmail(member.email || "");
    setPhone(member.phone || "");
    setJobTitle(member.jobTitle || "");
    setDepartment((member.department as TeamDepartment) || "general");
    setStatus(member.status || "active");
    setNotes(member.notes || "");
    setEmployeeNumber(member.employeeNumber || "");
    setHireDate(member.hireDate ? member.hireDate.split("T")[0] : "");
    setEmploymentType(member.employmentType || "full_time");
    setReportsToId(memberId(member.reportsToId as TeamMemberRecord | string | null));
    setLocation(member.location || "");
    setEmergencyContactName(member.emergencyContactName || "");
    setEmergencyContactPhone(member.emergencyContactPhone || "");
    setLinkedUserId(member.linkedUserId || "");
    setAnnualLeaveAllowance(String(member.annualLeaveAllowance ?? 21));
    setSickLeaveAllowance(String(member.sickLeaveAllowance ?? 10));
    setOpen(true);
  };

  const deptLabel = (dept: string) =>
    formatCategoryLabel(dept, departmentCategories, t, "department");

  const handleSave = async () => {
    if (!name.trim()) {
      toast({ title: t("teamMemberNameRequired"), variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        jobTitle: jobTitle.trim(),
        department,
        status,
        notes: notes.trim(),
        employeeNumber: employeeNumber.trim(),
        hireDate: hireDate || undefined,
        employmentType,
        reportsToId: reportsToId || null,
        location: location.trim(),
        emergencyContactName: emergencyContactName.trim(),
        emergencyContactPhone: emergencyContactPhone.trim(),
        linkedUserId: linkedUserId || null,
        annualLeaveAllowance: Number(annualLeaveAllowance) || 21,
        sickLeaveAllowance: Number(sickLeaveAllowance) || 10,
      };

      if (editing) {
        await teamMemberApi.update(editing._id, payload);
        toast({ title: t("teamMemberUpdated") });
      } else {
        await teamMemberApi.create(payload);
        toast({ title: t("teamMemberCreated") });
      }

      setOpen(false);
      resetForm();
      void loadMembers();
    } catch {
      toast({ title: t("teamSaveFailed"), variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (member: TeamMemberRecord) => {
    setMembers((prev) => prev.filter((m) => m._id !== member._id));
    try {
      await teamMemberApi.delete(member._id);
      toast({ title: t("teamMemberDeleted") });
    } catch {
      setMembers((prev) => [...prev, member]);
      toast({ title: t("teamDeleteFailed"), variant: "destructive" });
    }
  };

  const { query: pageSearchQuery } = usePageSearch();
  const visibleMembers = useMemo(
    () =>
      filterByPageSearch(members, pageSearchQuery, (member) => [
        member.name,
        member.email,
        member.phone,
        member.jobTitle,
        member.department,
        member.notes,
      ]),
    [members, pageSearchQuery],
  );

  const payrollImportRows = useMemo(
    () => buildPayrollImportRows(payrolls, members),
    [payrolls, members],
  );

  const importableRows = useMemo(
    () => payrollImportRows.filter((row) => !row.alreadyMember),
    [payrollImportRows],
  );

  const openImport = () => {
    setSelectedImportKeys(new Set(importableRows.map((row) => normalizeMemberName(row.name))));
    setImportOpen(true);
  };

  useEffect(() => {
    if (!importOpen || payrollsLoading) return;
    setSelectedImportKeys((prev) => {
      if (prev.size > 0) return prev;
      return new Set(importableRows.map((row) => normalizeMemberName(row.name)));
    });
  }, [importOpen, payrollsLoading, importableRows]);

  const toggleImportRow = (name: string, checked: boolean) => {
    const key = normalizeMemberName(name);
    setSelectedImportKeys((prev) => {
      const next = new Set(prev);
      if (checked) next.add(key);
      else next.delete(key);
      return next;
    });
  };

  const toggleImportAll = (checked: boolean) => {
    if (checked) {
      setSelectedImportKeys(new Set(importableRows.map((row) => normalizeMemberName(row.name))));
      return;
    }
    setSelectedImportKeys(new Set());
  };

  const handleImportFromPayroll = async () => {
    const rowsToImport = importableRows.filter((row) =>
      selectedImportKeys.has(normalizeMemberName(row.name)),
    );
    if (rowsToImport.length === 0) return;

    setIsImporting(true);
    let imported = 0;
    try {
      for (const row of rowsToImport) {
        await teamMemberApi.create({
          name: row.name,
          department: "general",
          status: "active",
          notes: t("teamImportFromPayrollNote"),
        });
        imported += 1;
      }

      toast({
        title: t("teamImportFromPayrollSuccess").replace("{count}", String(imported)),
      });
      setImportOpen(false);
      setSelectedImportKeys(new Set());
      void loadMembers();
    } catch {
      if (imported > 0) {
        toast({
          title: t("teamImportFromPayrollFailed"),
          description: t("teamImportFromPayrollSuccess").replace("{count}", String(imported)),
          variant: "destructive",
        });
        void loadMembers();
      } else {
        toast({ title: t("teamImportFromPayrollFailed"), variant: "destructive" });
      }
    } finally {
      setIsImporting(false);
    }
  };

  const allImportableSelected =
    importableRows.length > 0 &&
    importableRows.every((row) => selectedImportKeys.has(normalizeMemberName(row.name)));

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5">
            <h2 className="text-lg font-semibold text-gray-900">{t("teamMembers")}</h2>
            <HelpTip text={t("helpTeamMembers")} />
          </div>
          <p className="text-sm text-gray-600">{t("teamMembersSubtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {mode === "workspace" ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleSyncFromWorkspace()}
              disabled={isSyncing}
              className="h-10 gap-2 rounded-none border-gray-300"
            >
              {isSyncing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
              {t("teamSyncFromWorkspace")}
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            onClick={openImport}
            className="h-10 gap-2 rounded-none border-gray-300"
          >
            <Users size={16} />
            {t("teamImportFromPayroll")}
          </Button>
          <AddEntryButton label={t("teamAddMember")} onClick={openCreate} />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-500">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          {t("loading")}
        </div>
      ) : members.length === 0 ? (
        <p className="text-sm text-gray-500 py-8">{t("teamNoMembers")}</p>
      ) : (
        <>
        <DesktopDataTable className="border border-gray-200">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="px-3 py-2">{t("name")}</th>
                <th className="px-3 py-2">{t("teamJobTitle")}</th>
                <th className="px-3 py-2">{t("teamDepartment")}</th>
                <th className="px-3 py-2">{t("email")}</th>
                <th className="px-3 py-2">{t("teamStatus")}</th>
                <th className="px-3 py-2 w-10" />
              </tr>
            </thead>
            <tbody>
              {visibleMembers.map((member) => (
                <tr key={member._id} className="border-b border-gray-100 hover:bg-gray-50/60">
                  <td className="px-3 py-3 font-medium text-gray-900">
                    <Link
                      to={`/hr/people/${member._id}`}
                      className="inline-flex items-center gap-2 text-sky-700 hover:underline"
                    >
                      <UserProfileAvatar
                        name={member.name}
                        profilePictureUrl={resolveMemberPicture(member)}
                        className="h-8 w-8 border border-gray-200"
                        fallbackClassName="bg-gray-200 text-[10px] text-gray-700"
                      />
                      <span>{member.name}</span>
                    </Link>
                  </td>
                  <td className="px-3 py-3 text-gray-700">{member.jobTitle || "—"}</td>
                  <td className="px-3 py-3 text-gray-700">
                    {deptLabel(member.department || "general")}
                  </td>
                  <td className="px-3 py-3 text-gray-700">{member.email || "—"}</td>
                  <td className="px-3 py-3 capitalize text-gray-700">{member.status || "active"}</td>
                  <td className="px-3 py-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical size={16} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(member)}>
                          <Pencil size={14} className="mr-2" />
                          {t("edit")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600"
                          disabled={deletingId === member._id}
                          onClick={() => void handleDelete(member)}
                        >
                          <Trash2 size={14} className="mr-2" />
                          {t("delete")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </DesktopDataTable>

        <MobileDataList className="border-x border-b border-gray-200">
          {visibleMembers.map((member, index) => (
            <MobileListCard key={member._id} index={index}>
              <div className="flex items-start gap-3">
                <UserProfileAvatar
                  name={member.name}
                  profilePictureUrl={resolveMemberPicture(member)}
                  className="h-9 w-9 shrink-0 border border-gray-200"
                  fallbackClassName="bg-gray-200 text-[10px] text-gray-700"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 space-y-0.5">
                      <Link
                        to={`/hr/people/${member._id}`}
                        className="text-sm font-semibold text-sky-700 hover:underline truncate block"
                      >
                        {member.name}
                      </Link>
                      <div className="text-xs text-gray-600">{member.jobTitle || "—"}</div>
                      <div className="text-[11px] text-gray-500">
                        {deptLabel(member.department || "general")}
                        {member.email ? ` · ${member.email}` : ""}
                      </div>
                      <div className="text-xs capitalize text-gray-600">{member.status || "active"}</div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                          <MoreVertical size={16} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(member)}>
                          <Pencil size={14} className="mr-2" />
                          {t("edit")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600"
                          disabled={deletingId === member._id}
                          onClick={() => void handleDelete(member)}
                        >
                          <Trash2 size={14} className="mr-2" />
                          {t("delete")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            </MobileListCard>
          ))}
        </MobileDataList>
        </>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? t("teamEditMember") : t("teamAddMember")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>{t("name")}</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>{t("email")}</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div>
                <Label>{t("phone")}</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>{t("teamJobTitle")}</Label>
                <Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
              </div>
              <div>
                <Label>{t("teamDepartment")}</Label>
                <CategorySelect
                  type="department"
                  value={department}
                  onValueChange={setDepartment}
                />
              </div>
            </div>
            <div>
              <Label>{t("teamStatus")}</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
                <SelectTrigger className="bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{t("statusActive")}</SelectItem>
                  <SelectItem value="inactive">{t("teamInactive")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <p className="mb-3 text-sm font-semibold text-gray-800">{t("hrDetailsSection")}</p>
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label>{t("hrEmployeeNumber")}</Label>
                    <Input value={employeeNumber} onChange={(e) => setEmployeeNumber(e.target.value)} />
                  </div>
                  <div>
                    <Label>{t("hrHireDate")}</Label>
                    <Input type="date" value={hireDate} onChange={(e) => setHireDate(e.target.value)} />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label>{t("hrEmploymentType")}</Label>
                    <Select
                      value={employmentType}
                      onValueChange={(value) =>
                        setEmploymentType(value as TeamMemberRecord["employmentType"])
                      }
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {EMPLOYMENT_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {employmentTypeLabel(type, t)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>{t("hrManager")}</Label>
                    <Select
                      value={reportsToId || "__none__"}
                      onValueChange={(value) => setReportsToId(value === "__none__" ? "" : value)}
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder={t("hrNoManager")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">{t("hrNoManager")}</SelectItem>
                        {members
                          .filter((member) => member._id !== editing?._id)
                          .map((member) => (
                            <SelectItem key={member._id} value={member._id}>
                              {member.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label>{t("hrLocation")}</Label>
                    <Input value={location} onChange={(e) => setLocation(e.target.value)} />
                  </div>
                  <div>
                    <Label>{t("hrLeaveAllowances")}</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="number"
                        min={0}
                        value={annualLeaveAllowance}
                        onChange={(e) => setAnnualLeaveAllowance(e.target.value)}
                        placeholder={t("hrAnnualLeave")}
                      />
                      <Input
                        type="number"
                        min={0}
                        value={sickLeaveAllowance}
                        onChange={(e) => setSickLeaveAllowance(e.target.value)}
                        placeholder={t("hrSickLeave")}
                      />
                    </div>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label>{t("hrEmergencyContact")}</Label>
                    <Input
                      value={emergencyContactName}
                      onChange={(e) => setEmergencyContactName(e.target.value)}
                      placeholder={t("name")}
                    />
                  </div>
                  <div>
                    <Label>{t("phone")}</Label>
                    <Input
                      value={emergencyContactPhone}
                      onChange={(e) => setEmergencyContactPhone(e.target.value)}
                    />
                  </div>
                </div>
                {workspaceMembers.length ? (
                  <div>
                    <Label>{t("hrLinkedWorkspaceUser")}</Label>
                    <Select
                      value={linkedUserId || "__none__"}
                      onValueChange={(value) => setLinkedUserId(value === "__none__" ? "" : value)}
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder={t("hrNoLinkedUser")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">{t("hrNoLinkedUser")}</SelectItem>
                        {workspaceMembers.map((member) => (
                          <SelectItem key={member.userId} value={member.userId}>
                            {member.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
              </div>
            </div>

            <div>
              <Label>{t("note")}</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
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

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("teamImportFromPayrollTitle")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">{t("teamImportFromPayrollSubtitle")}</p>

          {payrollsLoading ? (
            <div className="flex items-center justify-center py-10 text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              {t("loading")}
            </div>
          ) : payrollImportRows.length === 0 ? (
            <p className="py-8 text-sm text-gray-500">{t("teamImportFromPayrollEmpty")}</p>
          ) : (
            <div className="space-y-3">
              {importableRows.length === 0 ? (
                <p className="text-sm text-gray-500">{t("teamImportFromPayrollAllExist")}</p>
              ) : (
                <div className="flex items-center justify-between gap-3 border-b border-gray-200 pb-2">
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <Checkbox
                      checked={allImportableSelected}
                      onCheckedChange={(checked) => toggleImportAll(Boolean(checked))}
                      aria-label={t("teamImportFromPayrollSelectAll")}
                    />
                    <span>{t("teamImportFromPayrollSelectAll")}</span>
                  </label>
                  <span className="text-xs text-gray-500">
                    {selectedImportKeys.size} / {importableRows.length}
                  </span>
                </div>
              )}

              <div className="max-h-72 overflow-y-auto divide-y divide-gray-100 border border-gray-200">
                {payrollImportRows.map((row) => {
                  const key = normalizeMemberName(row.name);
                  const checked = selectedImportKeys.has(key);
                  return (
                    <label
                      key={key}
                      className={`flex items-start gap-3 px-3 py-3 ${
                        row.alreadyMember ? "bg-gray-50/80" : "hover:bg-gray-50/60 cursor-pointer"
                      }`}
                    >
                      <Checkbox
                        checked={row.alreadyMember ? false : checked}
                        disabled={row.alreadyMember}
                        onCheckedChange={(value) => toggleImportRow(row.name, Boolean(value))}
                        className="mt-0.5"
                        aria-label={row.name}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900">{row.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {t("teamImportFromPayrollRecords").replace("{count}", String(row.payrollCount))}
                        </p>
                      </div>
                      {row.alreadyMember ? (
                        <span className="shrink-0 text-xs font-medium text-emerald-700">
                          {t("teamImportFromPayrollAlreadyMember")}
                        </span>
                      ) : null}
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)}>
              {t("cancel")}
            </Button>
            <Button
              onClick={() => void handleImportFromPayroll()}
              disabled={isImporting || selectedImportKeys.size === 0 || importableRows.length === 0}
            >
              {isImporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                t("teamImportFromPayrollImport")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
