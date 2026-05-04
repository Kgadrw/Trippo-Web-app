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
import { Plus, Search, Trash2, UserRound, Pencil, Loader2, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
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
  const { items: sales, isLoading: salesLoading, refresh: refreshSales } = useApi<Sale>({
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
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedWorkerKey, setExpandedWorkerKey] = useState<string | null>(null);

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

  const handleDelete = async (barber: Barber) => {
    if (!window.confirm(`Delete ${barber.name}?`)) return;
    const id = String((barber as { _id?: string; id?: number })._id ?? barber.id ?? "");
    if (!id) return;
    setDeletingId(id);
    try {
      await remove(barber as any);
      await refresh(true);
      toast({ title: "Deleted", description: "Worker removed." });
    } catch (error: any) {
      toast({
        title: "Delete Failed",
        description: error?.message || "Failed to delete worker. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const barbersTitle =
    language === "rw" ? "Abakozi" : language === "fr" ? "Travailleurs" : "Workers";
  const barberSingular =
    language === "rw" ? "Umukozi" : language === "fr" ? "Travailleur" : "Worker";
  const salesHistoryTitle =
    language === "rw"
      ? "Amateka y'ubucuruzi"
      : language === "fr"
        ? "Historique des ventes"
        : "Sales history";
  const salesHistoryLoading =
    language === "rw"
      ? "Gutangiza amateka y'ubucuruzi…"
      : language === "fr"
        ? "Chargement de l'historique des ventes…"
        : "Loading sales history…";
  const salesHistoryEmpty =
    language === "rw"
      ? "Nta bucuruzi bwanditswe kuri uyu mukozi."
      : language === "fr"
        ? "Aucune vente enregistrée pour ce travailleur."
        : "No sales recorded for this worker yet.";

  return (
    <AppLayout title={barbersTitle}>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`${t("search")} ${barbersTitle.toLowerCase()}...`}
              className="pl-9 rounded-full"
            />
          </div>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2 rounded-full" onClick={openCreate}>
            <Plus size={16} />
            {t("add")} {barberSingular}
          </Button>
        </div>

        {isLoading ? (
          <div className="rounded-lg border border-gray-200 bg-white overflow-hidden divide-y divide-gray-100 shadow-sm">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white px-3 py-2.5 flex items-center gap-2">
                <Skeleton className="h-4 w-4 shrink-0 rounded bg-muted" />
                <Skeleton className="h-8 w-8 shrink-0 rounded-full bg-muted" />
                <div className="flex-1 space-y-2 min-w-0">
                  <Skeleton className="h-3.5 w-[55%] bg-muted" />
                  <Skeleton className="h-3 w-[40%] bg-muted/80" />
                </div>
                <Skeleton className="h-7 w-14 shrink-0 rounded-md bg-muted" />
              </div>
            ))}
          </div>
        ) : barbers.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white px-4 py-5 text-sm text-muted-foreground">
            No workers found. Click <span className="font-semibold text-foreground">Add Worker</span> to create one.
          </div>
        ) : (
          <div className="rounded-lg border border-gray-200 bg-white overflow-hidden divide-y divide-gray-100 shadow-sm">
            {barbers.map((b) => {
              const id = (b as { _id?: string; id?: number })._id ?? b.id;
              const idStr = id != null ? String(id) : "";
              const isDeletingThis = deletingId !== null && idStr === deletingId;
              const rowKey = workerKey(b);
              const isOpen = expandedWorkerKey === rowKey;
              const history = workerSalesHistory.get(rowKey) ?? [];

              return (
                <div key={rowKey} className="bg-white">
                  <div
                    role="button"
                    tabIndex={0}
                    aria-expanded={isOpen}
                    aria-label={isOpen ? `Collapse ${salesHistoryTitle} for ${b.name}` : `Expand ${salesHistoryTitle} for ${b.name}`}
                    className="flex items-center gap-2 px-3 py-2.5 cursor-pointer transition-colors hover:bg-gray-50 outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 focus-visible:ring-inset"
                    onClick={() => setExpandedWorkerKey(isOpen ? null : rowKey)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setExpandedWorkerKey(isOpen ? null : rowKey);
                      }
                    }}
                  >
                    <ChevronRight
                      size={18}
                      className={cn("shrink-0 text-gray-500 transition-transform", isOpen && "rotate-90")}
                      aria-hidden
                    />
                    <UserRound size={16} className="shrink-0 text-gray-500" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-gray-900 truncate">{b.name}</div>
                      <div className="text-xs text-gray-600 truncate">{b.businessType || "Worker"}</div>
                    </div>
                    <div
                      className="flex items-center gap-0.5 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-gray-700 hover:bg-gray-100 rounded-md"
                        onClick={() => openEdit(b)}
                        aria-label="Edit worker"
                      >
                        <Pencil size={13} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-red-600 hover:bg-red-50 rounded-md"
                        disabled={isDeletingThis}
                        onClick={() => void handleDelete(b)}
                        aria-label={isDeletingThis ? "Deleting" : "Delete worker"}
                      >
                        {isDeletingThis ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <Trash2 size={13} />
                        )}
                      </Button>
                    </div>
                  </div>

                  {isOpen && (
                    <div className="border-t border-gray-100 bg-gray-50/80 px-3 py-2.5">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-2">
                        {salesHistoryTitle}
                        {!salesLoading && history.length > 0 ? (
                          <span className="ml-1 font-normal normal-case text-gray-600">({history.length})</span>
                        ) : null}
                      </div>
                      {salesLoading ? (
                        <p className="text-xs text-gray-600">{salesHistoryLoading}</p>
                      ) : history.length === 0 ? (
                        <p className="text-xs text-gray-600">{salesHistoryEmpty}</p>
                      ) : (
                        <ul className="max-h-60 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                          {history.map((sale) => {
                            const sid = (sale as { _id?: string; id?: number })._id ?? sale.id;
                            const label = (sale.serviceName || sale.product || "Sale").trim();
                            const when = sale.timestamp || sale.date;
                            return (
                              <li
                                key={sid != null ? String(sid) : `${label}-${when}`}
                                className="text-xs rounded-md bg-white border border-gray-200 px-2.5 py-2 text-gray-900 shadow-sm"
                              >
                                <div className="font-medium leading-snug">{label}</div>
                                <div className="mt-1 flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5 text-gray-600">
                                  <span className="tabular-nums font-semibold text-gray-900">
                                    {Number(sale.revenue || 0).toLocaleString()} rwf
                                  </span>
                                  <span className="text-[10px] text-gray-500">{formatDateWithTime(when)}</span>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

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
          <DialogFooter>
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
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
