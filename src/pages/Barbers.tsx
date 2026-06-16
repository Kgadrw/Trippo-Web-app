import { useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input, searchBarInputClass } from "@/components/ui/input";
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
  filterSelectClass,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useApi } from "@/hooks/useApi";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Trash2, Loader2, X, MoreVertical, Pencil, ArrowUpDown, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "@/hooks/useTranslation";
import { cn } from "@/lib/utils";
import { MobileListSearchFilters } from "@/components/ui/mobile-list-search-filters";

type WorkerStatus = "active" | "inactive";
type AddMode = "single" | "bulk";

interface BulkWorkerRow {
  name: string;
  role: string;
}

const emptyBulkWorkerRow = (): BulkWorkerRow => ({ name: "", role: "" });

type WorkerSort = "default" | "name-asc" | "name-desc" | "role-asc" | "role-desc";
type WorkerStatusFilter = "all" | WorkerStatus;

function compareWorkers(a: Worker, b: Worker, sort: WorkerSort): number {
  if (sort === "default") return 0;
  const nameA = (a.name || "").toLowerCase();
  const nameB = (b.name || "").toLowerCase();
  const roleA = (a.businessType || "").toLowerCase();
  const roleB = (b.businessType || "").toLowerCase();
  const idA = String((a as { _id?: string; id?: number })._id ?? a.id ?? a.name ?? "");
  const idB = String((b as { _id?: string; id?: number })._id ?? b.id ?? b.name ?? "");
  let primary = 0;
  switch (sort) {
    case "name-asc":
      primary = nameA.localeCompare(nameB, undefined, { sensitivity: "base" });
      break;
    case "name-desc":
      primary = nameB.localeCompare(nameA, undefined, { sensitivity: "base" });
      break;
    case "role-asc":
      primary = roleA.localeCompare(roleB, undefined, { sensitivity: "base" });
      break;
    case "role-desc":
      primary = roleB.localeCompare(roleA, undefined, { sensitivity: "base" });
      break;
    default:
      return 0;
  }
  if (primary !== 0) return primary;
  return idA.localeCompare(idB);
}

interface Worker {
  id?: number;
  _id?: string;
  name: string;
  businessType?: string;
  clientType?: "debtor" | "worker" | "other";
  phone?: string;
  email?: string;
  notes?: string;
  workerStatus?: WorkerStatus;
}

function getWorkerId(worker: Worker): string {
  return String((worker as { _id?: string; id?: number })._id ?? worker.id ?? "");
}

function StatusBadge({ active, label }: { active: boolean; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        active ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-600",
      )}
    >
      {label}
    </span>
  );
}

export default function Barbers() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const { items, isLoading, add, update, remove, refresh } = useApi<Worker>({
    endpoint: "clients",
    defaultValue: [],
  });

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [addMode, setAddMode] = useState<AddMode>("single");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [bulkRows, setBulkRows] = useState<BulkWorkerRow[]>([emptyBulkWorkerRow()]);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [workerStatus, setWorkerStatus] = useState<WorkerStatus>("active");
  const [isSaving, setIsSaving] = useState(false);
  const [deletingWorkerId, setDeletingWorkerId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<WorkerSort>("default");
  const [statusFilter, setStatusFilter] = useState<WorkerStatusFilter>("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  const roles = useMemo(() => {
    const set = new Set<string>();
    for (const w of items) {
      if (w.clientType !== "worker") continue;
      const role = String(w.businessType || "").trim();
      if (role) set.add(role);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  }, [items]);

  const workers = useMemo(() => {
    const q = query.trim().toLowerCase();
    const workerItems = items.filter((x) => x.clientType === "worker");
    let list = !q
      ? [...workerItems]
      : workerItems.filter((x) =>
          `${x.name} ${x.businessType || ""} ${x.phone || ""} ${x.email || ""}`.toLowerCase().includes(q),
        );
    if (statusFilter !== "all") {
      list = list.filter((w) => (w.workerStatus || "active") === statusFilter);
    }
    if (roleFilter !== "all") {
      list = list.filter((w) => (w.businessType || "").toLowerCase() === roleFilter.toLowerCase());
    }
    if (sortBy !== "default") {
      list.sort((a, b) => compareWorkers(a, b, sortBy));
    }
    return list;
  }, [items, query, sortBy, statusFilter, roleFilter]);

  const hasActiveFilters = statusFilter !== "all" || roleFilter !== "all";

  const clearFilters = () => {
    setStatusFilter("all");
    setRoleFilter("all");
  };

  const sortOptionLabels: Record<WorkerSort, string> = {
    default: t("defaultSortOrder"),
    "name-asc": t("nameAsc"),
    "name-desc": t("nameDesc"),
    "role-asc": `${t("workerRole")} (A-Z)`,
    "role-desc": `${t("workerRole")} (Z-A)`,
  };

  const resetForm = () => {
    setAddMode("single");
    setName("");
    setCategory("");
    setBulkRows([emptyBulkWorkerRow()]);
    setPhone("");
    setEmail("");
    setNotes("");
    setWorkerStatus("active");
    setEditingWorker(null);
  };

  const addBulkRow = () => {
    setBulkRows((rows) => [...rows, emptyBulkWorkerRow()]);
  };

  const removeBulkRow = (index: number) => {
    setBulkRows((rows) => (rows.length > 1 ? rows.filter((_, i) => i !== index) : rows));
  };

  const updateBulkRow = (index: number, field: keyof BulkWorkerRow, value: string) => {
    setBulkRows((rows) => {
      const next = [...rows];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const openCreate = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (worker: Worker) => {
    setEditingWorker(worker);
    setName(worker.name || "");
    setCategory(worker.businessType || "");
    setPhone(worker.phone || "");
    setEmail(worker.email || "");
    setNotes(worker.notes || "");
    setWorkerStatus(worker.workerStatus === "inactive" ? "inactive" : "active");
    setOpen(true);
  };

  const buildWorkerPayload = (base: Partial<Worker> = {}): Worker => ({
    ...base,
    name: name.trim(),
    businessType: category.trim(),
    clientType: "worker",
    phone: phone.trim() || undefined,
    email: email.trim() || undefined,
    notes: notes.trim() || undefined,
    workerStatus,
  } as Worker);

  const buildWorkerPayloadFromRow = (row: BulkWorkerRow): Worker =>
    ({
      name: row.name.trim(),
      businessType: row.role.trim(),
      clientType: "worker",
      workerStatus: "active",
    }) as Worker;

  const handleSave = async () => {
    if (editingWorker) {
      if (!name.trim() || !category.trim()) {
        toast({ title: t("missingInformation"), description: t("fillAllRequired"), variant: "destructive" });
        return;
      }
      setIsSaving(true);
      try {
        await update({
          ...editingWorker,
          ...buildWorkerPayload(),
        });
        toast({ title: t("workerUpdatedTitle"), description: t("workerUpdatedDesc") });
        resetForm();
        setOpen(false);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : t("saveWorkerFailed");
        toast({ title: t("saveFailed"), description: message, variant: "destructive" });
      } finally {
        setIsSaving(false);
      }
      return;
    }

    if (addMode === "bulk") {
      const workersToAdd = bulkRows
        .map((row) => {
          if (!row.name.trim() || !row.role.trim()) return null;
          return buildWorkerPayloadFromRow(row);
        })
        .filter((row): row is Worker => row !== null);

      if (workersToAdd.length === 0) {
        toast({ title: t("missingInformation"), description: t("fillAllRequired"), variant: "destructive" });
        return;
      }

      setIsSaving(true);
      try {
        for (const worker of workersToAdd) {
          await add(worker);
        }
        toast({
          title: t("workerAddedTitle"),
          description: `${workersToAdd.length} ${barbersTitle.toLowerCase()}`,
        });
        resetForm();
        setOpen(false);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : t("saveWorkerFailed");
        toast({ title: t("saveFailed"), description: message, variant: "destructive" });
      } finally {
        setIsSaving(false);
      }
      return;
    }

    if (!name.trim() || !category.trim()) {
      toast({ title: t("missingInformation"), description: t("fillAllRequired"), variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      await add(buildWorkerPayload());
      toast({ title: t("workerAddedTitle"), description: t("workerAddedDesc") });
      resetForm();
      setOpen(false);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t("saveWorkerFailed");
      toast({ title: t("saveFailed"), description: message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (worker: Worker): Promise<boolean> => {
    if (!window.confirm(`Delete ${worker.name}?`)) return false;
    const id = getWorkerId(worker);
    if (!id) return false;
    setDeletingWorkerId(id);
    try {
      await remove(worker);
      await refresh(true);
      toast({ title: t("deleted"), description: t("workerRemovedDesc") });
      return true;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t("deleteWorkerFailed");
      toast({ title: t("error"), description: message, variant: "destructive" });
      return false;
    } finally {
      setDeletingWorkerId(null);
    }
  };

  const barbersTitle = t("workers");
  const barberSingular = t("worker");
  const nameLabel = t("name");
  const roleLabel = t("workerRole");
  const statusLabel = t("workerStatus");
  const emailLabel = t("emailAddress");
  const phoneLabel = t("phoneNumber");
  const actionsLabel = t("actions");

  const filterControls = (
    <div className="space-y-3">
      <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as WorkerStatusFilter)}>
        <SelectTrigger className={cn("w-full h-10 rounded-lg", filterSelectClass)}>
          <SelectValue placeholder={t("workerStatus")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("allStatus")}</SelectItem>
          <SelectItem value="active">{t("workerStatusActive")}</SelectItem>
          <SelectItem value="inactive">{t("workerStatusInactive")}</SelectItem>
        </SelectContent>
      </Select>
      <Select value={roleFilter} onValueChange={setRoleFilter}>
        <SelectTrigger className={cn("w-full h-10 rounded-lg", filterSelectClass)}>
          <SelectValue placeholder={t("workerRole")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("allRoles")}</SelectItem>
          {roles.map((role) => (
            <SelectItem key={role} value={role}>
              {role}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={sortBy} onValueChange={(v) => setSortBy(v as WorkerSort)}>
        <SelectTrigger className={cn("w-full h-10 rounded-lg", filterSelectClass)}>
          <div className="flex items-center gap-2">
            <ArrowUpDown size={14} className="text-gray-400" />
            <SelectValue placeholder={t("sortBy")} />
          </div>
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(sortOptionLabels) as WorkerSort[]).map((key) => (
            <SelectItem key={key} value={key}>
              {sortOptionLabels[key]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {hasActiveFilters && (
        <Button type="button" variant="outline" onClick={clearFilters} className="h-10 rounded-lg w-full">
          <X size={14} className="mr-1.5" />
          {t("clearFilters")}
        </Button>
      )}
    </div>
  );

  const addWorkerButton = (
    <Button
      className="bg-primary text-white hover:bg-blue-700 hover:text-white gap-2 shrink-0 rounded-lg h-10 px-3"
      onClick={openCreate}
    >
      <Plus size={18} />
      <span className="hidden sm:inline">{t("addWorker")}</span>
      <span className="sm:hidden sr-only">{t("add")}</span>
    </Button>
  );

  const filterBar = (
    <>
      <MobileListSearchFilters
        searchValue={query}
        onSearchChange={setQuery}
        searchPlaceholder={`${t("search")} ${barbersTitle.toLowerCase()}...`}
        showFilters={showFilters}
        onToggleFilters={() => setShowFilters((v) => !v)}
        filters={filterControls}
        trailing={addWorkerButton}
        searchName="search-workers"
      />
      <div className="hidden lg:flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`${t("search")} ${barbersTitle.toLowerCase()}...`}
            className={searchBarInputClass}
            autoComplete="off"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as WorkerStatusFilter)}>
          <SelectTrigger className={cn("w-[150px] h-10 rounded-lg shrink-0", filterSelectClass)}>
            <SelectValue placeholder={t("workerStatus")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allStatus")}</SelectItem>
            <SelectItem value="active">{t("workerStatusActive")}</SelectItem>
            <SelectItem value="inactive">{t("workerStatusInactive")}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className={cn("w-[160px] h-10 rounded-lg shrink-0", filterSelectClass)}>
            <SelectValue placeholder={t("workerRole")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allRoles")}</SelectItem>
            {roles.map((role) => (
              <SelectItem key={role} value={role}>
                {role}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as WorkerSort)}>
          <SelectTrigger className={cn("w-[200px] h-10 rounded-lg shrink-0", filterSelectClass)}>
            <div className="flex items-center gap-2">
              <ArrowUpDown size={14} className="text-gray-400" />
              <SelectValue placeholder={t("sortBy")} />
            </div>
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(sortOptionLabels) as WorkerSort[]).map((key) => (
              <SelectItem key={key} value={key}>
                {sortOptionLabels[key]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasActiveFilters && (
          <Button type="button" variant="outline" onClick={clearFilters} className="h-10 rounded-lg shrink-0">
            <X size={14} className="mr-1.5" />
            {t("clearFilters")}
          </Button>
        )}
        <Button
          className="bg-primary text-white hover:bg-blue-700 hover:text-white gap-2 shrink-0 rounded-lg h-10"
          onClick={openCreate}
        >
          <Plus size={16} />
          <span>{t("addWorker")}</span>
        </Button>
      </div>
    </>
  );

  const renderWorkersTable = (compact = false) => {
    const thClass = compact
      ? "text-left text-xs font-semibold text-gray-700 py-2 px-2"
      : "text-left text-sm font-semibold text-gray-700 py-4 px-6";
    const tdClass = compact ? "py-2 px-2" : "py-4 px-6";

    return (
      <table className="w-full border-collapse">
        <thead className="sticky top-0 z-10 bg-gray-100 border-b border-gray-200">
          <tr>
            <th className={thClass}>{nameLabel}</th>
            <th className={thClass}>{roleLabel}</th>
            <th className={cn(thClass, compact && "hidden")}>{statusLabel}</th>
            <th className={cn(thClass, compact && "hidden")}>{emailLabel}</th>
            <th className={cn(thClass, compact ? "" : "hidden xl:table-cell")}>{phoneLabel}</th>
            <th className={cn(thClass, "text-right")}>{actionsLabel}</th>
          </tr>
        </thead>
        <tbody className="bg-white">
          {workers.length > 0 ? (
            workers.map((worker, index) => {
              const id = getWorkerId(worker);
              const isDeletingThis = deletingWorkerId !== null && id === deletingWorkerId;
              const isActive = worker.workerStatus !== "inactive";

              return (
                <tr
                  key={id || worker.name}
                  className={cn(
                    "border-b border-gray-200",
                    index % 2 === 0 ? "bg-white" : "bg-gray-50",
                  )}
                >
                  <td className={tdClass}>
                    <div className={cn("text-gray-900", compact ? "text-xs font-medium" : "text-sm")}>
                      {worker.name}
                    </div>
                  </td>
                  <td className={tdClass}>
                    <div className={cn("text-gray-700", compact ? "text-xs" : "text-sm")}>
                      {worker.businessType || barberSingular}
                    </div>
                  </td>
                  <td className={cn(tdClass, compact && "hidden")}>
                    <StatusBadge
                      active={isActive}
                      label={isActive ? t("workerStatusActive") : t("workerStatusInactive")}
                    />
                  </td>
                  <td className={cn(tdClass, compact && "hidden")}>
                    <div className={cn("text-gray-700 truncate max-w-[200px]", compact ? "text-xs" : "text-sm")}>
                      {worker.email || "—"}
                    </div>
                  </td>
                  <td className={cn(tdClass, compact ? "" : "hidden xl:table-cell")}>
                    <div className={cn("text-gray-700", compact ? "text-xs" : "text-sm")}>
                      {worker.phone || "—"}
                    </div>
                  </td>
                  <td className={cn(tdClass, "text-right")}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" disabled={isDeletingThis}>
                          {isDeletingThis ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <MoreVertical size={16} />
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(worker)}>
                          <Pencil size={14} className="mr-2" />
                          {t("edit")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => void handleDelete(worker)}
                          disabled={isDeletingThis}
                          className="text-red-600 focus:text-red-600 focus:bg-red-50"
                        >
                          <Trash2 size={14} className="mr-2" />
                          {t("delete")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={compact ? 4 : 6} className={cn(tdClass, "py-12 text-center")}>
                <div className="flex flex-col items-center justify-center text-gray-400">
                  <Users size={48} className="mb-4 opacity-50" />
                  <p className="text-base font-medium">{t("noWorkersFound")}</p>
                  <p className="text-sm mt-1">{t("noWorkersAddFirst")}</p>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    );
  };

  if (isLoading) {
    return (
      <AppLayout title={barbersTitle}>
        <div className="flex flex-col min-h-0 pb-4 lg:pb-4">
          <div className="lg:bg-white lg:flex-1 lg:flex lg:flex-col lg:min-h-0 lg:overflow-hidden rounded-lg">
            <div className="lg:bg-white lg:border-b lg:border-gray-200 lg:px-4 lg:py-4 flex-shrink-0">
              {filterBar}
            </div>
            <div className="hidden lg:block overflow-auto flex-1 pb-4">
              <table className="w-full border-collapse">
                <thead className="sticky top-0 z-10 bg-gray-100 border-b border-gray-200">
                  <tr>
                    {[nameLabel, roleLabel, statusLabel, emailLabel, phoneLabel, actionsLabel].map((col) => (
                      <th key={col} className="text-left text-sm font-semibold text-gray-700 py-4 px-6">
                        <Skeleton className="h-4 w-20" />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="border-b border-gray-200">
                      {Array.from({ length: 6 }).map((_, j) => (
                        <td key={j} className="py-4 px-6">
                          <Skeleton className="h-4 w-28" />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={barbersTitle}>
      <div className="flex flex-col min-h-0 pb-4 lg:pb-4">
        <div className="lg:bg-white lg:flex-1 lg:flex lg:flex-col lg:min-h-0 lg:overflow-hidden rounded-lg">
          <div className="lg:bg-white lg:border-b lg:border-gray-200 lg:px-4 lg:py-4 flex-shrink-0 mb-4 lg:mb-0">
            {filterBar}
            <div className="mt-3 text-xs text-gray-500 lg:block hidden">
              {workers.length} {barbersTitle.toLowerCase()}
            </div>
          </div>

          <div className="hidden lg:block overflow-auto flex-1 pb-4">
            {renderWorkersTable(false)}
          </div>

          <div className="lg:hidden mt-4 pb-20">
            <div className="overflow-auto">
              <div className="min-w-full">{renderWorkersTable(true)}</div>
            </div>
          </div>
        </div>
      </div>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next && isSaving) return;
          setOpen(next);
          if (!next) resetForm();
        }}
      >
        <DialogContent
          className={cn(
            "sm:max-w-md max-h-[90vh] overflow-y-auto",
            !editingWorker && addMode === "bulk" && "sm:max-w-lg",
          )}
        >
          <DialogHeader>
            <DialogTitle>
              {editingWorker ? t("editWorker") : addMode === "bulk" ? t("bulkAdd") : t("addWorker")}
            </DialogTitle>
          </DialogHeader>

          {!editingWorker && (
            <div className="flex gap-2">
              <Button
                type="button"
                variant={addMode === "single" ? "default" : "outline"}
                onClick={() => setAddMode("single")}
                className={cn(addMode === "single" && "bg-primary text-white hover:bg-blue-700 hover:text-white")}
                disabled={isSaving}
              >
                {t("addWorker")}
              </Button>
              <Button
                type="button"
                variant={addMode === "bulk" ? "default" : "outline"}
                onClick={() => setAddMode("bulk")}
                className={cn(addMode === "bulk" && "bg-primary text-white hover:bg-blue-700 hover:text-white")}
                disabled={isSaving}
              >
                {t("bulkAdd")}
              </Button>
            </div>
          )}

          <div className="space-y-3 py-2">
            {editingWorker || addMode === "single" ? (
              <>
                <div className="space-y-1">
                  <Label>{t("name")}</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} disabled={isSaving} />
                </div>
                <div className="space-y-1">
                  <Label>{t("workerRole")}</Label>
                  <Input
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder={t("category")}
                    disabled={isSaving}
                  />
                </div>
                <div className="space-y-1">
                  <Label>{t("workerStatus")}</Label>
                  <Select
                    value={workerStatus}
                    onValueChange={(v) => setWorkerStatus(v as WorkerStatus)}
                    disabled={isSaving}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">{t("workerStatusActive")}</SelectItem>
                      <SelectItem value="inactive">{t("workerStatusInactive")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>{t("phoneNumber")}</Label>
                  <Input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={isSaving}
                  />
                </div>
                <div className="space-y-1">
                  <Label>{t("emailAddress")}</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isSaving}
                  />
                </div>
                <div className="space-y-1">
                  <Label>{t("workerNotes")}</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    disabled={isSaving}
                  />
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <p className="text-sm text-muted-foreground">{t("addMultipleWorkers")}</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addBulkRow}
                    disabled={isSaving}
                    className="shrink-0 gap-1"
                  >
                    <Plus size={14} />
                    {t("addWorker")}
                  </Button>
                </div>
                {bulkRows.map((row, index) => (
                  <div
                    key={index}
                    className="rounded-lg border border-gray-300 p-3 space-y-2 bg-white shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-600">
                        {barberSingular} #{index + 1}
                      </span>
                      {bulkRows.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeBulkRow(index)}
                          disabled={isSaving}
                          className="p-1 rounded text-red-600 hover:bg-red-50"
                          aria-label={t("delete")}
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <Input
                        value={row.name}
                        onChange={(e) => updateBulkRow(index, "name", e.target.value)}
                        placeholder={t("name")}
                        disabled={isSaving}
                      />
                      <Input
                        value={row.role}
                        onChange={(e) => updateBulkRow(index, "role", e.target.value)}
                        placeholder={t("workerRole")}
                        disabled={isSaving}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 sm:justify-between">
            {editingWorker ? (
              <Button
                variant="outline"
                className="text-red-600 border-red-200 hover:bg-red-50"
                disabled={isSaving || deletingWorkerId !== null}
                onClick={async () => {
                  const deleted = await handleDelete(editingWorker);
                  if (!deleted) return;
                  setOpen(false);
                  resetForm();
                }}
              >
                {deletingWorkerId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setOpen(false)} disabled={isSaving}>
                {t("cancel")}
              </Button>
              <Button
                className="bg-primary text-white hover:bg-blue-700 hover:text-white min-w-[7rem]"
                onClick={() => void handleSave()}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("saving")}
                  </>
                ) : editingWorker ? (
                  t("save")
                ) : addMode === "bulk" ? (
                  t("addWorkersBtn")
                ) : (
                  t("save")
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
