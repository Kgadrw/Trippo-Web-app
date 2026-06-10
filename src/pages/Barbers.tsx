import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useApi } from "@/hooks/useApi";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Trash2, Pencil, Loader2, MoreVertical } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTranslation } from "@/hooks/useTranslation";
import { cn, formatDateWithTime } from "@/lib/utils";

interface Barber {
  id?: number;
  _id?: string;
  name: string;
  businessType?: string;
  clientType?: "debtor" | "worker" | "other";
}

interface Sale {
  id?: number;
  _id?: string;
  product: string;
  quantity: number;
  revenue: number;
  date: string;
  timestamp?: string;
  saleType?: "product" | "service";
  serviceName?: string;
  workerId?: string;
  workerName?: string;
}

/** Flatten Mongo-style ids and populated refs so sales ↔ workers match after API/JSON. */
function normalizeEntityId(value: unknown): string {
  if (value == null || value === "") return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "bigint") {
    return String(value).trim();
  }
  if (typeof value === "object") {
    const o = value as Record<string, unknown>;
    if (typeof o.$oid === "string") return o.$oid.trim();
    if (o._id != null) return normalizeEntityId(o._id);
    if (o.id != null) return normalizeEntityId(o.id);
  }
  return "";
}

function idsEqual(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.length === 24 && b.length === 24 && /^[a-f0-9]+$/i.test(a) && /^[a-f0-9]+$/i.test(b)) {
    return a.toLowerCase() === b.toLowerCase();
  }
  return false;
}

function workerIdCandidates(worker: Barber): string[] {
  const out: string[] = [];
  const push = (v: unknown) => {
    const n = normalizeEntityId(v);
    if (n && !out.some((x) => idsEqual(x, n))) out.push(n);
  };
  push((worker as { _id?: unknown })._id);
  push((worker as { id?: unknown }).id);
  return out;
}

/** Stable row / map key: prefer Mongo id, then numeric id string, then name. */
function workerKey(b: Barber): string {
  const ids = workerIdCandidates(b);
  if (ids.length > 0) return ids[0];
  const name = (b.name || "").trim().toLowerCase();
  return name ? `name:${name}` : "";
}

/** Collect every id shape the backend might put on a sale for the worker/barber. */
function saleWorkerIdStrings(sale: Record<string, unknown>): string[] {
  const out: string[] = [];
  const push = (v: unknown) => {
    const n = normalizeEntityId(v);
    if (n && !out.some((x) => idsEqual(x, n))) out.push(n);
  };
  push(sale.workerId);
  push(sale.barberId);
  const w = sale.worker;
  if (w && typeof w === "object") {
    push((w as { _id?: unknown })._id);
    push((w as { id?: unknown }).id);
  }
  return out;
}

/** Sales recorded for this worker (matches RecordSaleModal / Sales worker fields). */
function saleBelongsToWorker(sale: Sale, worker: Barber): boolean {
  const wIds = workerIdCandidates(worker);
  const sIds = saleWorkerIdStrings(sale as unknown as Record<string, unknown>);
  for (const sid of sIds) {
    for (const wid of wIds) {
      if (idsEqual(sid, wid)) return true;
    }
  }
  const wName = (worker.name || "").trim().toLowerCase();
  const sName = ((sale.workerName || "") as string).trim().toLowerCase();
  if (wName && sName && wName === sName) return true;
  return false;
}

export default function Barbers() {
  const { toast } = useToast();
  const { t, language } = useTranslation();
  const { items, isLoading, add, update, remove, refresh } = useApi<Barber>({
    endpoint: "clients",
    defaultValue: [],
  });
  const {
    items: sales,
    isLoading: salesLoading,
    refresh: refreshSales,
    update: updateSale,
    remove: removeSale,
  } = useApi<Sale>({
    endpoint: "sales",
    defaultValue: [],
  });

  useEffect(() => {
    const reload = () => {
      void refreshSales(true);
    };
    window.addEventListener("sales-should-refresh", reload);
    window.addEventListener("sale-recorded", reload);
    return () => {
      window.removeEventListener("sales-should-refresh", reload);
      window.removeEventListener("sale-recorded", reload);
    };
  }, [refreshSales]);

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editingBarber, setEditingBarber] = useState<Barber | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [deletingWorkerId, setDeletingWorkerId] = useState<string | null>(null);
  const [deletingSaleId, setDeletingSaleId] = useState<string | null>(null);
  const [saleDialogOpen, setSaleDialogOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [saleServiceName, setSaleServiceName] = useState("");
  const [saleQuantity, setSaleQuantity] = useState("1");
  const [saleRevenue, setSaleRevenue] = useState("");
  const [saleDate, setSaleDate] = useState("");
  const [isSavingSale, setIsSavingSale] = useState(false);

  const workerSalesHistory = useMemo(() => {
    const map = new Map<string, Sale[]>();
    for (const b of items.filter((x) => x.clientType === "worker")) {
      const key = workerKey(b);
      const list = sales
        .filter((s) => saleBelongsToWorker(s, b))
        .sort((a, b) => {
          const ta = new Date(a.timestamp || a.date).getTime();
          const tb = new Date(b.timestamp || b.date).getTime();
          return tb - ta;
        });
      map.set(key, list);
    }
    return map;
  }, [items, sales]);

  const barbers = useMemo(() => {
    // Strictly keep barber/worker records only to avoid mixing with other client types
    const workers = items.filter((x) => x.clientType === "worker");
    if (!query.trim()) return workers;
    const q = query.toLowerCase();
    return workers.filter((x) =>
      `${x.name} ${x.businessType || ""}`.toLowerCase().includes(q)
    );
  }, [items, query]);

  const openCreate = () => {
    setEditingBarber(null);
    setName("");
    setCategory("");
    setOpen(true);
  };

  const openEdit = (barber: Barber) => {
    setEditingBarber(barber);
    setName(barber.name || "");
    setCategory(barber.businessType || "");
    setOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim() || !category.trim()) {
      toast({ title: "Missing Information", description: "Name and category are required.", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      if (editingBarber) {
        await update({
          ...editingBarber,
          name: name.trim(),
          businessType: category.trim(),
          clientType: "worker",
        } as any);
        toast({ title: "Worker Updated", description: "Worker updated successfully." });
      } else {
        await add({
          name: name.trim(),
          businessType: category.trim(),
          clientType: "worker",
        } as any);
        toast({ title: "Worker Added", description: "Worker created successfully." });
      }
      setName("");
      setCategory("");
      setEditingBarber(null);
      setOpen(false);
    } catch (error: any) {
      toast({
        title: "Save Failed",
        description: error?.message || "Failed to save worker. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getSaleId = (sale: Sale) =>
    String((sale as { _id?: string; id?: number })._id ?? sale.id ?? "");

  const handleDelete = async (barber: Barber): Promise<boolean> => {
    if (!window.confirm(`Delete ${barber.name}?`)) return false;
    const id = String((barber as { _id?: string; id?: number })._id ?? barber.id ?? "");
    if (!id) return false;
    setDeletingWorkerId(id);
    try {
      await remove(barber as any);
      await refresh(true);
      toast({ title: "Deleted", description: "Worker removed." });
      return true;
    } catch (error: any) {
      toast({
        title: "Delete Failed",
        description: error?.message || "Failed to delete worker. Please try again.",
        variant: "destructive",
      });
      return false;
    } finally {
      setDeletingWorkerId(null);
    }
  };

  const openEditSale = (sale: Sale) => {
    setEditingSale(sale);
    setSaleServiceName((sale.serviceName || sale.product || "").trim());
    setSaleQuantity(String(sale.quantity || 1));
    setSaleRevenue(String(sale.revenue ?? 0));
    const rawDate = sale.date || sale.timestamp;
    setSaleDate(rawDate ? new Date(rawDate).toISOString().slice(0, 10) : "");
    setSaleDialogOpen(true);
  };

  const handleSaveSale = async () => {
    if (!editingSale) return;
    const qty = parseInt(saleQuantity, 10);
    const revenue = parseFloat(saleRevenue);
    if (!saleServiceName.trim() || Number.isNaN(qty) || qty < 1 || Number.isNaN(revenue) || revenue < 0) {
      toast({
        title: "Invalid sale",
        description: "Enter a valid service name, quantity, and amount.",
        variant: "destructive",
      });
      return;
    }
    setIsSavingSale(true);
    try {
      const cost = Number((editingSale as Sale & { cost?: number }).cost ?? 0);
      await updateSale({
        ...editingSale,
        serviceName: saleServiceName.trim(),
        product: saleServiceName.trim(),
        quantity: qty,
        revenue,
        profit: revenue - cost,
        date: saleDate || editingSale.date,
      } as any);
      await refreshSales(true);
      window.dispatchEvent(new CustomEvent("sales-should-refresh"));
      toast({ title: "Sale updated", description: "History entry saved." });
      setSaleDialogOpen(false);
      setEditingSale(null);
    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error?.message || "Could not update sale.",
        variant: "destructive",
      });
    } finally {
      setIsSavingSale(false);
    }
  };

  const handleDeleteSale = async (sale: Sale) => {
    const label = (sale.serviceName || sale.product || "Sale").trim();
    if (!window.confirm(`Delete sale "${label}"?`)) return;
    const id = getSaleId(sale);
    if (!id) return;
    setDeletingSaleId(id);
    try {
      await removeSale(sale as any);
      await refreshSales(true);
      window.dispatchEvent(new CustomEvent("sales-should-refresh"));
      toast({ title: "Sale deleted", description: "History entry removed." });
    } catch (error: any) {
      toast({
        title: "Delete failed",
        description: error?.message || "Could not delete sale.",
        variant: "destructive",
      });
    } finally {
      setDeletingSaleId(null);
    }
  };

  const barbersTitle =
    language === "rw" ? "Abakozi" : language === "fr" ? "Travailleurs" : "Workers";
  const barberSingular =
    language === "rw" ? "Umukozi" : language === "fr" ? "Travailleur" : "Worker";
  const salesHistoryEmpty =
    language === "rw"
      ? "Nta bucuruzi"
      : language === "fr"
        ? "Aucune vente"
        : "No sales";
  const historyRowLabel =
    language === "rw" ? "#" : language === "fr" ? "#" : "#";
  const totalSalesLabel =
    language === "rw" ? "Byose" : language === "fr" ? "Total" : "Total";

  const maxHistoryRows = useMemo(() => {
    let max = 0;
    for (const b of barbers) {
      const len = workerSalesHistory.get(workerKey(b))?.length ?? 0;
      if (len > max) max = len;
    }
    return max;
  }, [barbers, workerSalesHistory]);

  const historyRowIndices = useMemo(
    () => Array.from({ length: maxHistoryRows }, (_, i) => i),
    [maxHistoryRows],
  );

  return (
    <AppLayout title={barbersTitle}>
      <div className="lg:bg-white lg:rounded-lg lg:overflow-hidden">
        <div className="lg:px-4 lg:py-4 flex-shrink-0 mb-4 lg:mb-0">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1 min-w-0">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`${t("search")} ${barbersTitle.toLowerCase()}...`}
                className="pl-9 h-10 bg-white border border-gray-300 text-gray-900 placeholder:text-gray-500 focus:border-gray-500 rounded-lg w-full"
                autoComplete="off"
              />
            </div>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white gap-2 rounded-lg px-4 h-10 shrink-0"
              onClick={openCreate}
            >
              <Plus size={16} />
              {t("add")} {barberSingular}
            </Button>
          </div>
        </div>

        {isLoading || salesLoading ? (
          <div className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead className="bg-gray-100 border-b border-gray-200">
                  <tr>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <th key={i} className="text-left py-4 px-6">
                        <Skeleton className="h-4 w-24" />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="border-b border-gray-200">
                      {Array.from({ length: 5 }).map((_, j) => (
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
        ) : barbers.length === 0 ? (
          <div className="px-4 py-5 text-sm text-muted-foreground">
            No workers found. Click <span className="font-semibold text-foreground">Add Worker</span> to create one.
          </div>
        ) : (
          <div className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead className="sticky top-0 z-10 bg-gray-100 border-b border-gray-200">
                  <tr>
                    <th className="text-left text-sm font-semibold text-gray-700 py-4 px-6 min-w-[56px] sticky left-0 z-20 bg-gray-100 border-r border-gray-200">
                      {historyRowLabel}
                    </th>
                    {barbers.map((b) => {
                      const rowKey = workerKey(b);
                      const history = workerSalesHistory.get(rowKey) ?? [];
                      return (
                        <th
                          key={rowKey}
                          className="text-left text-sm font-semibold text-gray-700 py-4 px-4 min-w-[340px]"
                        >
                          <button
                            type="button"
                            className="text-left hover:text-blue-600"
                            onClick={() => openEdit(b)}
                          >
                            <div>{b.name}</div>
                            <div className="text-xs font-normal text-gray-500 mt-0.5">
                              {b.businessType || "Worker"}
                              <span className="text-gray-400"> · </span>
                              <span className="text-blue-600 tabular-nums">{history.length}</span>
                            </div>
                          </button>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {maxHistoryRows === 0 ? (
                    <tr className="border-b border-gray-200">
                      <td className="py-4 px-6 text-sm text-gray-500 sticky left-0 z-10 bg-white border-r border-gray-200">
                        —
                      </td>
                      {barbers.map((b) => (
                        <td key={workerKey(b)} className="py-4 px-6 text-sm text-gray-500">
                          {salesHistoryEmpty}
                        </td>
                      ))}
                    </tr>
                  ) : (
                    historyRowIndices.map((rowIndex) => (
                      <tr
                        key={rowIndex}
                        className={cn(
                          "border-b border-gray-200",
                          rowIndex % 2 === 0 ? "bg-white" : "bg-gray-50",
                        )}
                      >
                        <td
                          className={cn(
                            "py-4 px-6 text-sm font-medium text-gray-600 tabular-nums sticky left-0 z-10 border-r border-gray-200",
                            rowIndex % 2 === 0 ? "bg-white" : "bg-gray-50",
                          )}
                        >
                          {rowIndex + 1}
                        </td>
                        {barbers.map((b) => {
                          const history = workerSalesHistory.get(workerKey(b)) ?? [];
                          const sale = history[rowIndex];
                          if (!sale) {
                            return (
                              <td key={workerKey(b)} className="py-4 px-6 text-sm text-gray-300">
                                —
                              </td>
                            );
                          }
                          const label = (sale.serviceName || sale.product || "Sale").trim();
                          const when = sale.timestamp || sale.date;
                          const saleId = getSaleId(sale);
                          const isDeletingSale = deletingSaleId !== null && saleId === deletingSaleId;
                          return (
                            <td key={workerKey(b)} className="py-3 px-4 align-middle">
                              <div className="flex items-center gap-2 min-w-[320px]">
                                <span className="text-sm font-medium text-gray-900 truncate min-w-0 max-w-[120px]">
                                  {label}
                                </span>
                                <span className="text-sm text-gray-700 tabular-nums whitespace-nowrap shrink-0">
                                  {Number(sale.revenue || 0).toLocaleString()} rwf
                                </span>
                                <span className="text-xs text-gray-500 whitespace-nowrap shrink-0">
                                  {formatDateWithTime(when)}
                                </span>
                                <div className="shrink-0 ml-auto">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0"
                                        aria-label="Sale actions"
                                      >
                                        {isDeletingSale ? (
                                          <Loader2 size={16} className="animate-spin" />
                                        ) : (
                                          <MoreVertical size={16} />
                                        )}
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={() => openEditSale(sale)}>
                                        <Pencil size={14} className="mr-2" />
                                        {language === "rw" ? "Hindura" : language === "fr" ? "Modifier" : "Edit"}
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => void handleDeleteSale(sale)}
                                        disabled={isDeletingSale}
                                        className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                      >
                                        <Trash2 size={14} className="mr-2" />
                                        {t("delete")}
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  )}
                  {maxHistoryRows > 0 && (
                    <tr className="border-t border-gray-200 bg-blue-50/70">
                      <td className="py-4 px-6 text-sm font-semibold text-gray-800 sticky left-0 z-10 bg-blue-50/70 border-r border-gray-200">
                        {totalSalesLabel}
                      </td>
                      {barbers.map((b) => {
                        const history = workerSalesHistory.get(workerKey(b)) ?? [];
                        const total = history.reduce((sum, s) => sum + Number(s.revenue || 0), 0);
                        return (
                          <td
                            key={workerKey(b)}
                            className="py-4 px-6 text-sm font-semibold text-gray-900 tabular-nums"
                          >
                            {total.toLocaleString()} rwf
                          </td>
                        );
                      })}
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <Dialog
        open={saleDialogOpen}
        onOpenChange={(next) => {
          if (!next && isSavingSale) return;
          setSaleDialogOpen(next);
          if (!next) setEditingSale(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {language === "rw" ? "Hindura ubucuruzi" : language === "fr" ? "Modifier la vente" : "Edit sale"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>{language === "rw" ? "Serivisi" : language === "fr" ? "Service" : "Service"}</Label>
              <Input
                value={saleServiceName}
                onChange={(e) => setSaleServiceName(e.target.value)}
                disabled={isSavingSale}
              />
            </div>
            <div className="space-y-1">
              <Label>{language === "rw" ? "Umubare" : language === "fr" ? "Quantité" : "Quantity"}</Label>
              <Input
                type="number"
                min="1"
                value={saleQuantity}
                onChange={(e) => setSaleQuantity(e.target.value)}
                disabled={isSavingSale}
              />
            </div>
            <div className="space-y-1">
              <Label>{language === "rw" ? "Amafaranga (rwf)" : language === "fr" ? "Montant (rwf)" : "Amount (rwf)"}</Label>
              <Input
                type="number"
                min="0"
                value={saleRevenue}
                onChange={(e) => setSaleRevenue(e.target.value)}
                disabled={isSavingSale}
              />
            </div>
            <div className="space-y-1">
              <Label>{language === "rw" ? "Itariki" : language === "fr" ? "Date" : "Date"}</Label>
              <Input
                type="date"
                value={saleDate}
                onChange={(e) => setSaleDate(e.target.value)}
                disabled={isSavingSale}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSaleDialogOpen(false);
                setEditingSale(null);
              }}
              disabled={isSavingSale}
            >
              {t("cancel")}
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white min-w-[7rem]"
              onClick={() => void handleSaveSale()}
              disabled={isSavingSale}
            >
              {isSavingSale ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {language === "rw" ? "Bika..." : language === "fr" ? "Enregistrement..." : "Saving..."}
                </>
              ) : (
                t("save")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next && isSaving) return;
          setOpen(next);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingBarber ? "Edit Worker" : "Add Worker"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. John"
                disabled={isSaving}
              />
            </div>
            <div className="space-y-1">
              <Label>Category</Label>
              <Input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Hair stylist, Nails"
                disabled={isSaving}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:justify-between">
            {editingBarber ? (
              <Button
                variant="outline"
                className="text-red-600 border-red-200 hover:bg-red-50 rounded-full"
                disabled={isSaving || deletingWorkerId !== null}
                onClick={async () => {
                  const deleted = await handleDelete(editingBarber);
                  if (!deleted) return;
                  setOpen(false);
                  setEditingBarber(null);
                  setName("");
                  setCategory("");
                }}
              >
                {deletingWorkerId ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  t("delete")
                )}
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setOpen(false);
                  setEditingBarber(null);
                  setName("");
                  setCategory("");
                }}
                className="rounded-full"
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-full min-w-[7rem]"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {editingBarber ? "Updating..." : "Saving..."}
                  </>
                ) : editingBarber ? (
                  "Update"
                ) : (
                  "Save"
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
