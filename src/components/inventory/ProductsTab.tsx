import { useMemo, useState } from "react";
import { useApi } from "@/hooks/useApi";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";
import { Plus, Loader2, MoreVertical, Pencil, Trash2, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/currency";
import { formatStockDisplay } from "@/lib/stockFormatter";
import { StockUpdateDialog } from "@/components/StockUpdateDialog";
import { filterByPageSearch } from "@/lib/pageSearch";
import { usePageSearch } from "@/hooks/usePageSearch";
import {
  FINANCE_TH_CLASS,
  FINANCE_TD_CLASS,
  FinanceTableLoading,
  FinanceTableShell,
} from "@/components/finance/financeTable";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { useDeleteConfirm } from "@/hooks/useDeleteConfirm";
import { useWorkspace } from "@/hooks/useWorkspace";
import { WorkspaceRecordBy } from "@/components/workspace/WorkspaceRecordBy";

export interface ProductEntry {
  id?: number;
  _id?: string;
  name: string;
  category: string;
  costPrice: number;
  sellingPrice: number;
  stock: number;
  minStock?: number;
  isPackage?: boolean;
  packageQuantity?: number;
  productType?: string;
  expiryDate?: string;
  manufacturedDate?: string;
  createdByName?: string;
}

function productId(p: ProductEntry): string {
  return String(p._id ?? p.id ?? "");
}

function isService(p: ProductEntry) {
  return p.category?.toLowerCase() === "service";
}

function stockStatus(p: ProductEntry, t: (key: string) => string) {
  if (isService(p)) return { label: p.category, tone: "text-gray-500 bg-gray-100" };
  const min = p.minStock ?? 5;
  if (p.stock === 0) return { label: t("outOfStock"), tone: "text-red-700 bg-red-100 border border-red-200" };
  if (p.stock <= min) return { label: t("lowStock"), tone: "text-amber-700 bg-amber-100 border border-amber-200" };
  return { label: t("inStock"), tone: "text-emerald-700 bg-emerald-50 border border-emerald-200" };
}

export function ProductsTab() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const { mode } = useWorkspace();
  const { items: products, isLoading, add, update, remove, refresh } = useApi<ProductEntry>({
    endpoint: "products",
    defaultValue: [],
  });

  const [name, setName] = useState("");
  const [category, setCategory] = useState("General");
  const [costPrice, setCostPrice] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [stock, setStock] = useState("0");
  const [minStock, setMinStock] = useState("5");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ProductEntry | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [stockDialogId, setStockDialogId] = useState<string | null>(null);
  const [stockDialogOpen, setStockDialogOpen] = useState(false);
  const {
    target: deleteTarget,
    open: deleteOpen,
    isDeleting: isDeleteDeleting,
    setIsDeleting: setIsDeleteDeleting,
    requestDelete,
    takeTarget,
    handleOpenChange: handleDeleteOpenChange,
  } = useDeleteConfirm<ProductEntry>();

  const { query: pageSearchQuery } = usePageSearch();
  const visibleProducts = useMemo(
    () =>
      filterByPageSearch(products, pageSearchQuery, (entry) => [
        entry.name,
        entry.category,
        entry.productType,
      ]),
    [products, pageSearchQuery],
  );

  const stats = useMemo(() => {
    const physical = products.filter((p) => !isService(p));
    const low = physical.filter((p) => p.stock > 0 && p.stock <= (p.minStock ?? 5)).length;
    const out = physical.filter((p) => p.stock === 0).length;
    return { total: products.length, low, out };
  }, [products]);

  const resetForm = () => {
    setName("");
    setCategory("General");
    setCostPrice("");
    setSellingPrice("");
    setStock("0");
    setMinStock("5");
    setEditing(null);
  };

  const openCreate = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (entry: ProductEntry) => {
    setEditing(entry);
    setName(entry.name);
    setCategory(entry.category || "General");
    setCostPrice(String(entry.costPrice ?? ""));
    setSellingPrice(String(entry.sellingPrice ?? ""));
    setStock(String(entry.stock ?? 0));
    setMinStock(String(entry.minStock ?? 5));
    setOpen(true);
  };

  const openStockUpdate = (entry: ProductEntry) => {
    setStockDialogId(productId(entry));
    setStockDialogOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast({ title: t("saveFailed"), description: t("productName"), variant: "destructive" });
      return;
    }
    const parsedCost = parseFloat(costPrice);
    const parsedSell = parseFloat(sellingPrice);
    const parsedStock = parseInt(stock, 10);
    const parsedMin = parseInt(minStock, 10);
    if (Number.isNaN(parsedCost) || parsedCost < 0 || Number.isNaN(parsedSell) || parsedSell < 0) {
      toast({ title: t("saveFailed"), description: t("costPrice"), variant: "destructive" });
      return;
    }
    if (Number.isNaN(parsedStock) || parsedStock < 0 || Number.isNaN(parsedMin) || parsedMin < 0) {
      toast({ title: t("invalidStock"), description: t("invalidStockDesc"), variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        name: name.trim(),
        category: category.trim() || "General",
        costPrice: parsedCost,
        sellingPrice: parsedSell,
        stock: parsedStock,
        minStock: parsedMin,
      };
      if (editing) {
        await update({ ...editing, ...payload } as ProductEntry);
        toast({ title: t("updated"), description: t("changesSaved") });
      } else {
        await add(payload as ProductEntry);
        toast({ title: t("addProduct"), description: t("productsAvailable") });
      }
      resetForm();
      setOpen(false);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t("pleaseTryAgain");
      toast({ title: t("saveFailed"), description: message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    const item = takeTarget();
    if (!item) return;
    setIsDeleteDeleting(true);
    try {
      await remove(item);
      toast({ title: t("deleted"), description: item.name });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t("pleaseTryAgain");
      toast({ title: t("error"), description: message, variant: "destructive" });
    } finally {
      setIsDeleteDeleting(false);
    }
  };

  const renderTable = () => {
    if (isLoading) return <FinanceTableLoading />;
    if (products.length === 0) {
      return (
        <div className="p-12 text-center text-muted-foreground">
          <Package className="mx-auto h-10 w-10 text-gray-300 mb-3" />
          <p className="font-medium">{t("noProductsYet")}</p>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse">
          <thead>
            <tr>
              <th className={FINANCE_TH_CLASS}>{t("productName")}</th>
              <th className={cn(FINANCE_TH_CLASS, "hidden sm:table-cell")}>{t("category")}</th>
              <th className={cn(FINANCE_TH_CLASS, "text-right")}>{t("stock")}</th>
              <th className={cn(FINANCE_TH_CLASS, "hidden md:table-cell text-right")}>{t("minimumStock")}</th>
              <th className={cn(FINANCE_TH_CLASS, "hidden lg:table-cell text-right")}>{t("costPrice")}</th>
              <th className={cn(FINANCE_TH_CLASS, "hidden lg:table-cell text-right")}>{t("sellingPrice")}</th>
              <th className={FINANCE_TH_CLASS}>{t("status")}</th>
              {mode === "workspace" ? (
                <th className={cn(FINANCE_TH_CLASS, "hidden xl:table-cell")}>Added by</th>
              ) : null}
              <th className={cn(FINANCE_TH_CLASS, "w-10 pr-4")} />
            </tr>
          </thead>
          <tbody className="bg-white">
            {visibleProducts.map((entry) => {
              const id = productId(entry);
              const status = stockStatus(entry, t);
              return (
                <tr key={id} className="border-t border-gray-100 hover:bg-gray-50/80">
                  <td className={cn(FINANCE_TD_CLASS, "font-medium")}>{entry.name}</td>
                  <td className={cn(FINANCE_TD_CLASS, "hidden sm:table-cell text-gray-600")}>{entry.category || "—"}</td>
                  <td className={cn(FINANCE_TD_CLASS, "text-right tabular-nums")}>
                    {isService(entry)
                      ? "—"
                      : formatStockDisplay(entry, t("language") as "en" | "rw")}
                  </td>
                  <td className={cn(FINANCE_TD_CLASS, "hidden md:table-cell text-right tabular-nums text-gray-600")}>
                    {isService(entry) ? "—" : entry.minStock ?? 5}
                  </td>
                  <td className={cn(FINANCE_TD_CLASS, "hidden lg:table-cell text-right tabular-nums")}>
                    {formatCurrency(entry.costPrice)}
                  </td>
                  <td className={cn(FINANCE_TD_CLASS, "hidden lg:table-cell text-right tabular-nums")}>
                    {formatCurrency(entry.sellingPrice)}
                  </td>
                  <td className={FINANCE_TD_CLASS}>
                    <span className={cn("inline-block px-2 py-0.5 text-xs font-medium rounded", status.tone)}>
                      {status.label}
                    </span>
                  </td>
                  {mode === "workspace" ? (
                    <td className={cn(FINANCE_TD_CLASS, "hidden xl:table-cell")}>
                      <WorkspaceRecordBy name={entry.createdByName} />
                    </td>
                  ) : null}
                  <td className={cn(FINANCE_TD_CLASS, "pr-4")}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical size={16} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {!isService(entry) ? (
                          <DropdownMenuItem onClick={() => openStockUpdate(entry)}>
                            <Package className="mr-2 h-4 w-4" />
                            {t("updateStock")}
                          </DropdownMenuItem>
                        ) : null}
                        <DropdownMenuItem onClick={() => openEdit(entry)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          {t("edit")}
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600" onClick={() => requestDelete(entry)}>
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
    );
  };

  return (
    <>
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="border border-gray-200 bg-white px-4 py-3">
          <p className="text-xs text-gray-500">{t("products")}</p>
          <p className="text-xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-xs text-amber-700">{t("lowStock")}</p>
          <p className="text-xl font-bold text-amber-800">{stats.low}</p>
        </div>
        <div className="border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-xs text-red-700">{t("outOfStock")}</p>
          <p className="text-xl font-bold text-red-800">{stats.out}</p>
        </div>
      </div>

      <FinanceTableShell
        title={t("products")}
        onAdd={openCreate}
        addLabel={t("add")}
        onRefresh={() => void refresh(true)}
        isRefreshing={false}
      >
        {renderTable()}
      </FinanceTableShell>

      <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); setOpen(v); }}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? t("editProduct") : t("addProduct")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label>{t("productName")}</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t("category")}</Label>
              <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="General" />
              <p className="text-xs text-gray-500">Use &quot;service&quot; for non-stock items</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t("costPrice")}</Label>
                <Input type="number" min="0" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t("sellingPrice")}</Label>
                <Input type="number" min="0" value={sellingPrice} onChange={(e) => setSellingPrice(e.target.value)} />
              </div>
            </div>
            {category.toLowerCase() !== "service" ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>{editing ? t("stockQuantity") : t("initialStock")}</Label>
                  <Input type="number" min="0" value={stock} onChange={(e) => setStock(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>{t("minimumStock")}</Label>
                  <Input type="number" min="0" value={minStock} onChange={(e) => setMinStock(e.target.value)} />
                </div>
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="cancel" onClick={() => { resetForm(); setOpen(false); }}>{t("cancel")}</Button>
            <Button onClick={() => void handleSave()} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <StockUpdateDialog
        productId={stockDialogId}
        open={stockDialogOpen}
        onOpenChange={(v) => {
          setStockDialogOpen(v);
          if (!v) setStockDialogId(null);
        }}
      />

      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={handleDeleteOpenChange}
        title={t("deleteProduct")}
        description={t("deleteConfirmDesc").replace("{name}", deleteTarget?.name ?? "")}
        confirmLabel={t("delete")}
        cancelLabel={t("cancel")}
        deletingLabel={t("deleting")}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleteDeleting}
      />
    </>
  );
}
