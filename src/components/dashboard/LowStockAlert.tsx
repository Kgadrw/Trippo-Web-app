import { useState, useMemo, useEffect } from "react";
import { AlertTriangle, Edit2, Check, X, Trash2, Minus, ChevronUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { playUpdateBeep, playWarningBeep, playDeleteBeep, playErrorBeep, initAudio } from "@/lib/sound";
import { useApi } from "@/hooks/useApi";
import { formatStockDisplay } from "@/lib/stockFormatter";
import { useTranslation } from "@/hooks/useTranslation";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Product {
  id?: number;
  _id?: string;
  name: string;
  stock: number;
  minStock?: number;
  manufacturedDate?: string;
  expiryDate?: string;
  isPackage?: boolean;
  packageQuantity?: number;
}

interface LowStockItem {
  id: string | number;
  name: string;
  stock: number;
  minStock?: number;
  isOutOfStock?: boolean;
  isExpiringSoon?: boolean;
}

function useLowStockItems(products: Product[]) {
  return useMemo(() => {
    return products
      .filter((product) => {
        if ((product as { category?: string }).category?.toLowerCase() === "service") {
          return false;
        }
        const minStock = product.minStock ?? 5;
        const expiryDateStr = (product as { expiryDate?: string }).expiryDate;
        let isExpiringSoon = false;

        if (expiryDateStr) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const expiryDate = new Date(expiryDateStr);
          expiryDate.setHours(0, 0, 0, 0);
          const diffMs = expiryDate.getTime() - today.getTime();
          const diffDays = diffMs / (1000 * 60 * 60 * 24);
          if (diffDays >= 0 && diffDays <= 30) isExpiringSoon = true;
        }

        return (
          product.stock === minStock ||
          product.stock < minStock ||
          product.stock === 0 ||
          isExpiringSoon
        );
      })
      .map((product) => ({
        id: product._id || product.id || "",
        name: product.name,
        stock: product.stock,
        minStock: product.minStock,
        isOutOfStock: product.stock === 0,
        isExpiringSoon: (() => {
          const expiryDateStr = (product as { expiryDate?: string }).expiryDate;
          if (!expiryDateStr) return false;
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const expiryDate = new Date(expiryDateStr);
          expiryDate.setHours(0, 0, 0, 0);
          const diffMs = expiryDate.getTime() - today.getTime();
          const diffDays = diffMs / (1000 * 60 * 60 * 24);
          return diffDays >= 0 && diffDays <= 30;
        })(),
      }))
      .sort((a, b) => {
        if (a.isOutOfStock && !b.isOutOfStock) return -1;
        if (!a.isOutOfStock && b.isOutOfStock) return 1;
        if (a.isExpiringSoon && !b.isExpiringSoon) return -1;
        if (!a.isExpiringSoon && b.isExpiringSoon) return 1;
        return a.stock - b.stock;
      })
      .slice(0, 10);
  }, [products]);
}

function LowStockAlertList({
  lowStockItems,
  products,
  t,
  updateProduct,
  removeProduct,
  refreshProducts,
}: {
  lowStockItems: LowStockItem[];
  products: Product[];
  t: ReturnType<typeof useTranslation>["t"];
  updateProduct: (item: Product) => Promise<unknown>;
  removeProduct: (item: Product) => Promise<unknown>;
  refreshProducts: (force?: boolean) => Promise<void>;
}) {
  const { toast } = useToast();

  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [editStock, setEditStock] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<LowStockItem | null>(null);

  const handleEdit = (item: LowStockItem) => {
    setEditingId(item.id);
    setEditStock(item.stock.toString());
  };

  const handleSave = async (id: string | number) => {
    const stockValue = parseInt(editStock, 10);
    if (isNaN(stockValue) || stockValue < 0) {
      playWarningBeep();
      toast({
        title: "Invalid Stock",
        description: "Please enter a valid stock quantity.",
        variant: "destructive",
      });
      return;
    }

    const product = products.find((p) => {
      const productId = (p as { _id?: string; id?: number })._id || p.id;
      return productId?.toString() === id.toString();
    });

    if (!product) return;

    try {
      await updateProduct({ ...product, stock: stockValue } as Product);
      await refreshProducts();
      setEditingId(null);
      setEditStock("");
      playUpdateBeep();
      toast({
        title: "Stock Updated",
        description: "Stock quantity has been updated successfully.",
      });
    } catch {
      playWarningBeep();
      toast({
        title: "Update Failed",
        description: "Failed to update stock. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditStock("");
  };

  const handleDeleteConfirm = async () => {
    if (!productToDelete) return;

    initAudio();
    const product = products.find((p) => {
      const productId = (p as { _id?: string; id?: number })._id || p.id;
      return productId?.toString() === productToDelete.id.toString();
    });

    if (!product) return;

    setDeleteDialogOpen(false);
    setProductToDelete(null);

    try {
      await removeProduct(product);
      playDeleteBeep();
      toast({
        title: "Product Deleted",
        description: "Product has been deleted successfully.",
      });
    } catch {
      playErrorBeep();
      toast({
        title: "Delete Failed",
        description: "Failed to delete product. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (lowStockItems.length === 0) {
    return <p className="px-4 py-6 text-center text-sm text-muted-foreground">No low stock items</p>;
  }

  return (
    <>
      <div className="divide-y divide-gray-100">
        {lowStockItems.map((item) => (
          <div
            key={item.id}
            className={cn(
              "flex items-center justify-between gap-2 px-4 py-2.5 transition-colors hover:bg-gray-50",
              item.isOutOfStock && "bg-red-50/80",
            )}
          >
            <span
              className={cn(
                "min-w-0 flex-1 truncate text-sm font-medium",
                item.isOutOfStock
                  ? "font-semibold text-red-700"
                  : item.isExpiringSoon
                    ? "font-semibold text-orange-700"
                    : "text-gray-800",
              )}
            >
              {item.name}
              {item.isOutOfStock ? (
                <span className="ml-2 text-xs font-normal text-red-600">(Out of Stock)</span>
              ) : null}
              {!item.isOutOfStock && item.isExpiringSoon ? (
                <span className="ml-2 text-xs font-normal text-orange-600">(Expiring Soon)</span>
              ) : null}
            </span>

            {editingId === item.id ? (
              <div className="flex shrink-0 items-center gap-1">
                <Input
                  type="number"
                  min="0"
                  value={editStock}
                  onChange={(e) => setEditStock(e.target.value)}
                  className="h-8 w-20 text-sm"
                  autoFocus
                />
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 hover:bg-green-100"
                  onClick={() => void handleSave(item.id)}
                >
                  <Check size={14} className="text-green-600" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 hover:bg-red-100"
                  onClick={handleCancel}
                >
                  <X size={14} className="text-red-600" />
                </Button>
              </div>
            ) : (
              <div className="flex shrink-0 items-center gap-1">
                <span
                  className={cn(
                    "whitespace-nowrap px-2 py-1 text-xs font-bold",
                    item.isOutOfStock
                      ? "border border-red-300 bg-red-100 text-red-700"
                      : item.isExpiringSoon
                        ? "border border-orange-300 bg-orange-100 text-orange-700"
                        : "bg-gray-100 text-gray-700",
                  )}
                >
                  {item.isOutOfStock
                    ? "Out of Stock"
                    : item.isExpiringSoon
                      ? "Expiring Soon"
                      : (() => {
                          const fullProduct = products.find((p) => {
                            const id = (p as { _id?: string; id?: number })._id || p.id;
                            return id?.toString() === item.id?.toString();
                          });
                          if (fullProduct) {
                            return formatStockDisplay(fullProduct);
                          }
                          return `${item.stock} left`;
                        })()}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 hover:bg-gray-100"
                  onClick={() => handleEdit(item)}
                  title="Edit stock"
                >
                  <Edit2 size={14} className="text-gray-700" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 hover:bg-red-100"
                  onClick={() => {
                    setProductToDelete(item);
                    setDeleteDialogOpen(true);
                  }}
                  title="Delete product"
                >
                  <Trash2 size={14} className="text-red-600" />
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{productToDelete?.name}</strong>? This action
              cannot be undone and will permanently remove this product from your inventory.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setDeleteDialogOpen(false);
                setProductToDelete(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleDeleteConfirm()}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Delete Product
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/** Gmail-style dock: fixed bottom-right bar; click to expand the alert list. */
export function LowStockAlertDock() {
  const { t } = useTranslation();
  const {
    items: products,
    update: updateProduct,
    remove: removeProduct,
    refresh: refreshProducts,
  } = useApi<Product>({
    endpoint: "products",
    defaultValue: [],
  });
  const lowStockItems = useLowStockItems(products);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const handleProductUpdate = () => {
      void refreshProducts(true);
    };
    window.addEventListener("products-should-refresh", handleProductUpdate);
    return () => window.removeEventListener("products-should-refresh", handleProductUpdate);
  }, [refreshProducts]);

  useEffect(() => {
    if (lowStockItems.length === 0) setExpanded(false);
  }, [lowStockItems.length]);

  if (lowStockItems.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed bottom-0 right-0 z-40 flex flex-col items-end p-3 sm:p-4"
      aria-live="polite"
    >
      <div className="pointer-events-auto w-[min(calc(100vw-1.5rem),20rem)] sm:w-80">
        {expanded ? (
          <div className="flex max-h-[min(28rem,60vh)] flex-col border border-b-0 border-gray-300 bg-white shadow-2xl">
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-gray-200 bg-gray-50 px-3 py-2">
              <div className="flex min-w-0 items-center gap-2">
                <AlertTriangle size={16} className="shrink-0 text-red-600" />
                <span className="truncate text-sm font-semibold text-gray-900">Low Stock Alert</span>
                <span className="shrink-0 bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white tabular-nums">
                  {lowStockItems.length}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setExpanded(false)}
                className="flex h-7 w-7 shrink-0 items-center justify-center text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-800"
                aria-label="Minimize low stock alert"
              >
                <Minus size={16} />
              </button>
            </div>
            <ScrollArea className="min-h-0 flex-1">
              <LowStockAlertList
                lowStockItems={lowStockItems}
                products={products}
                t={t}
                updateProduct={updateProduct}
                removeProduct={removeProduct}
                refreshProducts={refreshProducts}
              />
            </ScrollArea>
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className={cn(
            "flex w-full items-center gap-2 border border-gray-300 bg-gray-900 px-3 py-2.5 text-left shadow-2xl transition-colors hover:bg-gray-800",
            expanded && "border-t-0",
          )}
          aria-expanded={expanded}
        >
          <AlertTriangle size={16} className="shrink-0 text-red-400" />
          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-white">Low Stock Alert</span>
          <span className="shrink-0 bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white tabular-nums">
            {lowStockItems.length}
          </span>
          <ChevronUp
            size={16}
            className={cn("shrink-0 text-gray-300 transition-transform", expanded && "rotate-180")}
          />
        </button>
      </div>
    </div>
  );
}

/** @deprecated Use LowStockAlertDock. Kept for tests and legacy embeds. */
export function LowStockAlert() {
  const { t } = useTranslation();
  const {
    items: products,
    update: updateProduct,
    remove: removeProduct,
    refresh: refreshProducts,
  } = useApi<Product>({
    endpoint: "products",
    defaultValue: [],
  });
  const lowStockItems = useLowStockItems(products);

  useEffect(() => {
    const handleProductUpdate = () => {
      void refreshProducts(true);
    };
    window.addEventListener("products-should-refresh", handleProductUpdate);
    return () => window.removeEventListener("products-should-refresh", handleProductUpdate);
  }, [refreshProducts]);

  return (
    <div className="kpi-card border border-transparent bg-white/80 backdrop-blur-sm lg:bg-white/80 lg:backdrop-blur-md">
      <div className="mb-4 flex items-center gap-2">
        <AlertTriangle size={20} className="text-red-600" />
        <h3 className="text-lg font-bold text-red-600">Low Stock Alert</h3>
      </div>
      <LowStockAlertList
        lowStockItems={lowStockItems}
        products={products}
        t={t}
        updateProduct={updateProduct}
        removeProduct={removeProduct}
        refreshProducts={refreshProducts}
      />
    </div>
  );
}
