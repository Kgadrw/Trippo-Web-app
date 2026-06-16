import { useMemo, useState, useCallback, useEffect } from "react";

import { AppLayout } from "@/components/layout/AppLayout";

import { Button } from "@/components/ui/button";

import { useApi } from "@/hooks/useApi";

import { useToast } from "@/hooks/use-toast";

import { Plus, Search, MoreVertical, Pencil, Trash2, Loader2, ArrowUpDown } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { Input, searchBarInputClass } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  filterSelectClass,
} from "@/components/ui/select";

import { cn } from "@/lib/utils";
import { MobileListSearchFilters } from "@/components/ui/mobile-list-search-filters";
import { useTranslation } from "@/hooks/useTranslation";
import { useConfirmAlert } from "@/hooks/useConfirmAlert";
import { useIsDesktopLg } from "@/hooks/use-mobile";
import { DesktopDataTable, MobileDataList, MobileListCard } from "@/components/ui/mobile-list-card";
import { SpreadsheetEditor } from "@/components/ui/spreadsheet-editor";
import {
  buildSpreadsheetRows,
  ensureTrailingEmptyRows,
  isSpreadsheetRowEmpty,
  type SpreadsheetRow,
} from "@/lib/spreadsheet";
import { useSpreadsheetAutoSave } from "@/hooks/useSpreadsheetAutoSave";
import { useSpreadsheetInit } from "@/hooks/useSpreadsheetInit";
import { useSpreadsheetStockSync } from "@/hooks/useSpreadsheetStockSync";
import { useAddSheetRow } from "@/hooks/useAddSheetRow";
import { AddEntryButton } from "@/components/ui/add-entry-button";

const INVENTORY_SHEET_KEYS = ["name", "category", "costPrice", "sellingPrice", "stock", "minStock"] as const;

const DEFAULT_MIN_STOCK = 5;

type StockFilter = "all" | "low" | "out";
type InventorySort = "default" | "name-asc" | "name-desc" | "stock-asc" | "stock-desc" | "price-asc" | "price-desc";

function compareInventoryProducts(a: InventoryProduct, b: InventoryProduct, sort: InventorySort, stockA: number, stockB: number): number {
  if (sort === "default") return 0;
  const nameA = (a.name || "").toLowerCase();
  const nameB = (b.name || "").toLowerCase();
  const priceA = Number(a.sellingPrice) || 0;
  const priceB = Number(b.sellingPrice) || 0;
  let primary = 0;
  switch (sort) {
    case "name-asc":
      primary = nameA.localeCompare(nameB, undefined, { sensitivity: "base" });
      break;
    case "name-desc":
      primary = nameB.localeCompare(nameA, undefined, { sensitivity: "base" });
      break;
    case "stock-asc":
      primary = stockA - stockB;
      break;
    case "stock-desc":
      primary = stockB - stockA;
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
  return getIdString(a).localeCompare(getIdString(b));
}

import { AddProductModal, type InventoryProduct } from "@/components/inventories/AddProductModal";

import {

  DropdownMenu,

  DropdownMenuContent,

  DropdownMenuItem,

  DropdownMenuTrigger,

} from "@/components/ui/dropdown-menu";



const getIdString = (x: { _id?: string; id?: number }) => String(x._id ?? x.id ?? "");



const isService = (p: InventoryProduct) => (p.category || "").toLowerCase() === "service";



const Inventories = () => {

  const { toast } = useToast();
  const { t } = useTranslation();
  const { requestConfirm, confirmDialog } = useConfirmAlert();

  const [addModalOpen, setAddModalOpen] = useState(false);

  const [editingProduct, setEditingProduct] = useState<InventoryProduct | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const showSpreadsheet = useIsDesktopLg();
  const [sheetRows, setSheetRows] = useState<SpreadsheetRow[]>([]);
  const { focusRowId, addRow, clearFocus } = useAddSheetRow(setSheetRows, INVENTORY_SHEET_KEYS);
  const [flashStockIds, setFlashStockIds] = useState<Set<string>>(() => new Set());
  const [optimisticStock, setOptimisticStock] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<InventorySort>("default");

  const { items: products, isLoading, refresh, remove, add, update } = useApi<InventoryProduct>({

    endpoint: "products",

    defaultValue: [],

  });



  const stockProducts = useMemo(() => products.filter((p) => !isService(p)), [products]);

  const getDisplayStock = useCallback(
    (p: InventoryProduct) => {
      const pid = getIdString(p);
      if (optimisticStock[pid] !== undefined) return optimisticStock[pid];
      return Number(p.stock) || 0;
    },
    [optimisticStock],
  );

  // Clear optimistic overrides once server stock matches
  useEffect(() => {
    setOptimisticStock((prev) => {
      if (Object.keys(prev).length === 0) return prev;
      const next = { ...prev };
      let changed = false;
      for (const [id, optStock] of Object.entries(prev)) {
        const server = stockProducts.find((p) => getIdString(p) === id);
        if (server && Number(server.stock) === optStock) {
          delete next[id];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [stockProducts]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const p of stockProducts) {
      const cat = String(p.category || "").trim();
      if (cat) set.add(cat);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  }, [stockProducts]);

  const matchesInventoryFilters = useCallback(
    (fields: { name?: string; category?: string; stock?: number; minStock?: number }) => {
      const name = String(fields.name ?? "").toLowerCase();
      const category = String(fields.category ?? "").toLowerCase();
      const stock = Number(fields.stock) || 0;
      const minStock = fields.minStock ?? DEFAULT_MIN_STOCK;

      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        if (!name.includes(q) && !category.includes(q)) return false;
      }
      if (categoryFilter !== "all" && category !== categoryFilter.toLowerCase()) return false;
      if (stockFilter === "out" && stock > 0) return false;
      if (stockFilter === "low" && (stock === 0 || stock > minStock)) return false;
      return true;
    },
    [searchQuery, categoryFilter, stockFilter],
  );

  const filteredStockProducts = useMemo(
    () => {
      const list = stockProducts.filter((p) =>
        matchesInventoryFilters({
          name: p.name,
          category: p.category,
          stock: getDisplayStock(p),
          minStock: Number(p.minStock) || DEFAULT_MIN_STOCK,
        }),
      );
      if (sortBy !== "default") {
        list.sort((a, b) =>
          compareInventoryProducts(a, b, sortBy, getDisplayStock(a), getDisplayStock(b)),
        );
      }
      return list;
    },
    [stockProducts, matchesInventoryFilters, getDisplayStock, sortBy],
  );

  const filteredSheetRows = useMemo(() => {
    return sheetRows.filter((row) => {
      if (isSpreadsheetRowEmpty(row, [...INVENTORY_SHEET_KEYS])) return true;
      const entity = row._entityId
        ? stockProducts.find((p) => getIdString(p) === row._entityId)
        : undefined;
      const stock = entity ? getDisplayStock(entity) : Number(row.stock) || 0;
      const minStock =
        String(row.minStock ?? "").trim() === ""
          ? DEFAULT_MIN_STOCK
          : Number(row.minStock) || 0;
      return matchesInventoryFilters({
        name: row.name ?? entity?.name,
        category: row.category ?? entity?.category,
        stock,
        minStock,
      });
    });
  }, [sheetRows, stockProducts, matchesInventoryFilters, getDisplayStock]);

  useEffect(() => {
    const handleProductsRefresh = () => {
      refresh(true);
    };
    window.addEventListener("products-should-refresh", handleProductsRefresh);
    return () => {
      window.removeEventListener("products-should-refresh", handleProductsRefresh);
    };
  }, [refresh]);

  const inventorySheetColumns = useMemo(
    () => [
      { key: "name", label: t("product"), type: "text" as const, required: true, width: "24%" },
      { key: "category", label: t("category"), type: "text" as const, width: "16%" },
      { key: "costPrice", label: t("cost"), type: "number" as const, width: "14%" },
      { key: "sellingPrice", label: t("selling"), type: "number" as const, width: "12%" },
      { key: "stock", label: t("stock"), type: "number" as const, width: "11%" },
      { key: "minStock", label: t("minStockAlert"), type: "number" as const, width: "11%" },
    ],
    [t],
  );

  const initInventorySheet = useCallback(() => {
    const ordered = [...stockProducts].sort((a, b) =>
      (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" }),
    );
    setSheetRows(
      buildSpreadsheetRows(
        ordered,
        getIdString,
        (p) => ({
          name: p.name || "",
          category: p.category || "",
          costPrice: String(p.costPrice ?? ""),
          sellingPrice: String(p.sellingPrice ?? ""),
          stock: String(p.stock ?? ""),
          minStock: String(p.minStock ?? DEFAULT_MIN_STOCK),
        }),
        [...INVENTORY_SHEET_KEYS],
      ),
    );
  }, [stockProducts]);

  useSpreadsheetInit(showSpreadsheet, isLoading, initInventorySheet);

  const flashStock = useCallback((entityId: string) => {
    setFlashStockIds((prev) => new Set(prev).add(entityId));
    window.setTimeout(() => {
      setFlashStockIds((prev) => {
        const next = new Set(prev);
        next.delete(entityId);
        return next;
      });
    }, 2500);
  }, []);

  const { rowStatus, onRowsChange, onRowBlur, markRowsSynced, saveRowNow } = useSpreadsheetAutoSave<InventoryProduct>({
    sheetRows,
    setSheetRows,
    columnKeys: [...INVENTORY_SHEET_KEYS],
    requiredFields: ["name"],
    findExisting: (id) => stockProducts.find((p) => getIdString(p) === id),
    toPayload: (row, existing) => {
      if (!String(row.name ?? "").trim()) return null;
      const cost = Number(row.costPrice) || 0;
      const selling = Number(row.sellingPrice) || 0;
      const stock = Number(row.stock) || 0;
      const minStock =
        String(row.minStock ?? "").trim() === ""
          ? DEFAULT_MIN_STOCK
          : Number(row.minStock) || 0;
      const category = String(row.category ?? "").trim() || "General";
      return {
        ...(existing || {}),
        name: String(row.name).trim(),
        category,
        costPrice: cost,
        sellingPrice: selling,
        stock,
        minStock,
      } as InventoryProduct;
    },
    add: (payload) => add(payload as InventoryProduct),
    update: (payload) => update(payload as InventoryProduct),
  });

  useSpreadsheetStockSync({
    enabled: showSpreadsheet,
    entities: stockProducts,
    getEntityId: getIdString,
    setSheetRows,
    markRowsSynced,
    onStockChanged: (entityId) => flashStock(entityId),
  });

  // Immediate stock reduction when a sale is recorded
  useEffect(() => {
    const onSaleRecorded = (event: Event) => {
      const custom = event as CustomEvent<{
        sale?: { productId?: string; quantity?: number; product?: string };
        productId?: string;
      }>;
      const sale = custom.detail?.sale;
      const productId = (sale?.productId ?? custom.detail?.productId)?.toString();
      const qty = Number(sale?.quantity) || 0;
      if (!productId || qty <= 0) return;

      const product = stockProducts.find((p) => getIdString(p) === productId);
      const name = product?.name || sale?.product || t("product");
      const currentStock =
        optimisticStock[productId] ?? Number(product?.stock) ?? 0;
      const newStock = Math.max(0, currentStock - qty);

      setOptimisticStock((prev) => ({ ...prev, [productId]: newStock }));

      setSheetRows((prev) => {
        if (prev.length === 0) return prev;
        const changedRows: SpreadsheetRow[] = [];
        const next = prev.map((row) => {
          if (row._entityId !== productId) return row;
          const rowStock = String(newStock);
          if (row.stock === rowStock) return row;
          const updated = { ...row, stock: rowStock };
          changedRows.push(updated);
          return updated;
        });
        if (changedRows.length > 0) markRowsSynced(changedRows);
        return changedRows.length > 0 ? next : prev;
      });

      flashStock(productId);
      const itemWord = qty === 1 ? t("itemSingular") : t("itemsPlural");
      toast({
        title: t("stockUpdated"),
        description: `${name}: −${qty} ${itemWord} (${t("sales")})`,
      });
    };

    const onStockUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{
        productId?: string;
        newStock?: number;
        delta?: number;
      }>).detail;
      const productId = detail?.productId?.toString();
      if (!productId) return;

      let resolvedStock: number | undefined = detail?.newStock;
      if (resolvedStock === undefined && detail?.delta) {
        const product = stockProducts.find((p) => getIdString(p) === productId);
        const current =
          optimisticStock[productId] ?? Number(product?.stock) ?? 0;
        resolvedStock = Math.max(0, current + detail.delta);
      }
      if (resolvedStock === undefined) return;

      setOptimisticStock((prev) => ({ ...prev, [productId]: resolvedStock! }));

      setSheetRows((prev) => {
        if (prev.length === 0) return prev;
        const changedRows: SpreadsheetRow[] = [];
        const next = prev.map((row) => {
          if (row._entityId !== productId) return row;
          const newStock = String(resolvedStock);
          if (row.stock === newStock) return row;
          const updated = { ...row, stock: newStock };
          changedRows.push(updated);
          return updated;
        });
        if (changedRows.length > 0) markRowsSynced(changedRows);
        return changedRows.length > 0 ? next : prev;
      });
      flashStock(productId);
    };

    window.addEventListener("sale-recorded", onSaleRecorded);
    window.addEventListener("product-stock-updated", onStockUpdated);
    return () => {
      window.removeEventListener("sale-recorded", onSaleRecorded);
      window.removeEventListener("product-stock-updated", onStockUpdated);
    };
  }, [stockProducts, optimisticStock, markRowsSynced, flashStock, toast, t]);

  const totalStock = useMemo(

    () => stockProducts.reduce((sum, p) => sum + getDisplayStock(p), 0),

    [stockProducts, getDisplayStock],

  );



  const totalValue = useMemo(

    () => stockProducts.reduce((sum, p) => sum + (Number(p.sellingPrice) || 0) * getDisplayStock(p), 0),

    [stockProducts, getDisplayStock],

  );



  const openAdd = () => {

    setEditingProduct(null);

    setAddModalOpen(true);

  };



  const openEdit = (product: InventoryProduct) => {

    setEditingProduct(product);

    setAddModalOpen(true);

  };



  const handleModalOpenChange = (open: boolean) => {

    setAddModalOpen(open);

    if (!open) setEditingProduct(null);

  };



  const performDelete = async (product: InventoryProduct): Promise<boolean> => {
    const id = getIdString(product);
    if (!id) return false;
    setDeletingId(id);
    try {
      await remove(product);
      await refresh(true);
      window.dispatchEvent(new CustomEvent("products-should-refresh"));
      toast({ title: t("deleted") });
      return true;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to delete product.";
      toast({ title: t("error"), description: message, variant: "destructive" });
      return false;
    } finally {
      setDeletingId(null);
    }
  };

  const promptDelete = (product: InventoryProduct, onSuccess?: () => void) => {
    requestConfirm({
      title: t("confirmDelete"),
      description: t("deleteNamedItemConfirm").replace("{name}", product.name),
      confirmLabel: t("yesDelete"),
      cancelLabel: t("noCancel"),
      onConfirm: async () => {
        const ok = await performDelete(product);
        if (ok) onSuccess?.();
      },
    });
  };

  const handleDelete = (product: InventoryProduct) => {
    promptDelete(product);
  };

  const handleSheetRowDelete = useCallback(
    (rowId: string) => {
      const row = sheetRows.find((r) => r._rowId === rowId);
      if (!row?._entityId) return;
      const product = stockProducts.find((p) => getIdString(p) === row._entityId);
      if (!product) return;
      promptDelete(product, () => {
        setSheetRows((prev) =>
          ensureTrailingEmptyRows(
            prev.filter((r) => r._rowId !== rowId),
            [...INVENTORY_SHEET_KEYS],
          ),
        );
      });
    },
    [sheetRows, stockProducts, requestConfirm, t],
  );



  return (

    <AppLayout title={t("inventories")}>

      <div className="lg:bg-white lg:rounded-lg lg:overflow-hidden space-y-4 pb-4">

        <div className="lg:px-4 lg:pt-4">
          <MobileListSearchFilters
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder={`${t("search")} ${t("product").toLowerCase()}...`}
            showFilters={showFilters}
            onToggleFilters={() => setShowFilters((v) => !v)}
            searchName="search-inventory"
            trailing={
              <Button
                className="bg-primary text-white hover:bg-blue-700 hover:text-white gap-2 shrink-0 rounded-lg h-10 px-3 lg:hidden"
                onClick={openAdd}
              >
                <Plus size={18} />
                <span className="sr-only">{t("addProduct")}</span>
              </Button>
            }
            filters={
              <div className="space-y-3">
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className={cn("w-full h-10 rounded-lg", filterSelectClass)}>
                    <SelectValue placeholder={t("category")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("allCategories")}</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={stockFilter} onValueChange={(v) => setStockFilter(v as StockFilter)}>
                  <SelectTrigger className={cn("w-full h-10 rounded-lg", filterSelectClass)}>
                    <SelectValue placeholder={t("stock")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("all")}</SelectItem>
                    <SelectItem value="low">{t("lowStock")}</SelectItem>
                    <SelectItem value="out">{t("outOfStock")}</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as InventorySort)}>
                  <SelectTrigger className={cn("w-full h-10 rounded-lg", filterSelectClass)}>
                    <div className="flex items-center gap-2">
                      <ArrowUpDown size={14} className="text-gray-400" />
                      <SelectValue placeholder={t("sortBy")} />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">{t("defaultSortOrder")}</SelectItem>
                    <SelectItem value="name-asc">{t("nameAsc")}</SelectItem>
                    <SelectItem value="name-desc">{t("nameDesc")}</SelectItem>
                    <SelectItem value="stock-asc">{t("stockAsc")}</SelectItem>
                    <SelectItem value="stock-desc">{t("stockDesc")}</SelectItem>
                    <SelectItem value="price-asc">{t("priceAsc")}</SelectItem>
                    <SelectItem value="price-desc">{t("priceDesc")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            }
          />
          <div className="hidden lg:flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`${t("search")} ${t("product").toLowerCase()}...`}
                className={searchBarInputClass}
                autoComplete="off"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className={cn("w-[160px] h-10 rounded-lg shrink-0", filterSelectClass)}>
                <SelectValue placeholder={t("category")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("allCategories")}</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={stockFilter} onValueChange={(v) => setStockFilter(v as StockFilter)}>
              <SelectTrigger className={cn("w-[150px] h-10 rounded-lg shrink-0", filterSelectClass)}>
                <SelectValue placeholder={t("stock")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("all")}</SelectItem>
                <SelectItem value="low">{t("lowStock")}</SelectItem>
                <SelectItem value="out">{t("outOfStock")}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as InventorySort)}>
              <SelectTrigger className={cn("w-[180px] h-10 rounded-lg shrink-0", filterSelectClass)}>
                <div className="flex items-center gap-2">
                  <ArrowUpDown size={14} className="text-gray-400" />
                  <SelectValue placeholder={t("sortBy")} />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">{t("defaultSortOrder")}</SelectItem>
                <SelectItem value="name-asc">{t("nameAsc")}</SelectItem>
                <SelectItem value="name-desc">{t("nameDesc")}</SelectItem>
                <SelectItem value="stock-asc">{t("stockAsc")}</SelectItem>
                <SelectItem value="stock-desc">{t("stockDesc")}</SelectItem>
                <SelectItem value="price-asc">{t("priceAsc")}</SelectItem>
                <SelectItem value="price-desc">{t("priceDesc")}</SelectItem>
              </SelectContent>
            </Select>
            {showSpreadsheet ? (
              <AddEntryButton
                label={t("addProduct")}
                onClick={() => {
                  setSearchQuery("");
                  setCategoryFilter("all");
                  setStockFilter("all");
                  addRow();
                }}
                className="shrink-0"
              />
            ) : null}
          </div>
        </div>

        {showSpreadsheet ? (
          <div className="hidden lg:block lg:px-4 lg:pb-4">
            <SpreadsheetEditor
              columns={inventorySheetColumns}
              rows={filteredSheetRows}
              onRowsChange={onRowsChange}
              onRowBlur={(rowId) => onRowBlur(rowId, sheetRows)}
              onAddRow={addRow}
              autoSave
              rowStatus={rowStatus}
              flashEntityIds={flashStockIds}
              flashFieldKey="stock"
              addRowLabel={t("addRow")}
              focusRowId={focusRowId}
              onFocusRowHandled={clearFocus}
              hideAddButton
              onRowSave={(rowId) => saveRowNow(rowId, sheetRows)}
              saveRowLabel={t("save")}
              onRowDelete={(rowId) => void handleSheetRowDelete(rowId)}
              deleteRowLabel={t("delete")}
            />
          </div>
        ) : null}

        {!showSpreadsheet && isLoading ? (

          <>
          <DesktopDataTable className="px-4">

            <table className="w-full border-collapse">

              <thead className="bg-gray-100 border-b border-gray-200">

                <tr>

                  {["Product", "Category", "Stock", "Cost", "Selling", ""].map((col) => (

                    <th key={col} className="text-left py-4 px-6">

                      <Skeleton className="h-4 w-20" />

                    </th>

                  ))}

                </tr>

              </thead>

              <tbody>

                {Array.from({ length: 6 }).map((_, i) => (

                  <tr key={i} className="border-b border-gray-200">

                    {Array.from({ length: 6 }).map((_, j) => (

                      <td key={j} className="py-4 px-6">

                        <Skeleton className="h-4 w-24" />

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
                <Skeleton className="h-4 w-full mb-1" />
                <Skeleton className="h-4 w-24" />
              </MobileListCard>
            ))}
          </MobileDataList>
          </>

        ) : !showSpreadsheet && filteredStockProducts.length === 0 ? (

          <div className="px-4 py-5 text-sm text-muted-foreground">

            {stockProducts.length === 0 ? t("noProductsYet") : t("noProductsSearchHint")}

          </div>

        ) : !showSpreadsheet ? (
          <>
          <DesktopDataTable>
            <table className="w-full border-collapse">

              <thead className="sticky top-0 z-10 bg-gray-100 border-b border-gray-200">

                <tr>

                  <th className="text-left text-sm font-semibold text-gray-700 py-4 px-6">{t("product")}</th>

                  <th className="text-left text-sm font-semibold text-gray-700 py-4 px-6">{t("category")}</th>

                  <th className="text-right text-sm font-semibold text-gray-700 py-4 px-6">{t("stock")}</th>

                  <th className="text-right text-sm font-semibold text-gray-700 py-4 px-6">{t("cost")}</th>

                  <th className="text-right text-sm font-semibold text-gray-700 py-4 px-6">{t("selling")}</th>

                  <th className="text-right text-sm font-semibold text-gray-700 py-4 px-6">{t("actions")}</th>

                </tr>

              </thead>

              <tbody>

                {filteredStockProducts.map((p, index) => {

                  const pid = getIdString(p);

                  const stock = getDisplayStock(p);

                  const isDeleting = deletingId === pid;

                  return (

                    <tr

                      key={pid}

                      className={cn(

                        "border-b border-gray-200",

                        index % 2 === 0 ? "bg-white" : "bg-gray-50",

                      )}

                    >

                      <td className="py-4 px-6 text-sm font-medium text-gray-900">{p.name}</td>

                      <td className="py-4 px-6 text-sm text-gray-600">{(p.category || "—").toString()}</td>

                      <td
                        className={cn(
                          "py-4 px-6 text-sm text-right tabular-nums transition-colors duration-500",
                          flashStockIds.has(pid) && "bg-amber-100 ring-2 ring-amber-400 ring-inset",
                        )}
                      >

                        <span

                          className={cn(

                            "font-medium",

                            stock === 0 ? "text-red-600" : stock <= 5 ? "text-amber-600" : "text-gray-900",

                          )}

                        >

                          {stock.toLocaleString()}

                        </span>

                      </td>

                      <td className="py-4 px-6 text-sm text-gray-700 text-right tabular-nums">

                        {Number(p.costPrice || 0).toLocaleString()} rwf

                      </td>

                      <td className="py-4 px-6 text-sm font-semibold text-gray-900 text-right tabular-nums">

                        {Number(p.sellingPrice || 0).toLocaleString()} rwf

                      </td>

                      <td className="py-4 px-6 text-right">

                        <DropdownMenu>

                          <DropdownMenuTrigger asChild>

                            <Button

                              variant="ghost"

                              size="sm"

                              className="h-8 w-8 p-0"

                              aria-label="Product actions"

                              disabled={isDeleting}

                            >

                              {isDeleting ? (

                                <Loader2 size={16} className="animate-spin" />

                              ) : (

                                <MoreVertical size={16} />

                              )}

                            </Button>

                          </DropdownMenuTrigger>

                          <DropdownMenuContent align="end">

                            <DropdownMenuItem onClick={() => openEdit(p)}>

                              <Pencil size={14} className="mr-2" />

                              Edit

                            </DropdownMenuItem>

                            <DropdownMenuItem

                              onClick={() => void handleDelete(p)}

                              disabled={isDeleting}

                              className="text-red-600 focus:text-red-600 focus:bg-red-50"

                            >

                              <Trash2 size={14} className="mr-2" />

                              Delete

                            </DropdownMenuItem>

                          </DropdownMenuContent>

                        </DropdownMenu>

                      </td>

                    </tr>

                  );

                })}

                <tr className="border-t border-gray-200 bg-blue-50/70">

                  <td colSpan={2} className="py-4 px-6 text-sm font-semibold text-gray-800">

                    Total

                  </td>

                  <td className="py-4 px-6 text-sm font-semibold text-gray-900 text-right tabular-nums">

                    {totalStock.toLocaleString()}

                  </td>

                  <td />

                  <td className="py-4 px-6 text-sm font-semibold text-gray-900 text-right tabular-nums">

                    {totalValue.toLocaleString()} rwf

                  </td>

                  <td />

                </tr>

              </tbody>

            </table>

          </DesktopDataTable>

          <MobileDataList>
            {filteredStockProducts.map((p, index) => {
              const pid = getIdString(p);
              const stock = getDisplayStock(p);
              const isDeleting = deletingId === pid;
              return (
                <MobileListCard key={pid} index={index}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{p.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{(p.category || "—").toString()}</p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 shrink-0"
                          aria-label="Product actions"
                          disabled={isDeleting}
                        >
                          {isDeleting ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <MoreVertical size={16} />
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(p)}>
                          <Pencil size={14} className="mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => void handleDelete(p)}
                          disabled={isDeleting}
                          className="text-red-600 focus:text-red-600 focus:bg-red-50"
                        >
                          <Trash2 size={14} className="mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="text-gray-500 block">Stock</span>
                      <span
                        className={cn(
                          "font-semibold tabular-nums transition-colors duration-500",
                          flashStockIds.has(pid) && "bg-amber-100 px-1 rounded",
                          stock === 0 ? "text-red-600" : stock <= 5 ? "text-amber-600" : "text-gray-900",
                        )}
                      >
                        {stock.toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 block">{t("cost")}</span>
                      <span className="font-medium text-gray-700 tabular-nums">
                        {Number(p.costPrice || 0).toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 block">{t("selling")}</span>
                      <span className="font-semibold text-gray-900 tabular-nums">
                        {Number(p.sellingPrice || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </MobileListCard>
              );
            })}
            <MobileListCard className="bg-blue-50/70">
              <div className="flex items-center justify-between text-sm font-semibold">
                <span className="text-gray-800">Total</span>
                <div className="text-right tabular-nums">
                  <div className="text-gray-900">{totalStock.toLocaleString()} units</div>
                  <div className="text-gray-900">{totalValue.toLocaleString()} rwf</div>
                </div>
              </div>
            </MobileListCard>
          </MobileDataList>
          </>

        ) : null}

      </div>



      <AddProductModal

        open={addModalOpen}

        onOpenChange={handleModalOpenChange}

        product={editingProduct}

        onSuccess={() => void refresh(true)}

      />

      {confirmDialog}
    </AppLayout>

  );

};



export default Inventories;

