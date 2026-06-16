import { useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useApi } from "@/hooks/useApi";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input, searchBarInputClass } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Search, Pencil, Trash2, Loader2, ArrowUpDown, MoreVertical, ShoppingCart, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { RecordSaleModal } from "@/components/mobile/RecordSaleModal";
import { useTranslation } from "@/hooks/useTranslation";
import { useConfirmAlert } from "@/hooks/useConfirmAlert";
import { cn } from "@/lib/utils";
import { MobileListSearchFilters } from "@/components/ui/mobile-list-search-filters";
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
  filterSelectClass,
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
type PriceFilter = "all" | "under-5000" | "5000-20000" | "over-20000";
type AddMode = "single" | "bulk";

interface BulkServiceRow {
  name: string;
  price: string;
}

const emptyBulkRow = (): BulkServiceRow => ({ name: "", price: "" });

function compareServices(a: ServiceItem, b: ServiceItem, sort: ServiceSort): number {
  if (sort === "default") return 0;
  const nameA = (a.name || "").toLowerCase();
  const nameB = (b.name || "").toLowerCase();
  const priceA = Number(a.sellingPrice || 0);
  const priceB = Number(b.sellingPrice || 0);
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
  const { t } = useTranslation();
  const { requestConfirm, confirmDialog } = useConfirmAlert();
  const { items, isLoading, add, update, remove, refresh } = useApi<ServiceItem>({
    endpoint: "products",
    defaultValue: [],
  });
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceItem | null>(null);
  const [addMode, setAddMode] = useState<AddMode>("single");
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [bulkRows, setBulkRows] = useState<BulkServiceRow[]>([emptyBulkRow()]);
  const [recordModalOpen, setRecordModalOpen] = useState(false);
  const [prefillServiceName, setPrefillServiceName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<ServiceSort>("default");
  const [priceFilter, setPriceFilter] = useState<PriceFilter>("all");
  const [showFilters, setShowFilters] = useState(false);

  const matchesPriceFilter = (price: number, filter: PriceFilter) => {
    if (filter === "all") return true;
    if (filter === "under-5000") return price < 5000;
    if (filter === "5000-20000") return price >= 5000 && price <= 20000;
    return price > 20000;
  };

  const services = useMemo(() => {
    const q = query.trim().toLowerCase();
    const serviceItems = items.filter((x) => (x.category || "").toLowerCase() === "service");
    let list = !q ? [...serviceItems] : serviceItems.filter((x) => x.name.toLowerCase().includes(q));
    if (priceFilter !== "all") {
      list = list.filter((x) => matchesPriceFilter(Number(x.sellingPrice) || 0, priceFilter));
    }
    if (sortBy !== "default") {
      list.sort((a, b) => compareServices(a, b, sortBy));
    }
    return list;
  }, [items, query, sortBy, priceFilter]);

  const sortOptionLabels: Record<ServiceSort, string> = {
    default: t("defaultSortOrder"),
    "name-asc": t("nameAsc"),
    "name-desc": t("nameDesc"),
    "price-asc": t("priceAsc"),
    "price-desc": t("priceDesc"),
  };

  const openCreate = () => {
    setEditing(null);
    setAddMode("single");
    setName("");
    setPrice("");
    setBulkRows([emptyBulkRow()]);
    setOpen(true);
  };

  const addBulkRow = () => {
    setBulkRows((rows) => [...rows, emptyBulkRow()]);
  };

  const removeBulkRow = (index: number) => {
    setBulkRows((rows) => (rows.length > 1 ? rows.filter((_, i) => i !== index) : rows));
  };

  const updateBulkRow = (index: number, field: keyof BulkServiceRow, value: string) => {
    setBulkRows((rows) => {
      const next = [...rows];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
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

  const buildServicePayload = (serviceName: string, servicePrice: number): ServiceItem =>
    ({
      name: serviceName.trim(),
      sellingPrice: servicePrice,
      costPrice: 0,
      category: "service",
      stock: 0,
    }) as ServiceItem;

  const handleSave = async () => {
    if (editing) {
      const parsedPrice = Number(price);
      if (!name.trim() || Number.isNaN(parsedPrice) || parsedPrice <= 0) {
        toast({ title: t("invalidInput"), description: t("validServiceRequired"), variant: "destructive" });
        return;
      }
      setIsSaving(true);
      try {
        await update({ ...editing, ...buildServicePayload(name, parsedPrice) } as ServiceItem);
        toast({ title: t("serviceUpdated"), description: t("changesSaved") });
        setOpen(false);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed to save service.";
        toast({ title: t("failed"), description: message, variant: "destructive" });
      } finally {
        setIsSaving(false);
      }
      return;
    }

    if (addMode === "bulk") {
      const servicesToAdd = bulkRows
        .map((row) => {
          const parsedPrice = Number(row.price);
          if (!row.name.trim() || Number.isNaN(parsedPrice) || parsedPrice <= 0) return null;
          return buildServicePayload(row.name, parsedPrice);
        })
        .filter((row): row is ServiceItem => row !== null);

      if (servicesToAdd.length === 0) {
        toast({ title: t("invalidInput"), description: t("validServiceRequired"), variant: "destructive" });
        return;
      }

      setIsSaving(true);
      try {
        for (const service of servicesToAdd) {
          await add(service);
        }
        toast({
          title: t("serviceAdded"),
          description: `${servicesToAdd.length} ${servicesTitle.toLowerCase()}`,
        });
        window.dispatchEvent(new CustomEvent("products-should-refresh"));
        setOpen(false);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed to save services.";
        toast({ title: t("failed"), description: message, variant: "destructive" });
      } finally {
        setIsSaving(false);
      }
      return;
    }

    const parsedPrice = Number(price);
    if (!name.trim() || Number.isNaN(parsedPrice) || parsedPrice <= 0) {
      toast({ title: t("invalidInput"), description: t("validServiceRequired"), variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      await add(buildServicePayload(name, parsedPrice));
      toast({ title: t("serviceAdded"), description: t("productSaved") });
      setOpen(false);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to save service.";
      toast({ title: t("failed"), description: message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const performDelete = async (item: ServiceItem) => {
    const id = String((item as { _id?: string; id?: number })._id ?? item.id ?? "");
    if (!id) return;
    setDeletingId(id);
    try {
      await remove(item as ServiceItem);
      await refresh(true);
      toast({ title: t("serviceDeleted"), description: t("deleted") });
      window.dispatchEvent(new CustomEvent("products-should-refresh"));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to delete service.";
      toast({ title: t("failed"), description: message, variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  const handleDelete = (item: ServiceItem) => {
    requestConfirm({
      title: t("confirmDelete"),
      description: t("deleteNamedItemConfirm").replace("{name}", item.name),
      confirmLabel: t("yesDelete"),
      cancelLabel: t("noCancel"),
      onConfirm: () => performDelete(item),
    });
  };

  const servicesTitle = t("services");
  const nameLabel = t("name");
  const priceLabel = t("price");
  const actionsLabel = t("actions");

  const filterControls = (
    <div className="space-y-3">
      <Select value={priceFilter} onValueChange={(v) => setPriceFilter(v as PriceFilter)}>
        <SelectTrigger className={cn("w-full h-10 rounded-lg", filterSelectClass)}>
          <SelectValue placeholder={t("price")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("allPrices")}</SelectItem>
          <SelectItem value="under-5000">{t("filterPriceUnder5k")}</SelectItem>
          <SelectItem value="5000-20000">{t("filterPrice5kTo20k")}</SelectItem>
          <SelectItem value="over-20000">{t("filterPriceOver20k")}</SelectItem>
        </SelectContent>
      </Select>
      <Select value={sortBy} onValueChange={(v) => setSortBy(v as ServiceSort)}>
        <SelectTrigger className={cn("w-full h-10 rounded-lg", filterSelectClass)}>
          <div className="flex items-center gap-2">
            <ArrowUpDown size={14} className="text-gray-400" />
            <SelectValue placeholder={t("sortBy")} />
          </div>
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(sortOptionLabels) as ServiceSort[]).map((key) => (
            <SelectItem key={key} value={key}>
              {sortOptionLabels[key]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  const addServiceButton = (
    <Button
      className="bg-primary text-white hover:bg-blue-700 hover:text-white gap-2 shrink-0 rounded-lg h-10 px-3"
      onClick={openCreate}
    >
      <Plus size={18} />
      <span className="sr-only">{t("add")}</span>
    </Button>
  );

  const filterBar = (
    <>
      <MobileListSearchFilters
        searchValue={query}
        onSearchChange={setQuery}
        searchPlaceholder={`${t("search")} ${servicesTitle.toLowerCase()}...`}
        showFilters={showFilters}
        onToggleFilters={() => setShowFilters((v) => !v)}
        filters={filterControls}
        trailing={addServiceButton}
        searchName="search-services"
      />
      <div className="hidden lg:flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`${t("search")} ${servicesTitle.toLowerCase()}...`}
            className={searchBarInputClass}
            autoComplete="off"
          />
        </div>
        <Select value={priceFilter} onValueChange={(v) => setPriceFilter(v as PriceFilter)}>
          <SelectTrigger className={cn("w-[180px] h-10 rounded-lg shrink-0", filterSelectClass)}>
            <SelectValue placeholder={t("price")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allPrices")}</SelectItem>
            <SelectItem value="under-5000">{t("filterPriceUnder5k")}</SelectItem>
            <SelectItem value="5000-20000">{t("filterPrice5kTo20k")}</SelectItem>
            <SelectItem value="over-20000">{t("filterPriceOver20k")}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as ServiceSort)}>
          <SelectTrigger className={cn("w-[200px] h-10 rounded-lg shrink-0", filterSelectClass)}>
            <div className="flex items-center gap-2">
              <ArrowUpDown size={14} className="text-gray-400" />
              <SelectValue placeholder={t("sortBy")} />
            </div>
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(sortOptionLabels) as ServiceSort[]).map((key) => (
              <SelectItem key={key} value={key}>
                {sortOptionLabels[key]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          className="bg-primary text-white hover:bg-blue-700 hover:text-white gap-2 shrink-0 rounded-lg h-10"
          onClick={openCreate}
        >
          <Plus size={16} />
          <span>{t("addService")}</span>
        </Button>
      </div>
    </>
  );

  const renderServicesTable = (compact = false) => {
    const thClass = compact
      ? "text-left text-xs font-semibold text-gray-700 py-2 px-2"
      : "text-left text-sm font-semibold text-gray-700 py-4 px-6";
    const tdClass = compact ? "py-2 px-2" : "py-4 px-6";

    return (
      <table className="w-full border-collapse">
        <thead className="sticky top-0 z-10 bg-gray-100 border-b border-gray-200">
          <tr>
            <th className={thClass}>{nameLabel}</th>
            <th className={thClass}>{priceLabel}</th>
            <th className={cn(thClass, "text-right")}>{actionsLabel}</th>
          </tr>
        </thead>
        <tbody className="bg-white">
          {services.length > 0 ? (
            services.map((service, index) => {
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
                  <td className={tdClass}>
                    <div className={cn("text-gray-900", compact ? "text-xs font-medium" : "text-sm")}>
                      {service.name}
                    </div>
                  </td>
                  <td className={tdClass}>
                    <div className={cn("text-gray-700 tabular-nums", compact ? "text-xs" : "text-sm")}>
                      {Number(service.sellingPrice || 0).toLocaleString()} rwf
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
                        <DropdownMenuItem onClick={() => openRecordService(service)}>
                          <ShoppingCart size={14} className="mr-2" />
                          {t("record")}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEdit(service)}>
                          <Pencil size={14} className="mr-2" />
                          {t("edit")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => void handleDelete(service)}
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
              <td colSpan={3} className={cn(tdClass, "py-12 text-center")}>
                <div className="flex flex-col items-center justify-center text-gray-400">
                  <ShoppingCart size={48} className="mb-4 opacity-50" />
                  <p className="text-base font-medium">{t("noServicesFound")}</p>
                  <p className="text-sm mt-1">{t("noProductsSearchHint")}</p>
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
      <AppLayout title={servicesTitle}>
        <div className="flex flex-col min-h-0 pb-4 lg:pb-4">
          <div className="lg:bg-white lg:flex-1 lg:flex lg:flex-col lg:min-h-0 lg:overflow-hidden rounded-lg">
            <div className="lg:bg-white lg:border-b lg:border-gray-200 lg:px-4 lg:py-4 flex-shrink-0">
              {filterBar}
            </div>
            <div className="hidden lg:block overflow-auto flex-1 pb-4">
              <table className="w-full border-collapse">
                <thead className="sticky top-0 z-10 bg-gray-100 border-b border-gray-200">
                  <tr>
                    {[nameLabel, priceLabel, actionsLabel].map((col) => (
                      <th key={col} className="text-left text-sm font-semibold text-gray-700 py-4 px-6">
                        <Skeleton className="h-4 w-20" />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="border-b border-gray-200">
                      {Array.from({ length: 3 }).map((_, j) => (
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
    <AppLayout title={servicesTitle}>
      <div className="flex flex-col min-h-0 pb-4 lg:pb-4">
        <div className="lg:bg-white lg:flex-1 lg:flex lg:flex-col lg:min-h-0 lg:overflow-hidden rounded-lg">
          <div className="lg:bg-white lg:border-b lg:border-gray-200 lg:px-4 lg:py-4 flex-shrink-0 mb-4 lg:mb-0">
            {filterBar}
            <div className="mt-3 text-xs text-gray-500 lg:block hidden">
              {services.length} {servicesTitle.toLowerCase()}
            </div>
          </div>

          <div className="hidden lg:block overflow-auto flex-1 pb-4">
            {renderServicesTable(false)}
          </div>

          <div className="lg:hidden mt-4 pb-20">
            <div className="overflow-auto">
              <div className="min-w-full">{renderServicesTable(true)}</div>
            </div>
          </div>
        </div>
      </div>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next && isSaving) return;
          setOpen(next);
        }}
      >
        <DialogContent className={cn("sm:max-w-md", !editing && addMode === "bulk" && "sm:max-w-lg")}>
          <DialogHeader>
            <DialogTitle>
              {editing ? t("editService") : addMode === "bulk" ? t("bulkAdd") : t("addService")}
            </DialogTitle>
          </DialogHeader>

          {!editing && (
            <div className="flex gap-2">
              <Button
                type="button"
                variant={addMode === "single" ? "default" : "outline"}
                onClick={() => setAddMode("single")}
                className={cn(addMode === "single" && "bg-primary text-white hover:bg-blue-700 hover:text-white")}
                disabled={isSaving}
              >
                {t("addService")}
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

          <div className="space-y-3 py-2 max-h-[min(60vh,28rem)] overflow-y-auto">
            {editing || addMode === "single" ? (
              <>
                <div className="space-y-1">
                  <Label>{t("serviceName")}</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Hair Cut"
                    disabled={isSaving}
                  />
                </div>
                <div className="space-y-1">
                  <Label>{t("price")}</Label>
                  <Input
                    type="number"
                    min="0"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="0"
                    disabled={isSaving}
                  />
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <p className="text-sm text-muted-foreground">{t("addMultipleServices")}</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addBulkRow}
                    disabled={isSaving}
                    className="shrink-0 gap-1"
                  >
                    <Plus size={14} />
                    {t("addService")}
                  </Button>
                </div>
                {bulkRows.map((row, index) => (
                  <div
                    key={index}
                    className="rounded-lg border border-gray-300 p-3 space-y-2 bg-white shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-600">
                        {t("serviceName")} #{index + 1}
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
                        placeholder="e.g. Hair Cut"
                        disabled={isSaving}
                      />
                      <Input
                        type="number"
                        min="0"
                        value={row.price}
                        onChange={(e) => updateBulkRow(index, "price", e.target.value)}
                        placeholder="0"
                        disabled={isSaving}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
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
                  {editing ? t("updating") : t("saving")}
                </>
              ) : editing ? (
                t("update")
              ) : addMode === "bulk" ? (
                t("addServicesBtn")
              ) : (
                t("save")
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
      {confirmDialog}
    </AppLayout>
  );
};

export default Products;
