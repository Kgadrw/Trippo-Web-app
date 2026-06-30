import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useApi } from "@/hooks/useApi";
import { teamMemberApi, type TeamMemberRecord } from "@/lib/api";
import {
  ASSET_STATUSES,
  ASSET_TYPES,
  assetId,
  assetStatusClass,
  assetStatusLabel,
  assetTypeLabel,
  custodianName,
  formatAssetTag,
  isWarrantyExpiringSoon,
  type AssetEntry,
} from "@/lib/assetWorkflow";
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
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";
import { Plus, Loader2, MoreVertical, Pencil, Trash2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/currency";
import { filterByPageSearch } from "@/lib/pageSearch";
import { usePageSearch } from "@/hooks/usePageSearch";
import {
  FINANCE_TH_CLASS,
  FINANCE_TD_CLASS,
  formatFinanceTableDate,
  FinanceTableCheckbox,
  FinanceTableLoading,
  FinanceTableShell,
} from "@/components/finance/financeTable";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { useDeleteConfirm } from "@/hooks/useDeleteConfirm";

function buildAssetDate(dateValue: string) {
  const now = new Date();
  const savedDate = new Date((dateValue || new Date().toISOString().split("T")[0]) + "T00:00:00");
  savedDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
  return savedDate.toISOString();
}

export function AssetsTab() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { items: assets, isLoading, add, update, remove, refresh } = useApi<AssetEntry>({
    endpoint: "assets",
    defaultValue: [],
  });

  const lastRefreshRef = useRef(0);
  useEffect(() => {
    const onRefresh = () => void refresh(true);
    const onVisibility = () => {
      if (document.visibilityState !== "visible") return;
      const now = Date.now();
      if (now - lastRefreshRef.current < 30_000) return;
      lastRefreshRef.current = now;
      void refresh(true);
    };
    window.addEventListener("assets-should-refresh", onRefresh);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("assets-should-refresh", onRefresh);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [refresh]);

  const [title, setTitle] = useState("");
  const [assetTag, setAssetTag] = useState("");
  const [assetType, setAssetType] = useState<string>("technology");
  const [manufacturer, setManufacturer] = useState("");
  const [model, setModel] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [purchaseCost, setPurchaseCost] = useState("");
  const [teamMemberId, setTeamMemberId] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [teamMembers, setTeamMembers] = useState<TeamMemberRecord[]>([]);
  const [location, setLocation] = useState("");
  const [warrantyExpires, setWarrantyExpires] = useState("");
  const [status, setStatus] = useState<string>("active");
  const [depreciationMethod, setDepreciationMethod] = useState<string>("straight_line");
  const [usefulLifeMonths, setUsefulLifeMonths] = useState("");
  const [salvageValue, setSalvageValue] = useState("");
  const [note, setNote] = useState("");

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AssetEntry | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const {
    target: deleteTarget,
    open: deleteOpen,
    isDeleting: isDeleteDeleting,
    setIsDeleting: setIsDeleteDeleting,
    requestDelete,
    takeTarget,
    handleOpenChange: handleDeleteOpenChange,
  } = useDeleteConfirm<AssetEntry>();

  useEffect(() => {
    if (!open) return;
    void teamMemberApi.getAll({ status: "active" }).then((res) => {
      setTeamMembers((res.data as TeamMemberRecord[]) || []);
    });
  }, [open]);

  const sortedAssets = useMemo(() => {
    return [...assets].sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime());
  }, [assets]);

  const { query: pageSearchQuery } = usePageSearch();
  const visibleAssets = useMemo(
    () =>
      filterByPageSearch(sortedAssets, pageSearchQuery, (entry) => [
        entry.title,
        entry.assetTag,
        entry.serialNumber,
        entry.assignedTo,
        custodianName(entry),
        entry.location,
        entry.assetType,
        entry.manufacturer,
        entry.model,
        entry.status,
        entry.note,
      ]),
    [sortedAssets, pageSearchQuery],
  );

  const metrics = useMemo(() => {
    const activeStatuses = new Set(["active", "in_use", "maintenance"]);
    const active = assets.filter((a) => activeStatuses.has(a.status || "active"));
    return {
      activeCount: active.length,
      totalPurchaseValue: active.reduce((s, a) => s + (Number(a.purchaseCost) || 0), 0),
      totalCurrentValue: active.reduce((s, a) => s + (Number(a.currentValue) || 0), 0),
      warrantyExpiringCount: active.filter((a) => isWarrantyExpiringSoon(a.warrantyExpires)).length,
      maintenanceDueCount: active.reduce((sum, asset) => {
        const due = (asset.maintenanceRecords || []).filter(
          (row) => row.status === "scheduled" || row.status === "overdue",
        );
        return sum + due.length;
      }, 0),
    };
  }, [assets]);

  const allSelected =
    visibleAssets.length > 0 && visibleAssets.every((e) => selectedIds.has(assetId(e)));

  const toggleSelectAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(visibleAssets.map((e) => assetId(e))));
  };

  const toggleSelectRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const resetForm = () => {
    setTitle("");
    setAssetTag("");
    setAssetType("technology");
    setManufacturer("");
    setModel("");
    setSerialNumber("");
    setPurchaseDate(new Date().toISOString().split("T")[0]);
    setPurchaseCost("");
    setTeamMemberId("");
    setAssignedTo("");
    setLocation("");
    setWarrantyExpires("");
    setStatus("active");
    setDepreciationMethod("straight_line");
    setUsefulLifeMonths("");
    setSalvageValue("");
    setNote("");
    setEditing(null);
  };

  const openCreate = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (entry: AssetEntry) => {
    setEditing(entry);
    setTitle(entry.title || "");
    setAssetTag(entry.assetTag || "");
    setAssetType(entry.assetType || "technology");
    setManufacturer(entry.manufacturer || "");
    setModel(entry.model || "");
    setSerialNumber(entry.serialNumber || "");
    setPurchaseDate(entry.purchaseDate ? entry.purchaseDate.split("T")[0] : new Date().toISOString().split("T")[0]);
    setPurchaseCost(String(entry.purchaseCost ?? ""));
    setTeamMemberId(
      typeof entry.teamMemberId === "object" && entry.teamMemberId?._id
        ? entry.teamMemberId._id
        : entry.teamMemberId || "",
    );
    setAssignedTo(entry.assignedTo || "");
    setLocation(entry.location || "");
    setWarrantyExpires(entry.warrantyExpires ? entry.warrantyExpires.split("T")[0] : "");
    setStatus(entry.status || "active");
    setDepreciationMethod(entry.depreciationMethod || "straight_line");
    setUsefulLifeMonths(entry.usefulLifeMonths !== undefined ? String(entry.usefulLifeMonths) : "");
    setSalvageValue(entry.salvageValue !== undefined ? String(entry.salvageValue) : "");
    setNote(entry.note || "");
    setOpen(true);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refresh(true);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSave = async () => {
    if (isSaving) return;
    if (!title.trim()) {
      toast({ title: t("assetMissingTitle"), variant: "destructive" });
      return;
    }
    if (!purchaseCost || Number(purchaseCost) < 0) {
      toast({ title: t("assetInvalidCost"), variant: "destructive" });
      return;
    }

    try {
      setIsSaving(true);
      const payload = {
        title: title.trim(),
        assetTag: assetTag.trim() || undefined,
        assetType,
        manufacturer: manufacturer.trim() || undefined,
        model: model.trim() || undefined,
        serialNumber: serialNumber.trim() || undefined,
        purchaseDate: buildAssetDate(purchaseDate),
        purchaseCost: Number(purchaseCost),
        teamMemberId: teamMemberId || undefined,
        assignedTo: assignedTo.trim() || undefined,
        location: location.trim() || undefined,
        warrantyExpires: warrantyExpires ? buildAssetDate(warrantyExpires) : undefined,
        status,
        depreciationMethod,
        usefulLifeMonths: usefulLifeMonths ? Number(usefulLifeMonths) : undefined,
        salvageValue: salvageValue ? Number(salvageValue) : 0,
        note: note.trim() || undefined,
      };

      if (editing) {
        await update({ ...editing, ...payload } as AssetEntry);
        toast({ title: t("assetUpdated") });
      } else {
        await add(payload as AssetEntry);
        toast({ title: t("assetAdded") });
      }

      window.dispatchEvent(new CustomEvent("assets-should-refresh"));
      resetForm();
      setOpen(false);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Could not save asset.";
      toast({ title: "Save failed", description: message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    const item = takeTarget();
    if (!item) return;
    const id = assetId(item);
    setIsDeleteDeleting(true);
    setDeletingId(id);
    try {
      await remove(item as AssetEntry);
      toast({ title: t("deleted"), description: item.title });
      window.dispatchEvent(new CustomEvent("assets-should-refresh"));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Could not delete asset.";
      toast({ title: t("error"), description: message, variant: "destructive" });
    } finally {
      setDeletingId(null);
      setIsDeleteDeleting(false);
    }
  };

  return (
    <>
      <div className="mb-4 grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="rounded-lg border bg-white px-4 py-3">
          <p className="text-xs text-gray-500">{t("assetActiveCount")}</p>
          <p className="text-lg font-semibold text-gray-900">{metrics.activeCount}</p>
        </div>
        <div className="rounded-lg border bg-white px-4 py-3">
          <p className="text-xs text-gray-500">{t("assetPurchaseValue")}</p>
          <p className="text-lg font-semibold text-gray-900">{formatCurrency(metrics.totalPurchaseValue)}</p>
        </div>
        <div className="rounded-lg border bg-white px-4 py-3">
          <p className="text-xs text-gray-500">{t("assetCurrentValue")}</p>
          <p className="text-lg font-semibold text-gray-900">{formatCurrency(metrics.totalCurrentValue)}</p>
        </div>
        <div className="rounded-lg border bg-white px-4 py-3">
          <p className="text-xs text-gray-500">{t("assetWarrantyExpiring")}</p>
          <p className="text-lg font-semibold text-gray-900">{metrics.warrantyExpiringCount}</p>
        </div>
        <div className="rounded-lg border bg-white px-4 py-3">
          <p className="text-xs text-gray-500">{t("assetMaintenanceDue")}</p>
          <p className="text-lg font-semibold text-gray-900">{metrics.maintenanceDueCount}</p>
        </div>
      </div>

      <FinanceTableShell
        title={t("assets")}
        onAdd={openCreate}
        addLabel={t("assetAdd")}
        onRefresh={() => void handleRefresh()}
        isRefreshing={isRefreshing}
      >
        {isLoading ? (
          <FinanceTableLoading />
        ) : visibleAssets.length === 0 ? (
          <div className="px-4 py-16 text-center text-sm text-gray-500">
            No assets registered yet. {t("helpAssets")}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] border-collapse">
              <thead>
                <tr>
                  <th className={cn(FINANCE_TH_CLASS, "w-10 pl-4")}>
                    <FinanceTableCheckbox
                      checked={allSelected}
                      onCheckedChange={toggleSelectAll}
                      ariaLabel="Select all"
                    />
                  </th>
                  <th className={FINANCE_TH_CLASS}>{t("assetTag")}</th>
                  <th className={FINANCE_TH_CLASS}>{t("assetPurchaseDate")}</th>
                  <th className={FINANCE_TH_CLASS}>{t("assetType")}</th>
                  <th className={FINANCE_TH_CLASS}>{t("title")}</th>
                  <th className={cn(FINANCE_TH_CLASS, "hidden md:table-cell")}>Serial #</th>
                  <th className={FINANCE_TH_CLASS}>Status</th>
                  <th className={cn(FINANCE_TH_CLASS, "hidden sm:table-cell")}>Assigned to</th>
                  <th className={FINANCE_TH_CLASS}>Purchase cost</th>
                  <th className={FINANCE_TH_CLASS}>Current value</th>
                  <th className={cn(FINANCE_TH_CLASS, "hidden lg:table-cell")}>Warranty</th>
                  <th className={cn(FINANCE_TH_CLASS, "w-10 pr-4")} />
                </tr>
              </thead>
              <tbody className="bg-white">
                {visibleAssets.map((entry) => {
                  const id = assetId(entry);
                  const isSelected = selectedIds.has(id);
                  const warrantySoon = isWarrantyExpiringSoon(entry.warrantyExpires);
                  return (
                    <tr
                      key={id}
                      className={cn(
                        "transition-colors hover:bg-gray-50/80",
                        isSelected && "bg-blue-50/40",
                      )}
                    >
                      <td className={cn(FINANCE_TD_CLASS, "pl-4")}>
                        <FinanceTableCheckbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelectRow(id)}
                          ariaLabel={`Select ${entry.title}`}
                        />
                      </td>
                      <td className={cn(FINANCE_TD_CLASS, "font-mono text-xs text-gray-600")}>
                        {formatAssetTag(entry.assetTag)}
                      </td>
                      <td className={cn(FINANCE_TD_CLASS, "text-gray-700 tabular-nums")}>
                        {formatFinanceTableDate(entry.purchaseDate)}
                      </td>
                      <td className={cn(FINANCE_TD_CLASS, "text-gray-600")}>
                        {assetTypeLabel(entry.assetType, t)}
                      </td>
                      <td className={cn(FINANCE_TD_CLASS, "font-semibold text-gray-900 max-w-[180px] truncate")}>
                        <Link to={`/assets/${id}`} className="text-sky-700 hover:underline">
                          {entry.title}
                        </Link>
                      </td>
                      <td className={cn(FINANCE_TD_CLASS, "hidden md:table-cell text-gray-600")}>
                        {entry.serialNumber || "—"}
                      </td>
                      <td className={cn(FINANCE_TD_CLASS, assetStatusClass(entry.status))}>
                        {assetStatusLabel(entry.status, t)}
                      </td>
                      <td className={cn(FINANCE_TD_CLASS, "hidden sm:table-cell text-gray-600 max-w-[140px] truncate")}>
                        {custodianName(entry) || "—"}
                      </td>
                      <td className={cn(FINANCE_TD_CLASS, "tabular-nums text-gray-800")}>
                        {formatCurrency(Number(entry.purchaseCost) || 0)}
                      </td>
                      <td className={cn(FINANCE_TD_CLASS, "tabular-nums text-gray-800")}>
                        {formatCurrency(Number(entry.currentValue) || 0)}
                      </td>
                      <td className={cn(FINANCE_TD_CLASS, "hidden lg:table-cell text-gray-600")}>
                        <span className="inline-flex items-center gap-1">
                          {entry.warrantyExpires ? formatFinanceTableDate(entry.warrantyExpires) : "—"}
                          {warrantySoon ? <AlertTriangle className="h-3.5 w-3.5 text-amber-500" /> : null}
                        </span>
                      </td>
                      <td className={cn(FINANCE_TD_CLASS, "pr-4 text-right")}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-gray-400 hover:text-gray-700"
                              disabled={deletingId === id}
                            >
                              {deletingId === id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <MoreVertical className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(entry)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              {t("edit")}
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link to={`/assets/${id}`}>{t("assetViewDetails")}</Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => requestDelete(entry)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
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
      </FinanceTableShell>

      <Dialog open={open} onOpenChange={(next) => { if (!next) resetForm(); setOpen(next); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? t("assetEdit") : t("assetAdd")}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            <div className="sm:col-span-2">
              <Label htmlFor="asset-title">{t("title")}</Label>
              <Input id="asset-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Dell Laptop" />
            </div>
            <div>
              <Label htmlFor="asset-tag">{t("assetTag")}</Label>
              <Input id="asset-tag" value={assetTag} onChange={(e) => setAssetTag(e.target.value)} placeholder="105" />
            </div>
            <div>
              <Label>{t("assetType")}</Label>
              <Select value={assetType} onValueChange={setAssetType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ASSET_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>{assetTypeLabel(type, t)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("assetManufacturer")}</Label>
              <Input value={manufacturer} onChange={(e) => setManufacturer(e.target.value)} />
            </div>
            <div>
              <Label>{t("assetModel")}</Label>
              <Input value={model} onChange={(e) => setModel(e.target.value)} />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ASSET_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{assetStatusLabel(s, t)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="asset-serial">Serial number</Label>
              <Input id="asset-serial" value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="asset-purchase-date">Purchase date</Label>
              <Input id="asset-purchase-date" type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="asset-cost">Purchase cost</Label>
              <Input id="asset-cost" type="number" min="0" step="0.01" value={purchaseCost} onChange={(e) => setPurchaseCost(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="asset-warranty">Warranty expires</Label>
              <Input id="asset-warranty" type="date" value={warrantyExpires} onChange={(e) => setWarrantyExpires(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="asset-assigned">{t("assetAssignedTo")}</Label>
              {teamMembers.length ? (
                <Select
                  value={teamMemberId || "__manual__"}
                  onValueChange={(value) => {
                    if (value === "__manual__") {
                      setTeamMemberId("");
                      return;
                    }
                    const member = teamMembers.find((row) => row._id === value);
                    setTeamMemberId(value);
                    if (member) setAssignedTo(member.name);
                  }}
                >
                  <SelectTrigger className="bg-white"><SelectValue placeholder={t("assetSelectAssignee")} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__manual__">{t("assetManualAssignee")}</SelectItem>
                    {teamMembers.map((member) => (
                      <SelectItem key={member._id} value={member._id}>{member.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input id="asset-assigned" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} />
              )}
            </div>
            {teamMembers.length && !teamMemberId ? (
              <div>
                <Label htmlFor="asset-assigned-name">{t("assetManualAssignee")}</Label>
                <Input id="asset-assigned-name" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} />
              </div>
            ) : null}
            <div>
              <Label htmlFor="asset-location">{t("assetLocation")}</Label>
              <Input id="asset-location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Office, warehouse, etc." />
            </div>
            <div>
              <Label>Depreciation</Label>
              <Select value={depreciationMethod} onValueChange={setDepreciationMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="straight_line">Straight line</SelectItem>
                  <SelectItem value="none">None</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="asset-life">Useful life (months)</Label>
              <Input
                id="asset-life"
                type="number"
                min="0"
                value={usefulLifeMonths}
                onChange={(e) => setUsefulLifeMonths(e.target.value)}
                disabled={depreciationMethod === "none"}
              />
            </div>
            <div>
              <Label htmlFor="asset-salvage">Salvage value</Label>
              <Input
                id="asset-salvage"
                type="number"
                min="0"
                step="0.01"
                value={salvageValue}
                onChange={(e) => setSalvageValue(e.target.value)}
                disabled={depreciationMethod === "none"}
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="asset-note">Note</Label>
              <Textarea id="asset-note" value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { resetForm(); setOpen(false); }}>Cancel</Button>
            <Button onClick={() => void handleSave()} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : editing ? "Save changes" : <><Plus className="mr-1 h-4 w-4" />Add asset</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={handleDeleteOpenChange}
        title={t("assetDeleteTitle")}
        description={deleteTarget ? t("assetDeleteDesc").replace("{name}", deleteTarget.title) : ""}
        confirmLabel={t("delete")}
        cancelLabel={t("cancel")}
        onConfirm={() => void handleDeleteConfirm()}
        isDeleting={isDeleteDeleting}
      />
    </>
  );
}
