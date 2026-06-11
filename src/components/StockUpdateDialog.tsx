import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useApi } from "@/hooks/useApi";
import { useTranslation } from "@/hooks/useTranslation";
import { playUpdateBeep, playErrorBeep, initAudio } from "@/lib/sound";
import { backgroundSyncManager } from '@/lib/backgroundSync';

interface Product {
  id?: number;
  _id?: string;
  name: string;
  stock: number;
  minStock?: number;
}

interface StockUpdateDialogProps {
  productId: string | number | null;
  productName?: string;
  currentStock?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StockUpdateDialog({
  productId,
  productName,
  currentStock,
  open,
  onOpenChange,
}: StockUpdateDialogProps) {
  const { toast } = useToast();
  const { t } = useTranslation();
  const {
    items: products,
    update: updateProduct,
    refresh: refreshProducts,
  } = useApi<Product>({
    endpoint: "products",
    defaultValue: [],
  });

  const [stockValue, setStockValue] = useState<string>("");
  const [isUpdating, setIsUpdating] = useState(false);

  const product = productId
    ? products.find((p) => {
        const id = (p as { _id?: string; id?: number })._id || p.id;
        return id?.toString() === productId.toString();
      })
    : null;

  useEffect(() => {
    if (product) {
      setStockValue(product.stock.toString());
    } else if (currentStock !== undefined) {
      setStockValue(currentStock.toString());
    }
  }, [product, currentStock]);

  const handleUpdate = async () => {
    if (!productId || !product) {
      return;
    }

    initAudio();
    setIsUpdating(true);

    const stockNum = parseInt(stockValue);
    if (isNaN(stockNum) || stockNum < 0) {
      playErrorBeep();
      toast({
        title: t("invalidStock"),
        description: t("invalidStockDesc"),
        variant: "destructive",
      });
      setIsUpdating(false);
      return;
    }

    try {
      await updateProduct({ ...product, stock: stockNum } as Product);
      await refreshProducts();

      if ("serviceWorker" in navigator) {
        try {
          /* converted to static import */;
          await backgroundSyncManager.requestNotificationCheck();
        } catch {
          // non-critical
        }
      }

      playUpdateBeep();
      toast({
        title: t("stockUpdated"),
        description: `${product.name}: ${stockNum}`,
      });
      onOpenChange(false);
    } catch {
      playErrorBeep();
      toast({
        title: t("updateFailed"),
        description: t("pleaseTryAgain"),
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const displayName = product?.name || productName || t("product");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t("updateStock")}</DialogTitle>
          <DialogDescription>
            {t("updateStockFor")} {displayName}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="stock">{t("stockQuantity")}</Label>
            <Input
              id="stock"
              type="number"
              min="0"
              value={stockValue}
              onChange={(e) => setStockValue(e.target.value)}
              placeholder={t("enterStockQuantity")}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  void handleUpdate();
                }
              }}
            />
            {product?.minStock !== undefined && (
              <p className="text-xs text-muted-foreground">
                {t("minimumStockLabel")}: {product.minStock}
              </p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isUpdating}>
            {t("cancel")}
          </Button>
          <Button onClick={() => void handleUpdate()} disabled={isUpdating}>
            {isUpdating ? t("updating") : t("updateStock")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
