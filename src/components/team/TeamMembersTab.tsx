import { useCallback, useEffect, useMemo, useState } from "react";
import { filterByPageSearch } from "@/lib/pageSearch";
import { usePageSearch } from "@/hooks/usePageSearch";
import { useApi } from "@/hooks/useApi";
import { teamMemberApi, type TeamMemberRecord } from "@/lib/api";
import { TEAM_DEPARTMENTS, type TeamDepartment } from "@/lib/teamConstants";
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
import { Loader2, MoreVertical, Pencil, Trash2, Users } from "lucide-react";
import { HelpTip } from "@/components/ui/help-tip";

interface PayrollEntryLike {
  employeeName: string;
}

export function TeamMembersTab() {
  const { t } = useTranslation();
  const { toast } = useToast();
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
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedImportKeys, setSelectedImportKeys] = useState<Set<string>>(new Set());

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [department, setDepartment] = useState<TeamDepartment>("general");
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const [notes, setNotes] = useState("");

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

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  const resetForm = () => {
    setName("");
    setEmail("");
    setPhone("");
    setJobTitle("");
    setDepartment("general");
    setStatus("active");
    setNotes("");
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
    setOpen(true);
  };

  const deptLabel = (dept: string) => {
    const key = `teamDept${dept.charAt(0).toUpperCase()}${dept.slice(1)}` as keyof typeof t;
    return t(key);
  };

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
        <div className="overflow-x-auto border border-gray-200">
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
                  <td className="px-3 py-3 font-medium text-gray-900">{member.name}</td>
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
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
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
                <Select value={department} onValueChange={(v) => setDepartment(v as TeamDepartment)}>
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
