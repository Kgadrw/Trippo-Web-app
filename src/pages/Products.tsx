import { useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useApi } from "@/hooks/useApi";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Search, Pencil, Trash2, Scissors, Loader2 } from "lucide-react";
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
import { cn } from "@/lib/utils";

/** Same gradient as dashboard KPI “Services Today” (Index.tsx) */
const SERVICE_CARD_CLASS =
  "bg-gradient-to-br from-sky-600 to-blue-700 border border-blue-600/30 shadow-sm hover:shadow-md";

interface ServiceItem {
  id?: number;
  _id?: string;
  name: string;
  sellingPrice: number;
  costPrice?: number;
  category?: string;
  stock?: number;
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

  const services = useMemo(() => {
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter((x) => x.name.toLowerCase().includes(q));
  }, [items, query]);

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
          <div className="flex items-center gap-2">
            <Skeleton className="h-10 flex-1 rounded-md" />
            <Skeleton className="h-10 w-36 shrink-0 rounded-md" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "rounded-xl p-3 flex flex-col aspect-square md:aspect-[4/3] lg:aspect-[5/3] gap-3 border",
                  SERVICE_CARD_CLASS
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <Skeleton className="h-4 w-[70%] bg-white/25" />
                  <div className="flex gap-1 shrink-0">
                    <Skeleton className="h-8 w-8 rounded-md bg-white/25" />
                    <Skeleton className="h-8 w-8 rounded-md bg-white/25" />
                  </div>
                </div>
                <div className="mt-auto space-y-2 pt-2">
                  <Skeleton className="h-3 w-16 bg-white/25" />
                  <Skeleton className="h-5 w-24 bg-white/25" />
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
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`${t("search")} ${servicesTitle.toLowerCase()}...`}
              className="pl-9"
            />
          </div>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2" onClick={openCreate}>
            <Plus size={16} />
            {t("add")} {serviceSingular}
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {services.map((service) => {
            const id = (service as any)._id || service.id;
            const idStr = id != null ? String(id) : "";
            const isDeletingThis = deletingId !== null && idStr === deletingId;
            return (
              <div
                key={id}
                className={cn(
                  "rounded-xl p-3 md:p-2 cursor-pointer transition-all hover:brightness-110 aspect-square md:aspect-[4/3] lg:aspect-[5/3] flex flex-col relative overflow-hidden border",
                  SERVICE_CARD_CLASS
                )}
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
                  className="pointer-events-none absolute inset-0 m-auto h-24 w-24 opacity-[0.12] select-none object-contain"
                />
                <div className="relative z-10 flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 font-medium text-white min-w-0 flex-1">
                    <Scissors size={16} className="mt-0.5 shrink-0 text-white/90" />
                    <span className="line-clamp-2 break-words">{service.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-white hover:bg-white/20"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEdit(service);
                      }}
                    >
                      <Pencil size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-red-200 hover:bg-red-950/30"
                      disabled={isDeletingThis}
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleDelete(service);
                      }}
                      aria-label={isDeletingThis ? "Deleting" : "Delete service"}
                    >
                      {isDeletingThis ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Trash2 size={14} />
                      )}
                    </Button>
                  </div>
                </div>
                <div className="relative z-10 mt-auto pt-3">
                  <div className="text-[11px] text-white/75">
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
