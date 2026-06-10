import { useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useApi } from "@/hooks/useApi";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Search, Pencil, Trash2, Loader2, ArrowUpDown, MoreVertical, ShoppingCart } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { RecordSaleModal } from "@/components/mobile/RecordSaleModal";
import { useTranslation } from "@/hooks/useTranslation";
import { cn } from "@/lib/utils";
import { DesktopDataTable, MobileDataList, MobileListCard } from "@/components/ui/mobile-list-card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
    const serviceItems = items.filter((x) => (x.category || "").toLowerCase() === "service");
    const list = !q ? [...serviceItems] : serviceItems.filter((x) => x.name.toLowerCase().includes(q));
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
      stock: 0,
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
  const priceLabel = language === "rw" ? "Igiciro" : language === "fr" ? "Prix" : "Price";
  const nameLabel = language === "rw" ? "Izina" : language === "fr" ? "Nom" : "Service";
  const actionsLabel = language === "rw" ? "Ibikorwa" : language === "fr" ? "Actions" : "Actions";
  const recordColumnLabel =
    language === "rw" ? "Andika" : language === "fr" ? "Enregistrer" : "Record";
  const totalLabel = language === "rw" ? "Byose" : language === "fr" ? "Total" : "Total";

  const totalPrice = useMemo(
    () => services.reduce((sum, s) => sum + (Number(s.sellingPrice) || 0), 0),
    [services],
  );

  const toolbar = (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
      <div className="relative flex-1 min-w-0">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`${t("search")} ${servicesTitle.toLowerCase()}...`}
          className="pl-9 h-10 bg-white border border-gray-300 text-gray-900 placeholder:text-gray-500 focus:border-gray-500 rounded-lg w-full"
          autoComplete="off"
        />
      </div>
      <div className="flex gap-2 shrink-0">
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as ServiceSort)}>
          <SelectTrigger
            className="w-full sm:w-[200px] h-10 bg-white border border-gray-300 rounded-lg"
            aria-label={sortTriggerLabel}
          >
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
        <Button
          className="bg-blue-600 hover:bg-blue-700 text-white gap-2 shrink-0 rounded-lg h-10"
          onClick={openCreate}
        >
          <Plus size={16} />
          <span className="hidden sm:inline">
            {t("add")} {serviceSingular}
          </span>
          <span className="sm:hidden">{t("add")}</span>
        </Button>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <AppLayout title={servicesTitle}>
        <div className="lg:bg-white lg:rounded-lg lg:overflow-hidden">
          <div className="lg:px-4 lg:py-4 mb-4 lg:mb-0">{toolbar}</div>
          <DesktopDataTable>
            <table className="w-full border-collapse">
              <thead className="bg-gray-100 border-b border-gray-200">
                <tr>
                  {[nameLabel, priceLabel, recordColumnLabel, actionsLabel].map((col) => (
                    <th key={col} className="text-left py-4 px-6">
                      <Skeleton className="h-4 w-20" />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white">
                {Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-200">
                    {Array.from({ length: 4 }).map((_, j) => (
                      <td key={j} className="py-4 px-6">
                        <Skeleton className="h-4 w-28" />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </DesktopDataTable>
          <MobileDataList>
            {Array.from({ length: 4 }).map((_, i) => (
              <MobileListCard key={i} index={i}>
                <Skeleton className="h-4 w-32 mb-2" />
                <Skeleton className="h-4 w-24" />
              </MobileListCard>
            ))}
          </MobileDataList>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={servicesTitle}>
      <div className="lg:bg-white lg:rounded-lg lg:overflow-hidden">
        <div className="lg:px-4 lg:py-4 mb-4 lg:mb-0">{toolbar}</div>

        {services.length === 0 ? (
          <div className="px-4 py-5 text-sm text-muted-foreground">No services found.</div>
        ) : (
          <>
            <DesktopDataTable>
              <table className="w-full border-collapse">
                <thead className="sticky top-0 z-10 bg-gray-100 border-b border-gray-200">
                  <tr>
                    <th className="text-left text-sm font-semibold text-gray-700 py-4 px-6">{nameLabel}</th>
                    <th className="text-left text-sm font-semibold text-gray-700 py-4 px-6">{priceLabel}</th>
                    <th className="text-left text-sm font-semibold text-gray-700 py-4 px-6">{recordColumnLabel}</th>
                    <th className="text-right text-sm font-semibold text-gray-700 py-4 px-6">{actionsLabel}</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {services.map((service, index) => {
                    const id = (service as { _id?: string; id?: number })._id || service.id;
                    const idStr = id != null ? String(id) : "";
                    const isDeletingThis = deletingId !== null && idStr === deletingId;
                    return (
                      <tr
                        key={id}
                        className={cn(
                          "border-b border-gray-200",
                          index % 2 === 0 ? "bg-white" : "bg-gray-50",
                        )}
                      >
                        <td className="py-4 px-6">
                          <div className="text-sm font-medium text-gray-900">{service.name}</div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-sm font-semibold text-gray-700 tabular-nums">
                            {Number(service.sellingPrice || 0).toLocaleString()} rwf
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <Button
                            type="button"
                            size="sm"
                            className="h-8 gap-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-3 text-xs font-medium"
                            onClick={() => openRecordService(service)}
                          >
                            <ShoppingCart size={14} />
                            {recordColumnLabel}
                          </Button>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                aria-label="Service actions"
                                disabled={isDeletingThis}
                              >
                                {isDeletingThis ? (
                                  <Loader2 size={16} className="animate-spin" />
                                ) : (
                                  <MoreVertical size={16} />
                                )}
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEdit(service)}>
                                <Pencil size={14} className="mr-2" />
                                {language === "rw" ? "Hindura" : language === "fr" ? "Modifier" : "Edit"}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => void handleDelete(service)}
                                disabled={isDeletingThis}
                                className="text-red-600 focus:text-red-600 focus:bg-red-50"
                              >
                                <Trash2 size={14} className="mr-2" />
                                {language === "rw" ? "Siba" : language === "fr" ? "Supprimer" : "Delete"}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="border-t border-gray-200 bg-blue-50/70">
                    <td className="py-4 px-6 text-sm font-semibold text-gray-800">{totalLabel}</td>
                    <td className="py-4 px-6 text-sm font-semibold text-gray-900 tabular-nums">
                      {totalPrice.toLocaleString()} rwf
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tbody>
              </table>
            </DesktopDataTable>

            <MobileDataList>
              {services.map((service, index) => {
                const id = (service as { _id?: string; id?: number })._id || service.id;
                const idStr = id != null ? String(id) : "";
                const isDeletingThis = deletingId !== null && idStr === deletingId;
                return (
                  <MobileListCard key={id} index={index}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{service.name}</p>
                        <p className="text-sm font-semibold text-gray-700 tabular-nums mt-0.5">
                          {Number(service.sellingPrice || 0).toLocaleString()} rwf
                        </p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 shrink-0"
                            aria-label="Service actions"
                            disabled={isDeletingThis}
                          >
                            {isDeletingThis ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : (
                              <MoreVertical size={16} />
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(service)}>
                            <Pencil size={14} className="mr-2" />
                            {language === "rw" ? "Hindura" : language === "fr" ? "Modifier" : "Edit"}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => void handleDelete(service)}
                            disabled={isDeletingThis}
                            className="text-red-600 focus:text-red-600 focus:bg-red-50"
                          >
                            <Trash2 size={14} className="mr-2" />
                            {language === "rw" ? "Siba" : language === "fr" ? "Supprimer" : "Delete"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      className="mt-3 w-full h-9 gap-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium"
                      onClick={() => openRecordService(service)}
                    >
                      <ShoppingCart size={14} />
                      {recordColumnLabel}
                    </Button>
                  </MobileListCard>
                );
              })}
              <MobileListCard className="bg-blue-50/70">
                <div className="flex items-center justify-between text-sm font-semibold">
                  <span className="text-gray-800">{totalLabel}</span>
                  <span className="text-gray-900 tabular-nums">{totalPrice.toLocaleString()} rwf</span>
                </div>
              </MobileListCard>
            </MobileDataList>
          </>
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
