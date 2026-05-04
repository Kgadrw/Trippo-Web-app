import { useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useApi } from "@/hooks/useApi";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Search, Pencil, Trash2, Scissors, Loader2, ArrowUpDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { RecordSaleModal } from "@/components/mobile/RecordSaleModal";
import { useTranslation } from "@/hooks/useTranslation";
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

interface ServiceItem {
  id?: number;
  _id?: string;
  name: string;
  sellingPrice: number;
  costPrice?: number;
  category?: string;
  stock?: number;
}

type ServiceSort = "default" | "name-asc" | "name-desc" | "price-asc" | "price-desc";

function serviceRowId(s: ServiceItem): string {
  return String((s as { _id?: string; id?: number })._id ?? s.id ?? s.name ?? "");
}

function compareServices(a: ServiceItem, b: ServiceItem, sort: ServiceSort): number {
  if (sort === "default") return 0;
  const nameA = (a.name || "").toLowerCase();
  const nameB = (b.name || "").toLowerCase();
  const priceA = Number(a.sellingPrice || 0);
  const priceB = Number(b.sellingPrice || 0);
  const idA = serviceRowId(a);
  const idB = serviceRowId(b);
  let primary = 0;
  switch (sort) {
    case "name-asc":
      primary = nameA.localeCompare(nameB, undefined, { sensitivity: "base" });
      break;
    case "name-desc":
      primary = nameB.localeCompare(nameA, undefined, { sensitivity: "base" });
      break;
    case "price-asc":
      primary = priceA - priceB;
      break;
    case "price-desc":
      primary = priceB - priceA;
      break;
    default:
      return 0;
  }
  if (primary !== 0) return primary;
  return idA.localeCompare(idB);
}

const Products = () => {
  const { toast } = useToast();
  const { t, language } = useTranslation();
  const { items, isLoading, add, update, remove, refresh } = useApi<ServiceItem>({
    endpoint: "products",
    defaultValue: [],
  });
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceItem | null>(null);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [recordModalOpen, setRecordModalOpen] = useState(false);
  const [prefillServiceName, setPrefillServiceName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<ServiceSort>("default");

  const services = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = !q ? [...items] : items.filter((x) => x.name.toLowerCase().includes(q));
    if (sortBy !== "default") {
      list.sort((a, b) => compareServices(a, b, sortBy));
    }
    return list;
  }, [items, query, sortBy]);

  const sortTriggerLabel =
    language === "rw"
      ? "Tunganya"
      : language === "fr"
        ? "Trier"
        : "Sort";
  const sortOptionLabels: Record<ServiceSort, { rw: string; fr: string; en: string }> = {
    default: {
      rw: "Uko byari",
      fr: "Ordre d'origine",
      en: "Default order",
    },
    "name-asc": {
      rw: "Izina (A → Z)",
      fr: "Nom (A → Z)",
      en: "Name (A–Z)",
    },
    "name-desc": {
      rw: "Izina (Z → A)",
      fr: "Nom (Z → A)",
      en: "Name (Z–A)",
    },
    "price-asc": {
      rw: "Igiciro (kirekire → kinini)",
      fr: "Prix (croissant)",
      en: "Price (low → high)",
    },
    "price-desc": {
      rw: "Igiciro (kinini → kirekire)",
      fr: "Prix (décroissant)",
      en: "Price (high → low)",
    },
  };
  const sortLang = language === "rw" ? "rw" : language === "fr" ? "fr" : "en";

  const openCreate = () => {
    setEditing(null);
    setName("");
    setPrice("");
    setOpen(true);
  };

  const openEdit = (item: ServiceItem) => {
    setEditing(item);
    setName(item.name);
    setPrice(String(item.sellingPrice || 0));
    setOpen(true);
  };

  const openRecordService = (item: ServiceItem) => {
    setPrefillServiceName(item.name || "");
    setRecordModalOpen(true);
  };

  const handleSave = async () => {
    const parsedPrice = Number(price);
    if (!name.trim() || Number.isNaN(parsedPrice) || parsedPrice <= 0) {
      toast({ title: "Invalid Input", description: "Enter a valid service name and price.", variant: "destructive" });
      return;
    }
    const payload = {
      name: name.trim(),
      sellingPrice: parsedPrice,
      costPrice: 0,
      category: "service",
      stock: 999999,
    } as ServiceItem;
    setIsSaving(true);
    try {
      if (editing) {
        await update({ ...editing, ...payload } as any);
        toast({ title: "Service Updated", description: "Service updated successfully." });
      } else {
        await add(payload as any);
        toast({ title: "Service Added", description: "Service created successfully." });
      }
      setOpen(false);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to save service.";
      toast({ title: "Save Failed", description: message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (item: ServiceItem) => {
    if (!window.confirm(`Delete service "${item.name}"?`)) return;
    const id = String((item as { _id?: string; id?: number })._id ?? item.id ?? "");
    if (!id) return;
    setDeletingId(id);
    try {
      await remove(item as any);
      await refresh(true);
      toast({ title: "Service Deleted", description: "Service removed successfully." });
      window.dispatchEvent(new CustomEvent("products-should-refresh"));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to delete service.";
      toast({ title: "Delete Failed", description: message, variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  const servicesTitle =
    language === "rw" ? "Serivisi" : language === "fr" ? "Services" : "Services";
  const serviceSingular =
    language === "rw" ? "Serivisi" : language === "fr" ? "Service" : "Service";

  if (isLoading) {
    return (
      <AppLayout title={servicesTitle}>
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <Skeleton className="h-10 flex-1 rounded-md" />
            <div className="flex gap-2 shrink-0">
              <Skeleton className="h-10 w-full sm:w-[200px] rounded-md" />
              <Skeleton className="h-10 w-36 rounded-md" />
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="rounded-lg border border-blue-700 bg-blue-600 p-2 flex flex-col gap-2 min-h-[88px]"
              >
                <div className="flex items-start justify-between gap-1.5">
                  <Skeleton className="h-3.5 w-[65%] bg-blue-500/50" />
                  <div className="flex gap-0.5 shrink-0">
                    <Skeleton className="h-7 w-7 rounded-md bg-blue-500/50" />
                    <Skeleton className="h-7 w-7 rounded-md bg-blue-500/50" />
                  </div>
                </div>
                <div className="mt-auto space-y-1 pt-0.5">
                  <Skeleton className="h-2.5 w-12 bg-blue-500/40" />
                  <Skeleton className="h-4 w-20 bg-blue-500/50" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={servicesTitle}>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative flex-1 min-w-0">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`${t("search")} ${servicesTitle.toLowerCase()}...`}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2 shrink-0">
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as ServiceSort)}>
              <SelectTrigger className="w-full sm:w-[200px] h-10 bg-background" aria-label={sortTriggerLabel}>
                <ArrowUpDown size={14} className="mr-1 shrink-0 text-muted-foreground" aria-hidden />
                <SelectValue placeholder={sortTriggerLabel} />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(sortOptionLabels) as ServiceSort[]).map((key) => (
                  <SelectItem key={key} value={key}>
                    {sortOptionLabels[key][sortLang]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2 shrink-0" onClick={openCreate}>
              <Plus size={16} />
              <span className="hidden sm:inline">{t("add")} {serviceSingular}</span>
              <span className="sm:hidden">{t("add")}</span>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
          {services.map((service) => {
            const id = (service as any)._id || service.id;
            const idStr = id != null ? String(id) : "";
            const isDeletingThis = deletingId !== null && idStr === deletingId;
            return (
              <div
                key={id}
                className="rounded-lg border border-blue-700 bg-blue-600 p-2 cursor-pointer transition-colors hover:bg-blue-700 hover:border-blue-800 shadow-sm flex flex-col relative overflow-hidden min-h-[88px]"
                onClick={() => openRecordService(service)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openRecordService(service);
                  }
                }}
                role="button"
                tabIndex={0}
                aria-label={`Record new service for ${service.name}`}
              >
                <img
                  src="/logo.png"
                  alt=""
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 m-auto h-14 w-14 opacity-[0.07] select-none object-contain"
                />
                <div className="flex items-start justify-between gap-1.5">
                  <div className="flex items-start gap-1.5 font-medium text-white text-sm min-w-0 flex-1 leading-snug">
                    <Scissors size={14} className="mt-0.5 shrink-0 text-blue-100" />
                    <span className="line-clamp-2 break-words">{service.name}</span>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-white hover:bg-blue-500/60 hover:text-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEdit(service);
                      }}
                    >
                      <Pencil size={13} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-red-200 hover:bg-red-500/30 hover:text-white"
                      disabled={isDeletingThis}
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleDelete(service);
                      }}
                      aria-label={isDeletingThis ? "Deleting" : "Delete service"}
                    >
                      {isDeletingThis ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <Trash2 size={13} />
                      )}
                    </Button>
                  </div>
                </div>
                <div className="mt-auto pt-1.5">
                  <div className="text-[10px] uppercase tracking-wide text-blue-100">
                    {language === "rw" ? "Igiciro" : language === "fr" ? "Prix" : "Price"}
                  </div>
                  <div className="text-sm font-semibold text-white whitespace-nowrap tabular-nums">
                    {Number(service.sellingPrice || 0).toLocaleString()} rwf
                  </div>
                </div>
              </div>
            );
          })}
        </div>
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
            <DialogTitle>{editing ? "Edit Service" : "Add Service"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Service Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Hair Cut"
                disabled={isSaving}
              />
            </div>
            <div className="space-y-1">
              <Label>Price</Label>
              <Input
                type="number"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0"
                disabled={isSaving}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white min-w-[7rem]"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {editing ? "Updating..." : "Saving..."}
                </>
              ) : editing ? (
                "Update"
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <RecordSaleModal
        open={recordModalOpen}
        onOpenChange={setRecordModalOpen}
        initialServiceName={prefillServiceName}
      />
    </AppLayout>
  );
};

export default Products;
