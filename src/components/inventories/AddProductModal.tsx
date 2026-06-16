import { useEffect, useState } from "react";
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
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useApi } from "@/hooks/useApi";
import { useTranslation } from "@/hooks/useTranslation";

export interface InventoryProduct {
  _id?: string;
  id?: number;
  name: string;
  category?: string;
  stock?: number;
  minStock?: number;
  sellingPrice?: number;
  costPrice?: number;
  productType?: string;
}

interface AddProductModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: InventoryProduct | null;
  onSuccess?: () => void;
}

function getIdString(x: { _id?: string; id?: number }) {
  return String(x._id ?? x.id ?? "");
}

function sanitizeDecimalField(raw: string): string {
  const cleaned = raw.replace(/[^\d.]/g, "");
  const dot = cleaned.indexOf(".");
  if (dot === -1) return cleaned;
  return cleaned.slice(0, dot + 1) + cleaned.slice(dot + 1).replace(/\./g, "");
}

function sanitizeIntField(raw: string): string {
  return raw.replace(/\D/g, "");
}

const emptyForm = {
  name: "",
  category: "",
  costPrice: "",
  sellingPrice: "",
  stock: "",
  minStock: "5",
};

const DEFAULT_MIN_STOCK = 5;

export function AddProductModal({ open, onOpenChange, product, onSuccess }: AddProductModalProps) {
  const isEdit = !!product;
  const { toast } = useToast();
  const { t } = useTranslation();
  const { items: products, add, update, refresh } = useApi<InventoryProduct>({
    endpoint: "products",
    defaultValue: [],
  });

  const [form, setForm] = useState(emptyForm);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      setForm(emptyForm);
      setIsSaving(false);
      return;
    }
    if (product) {
      setForm({
        name: product.name || "",
        category: product.category || "",
        costPrice: String(product.costPrice ?? ""),
        sellingPrice: String(product.sellingPrice ?? ""),
        stock: String(product.stock ?? ""),
        minStock: String(product.minStock ?? DEFAULT_MIN_STOCK),
      });
    } else {
      setForm(emptyForm);
    }
  }, [open, product]);

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({ title: t("nameRequired"), description: t("enterProductNameMsg"), variant: "destructive" });
      return;
    }

    const editingId = product ? getIdString(product) : "";
    const duplicate = products.find((p) => {
      const sameName = p.name.trim().toLowerCase() === form.name.trim().toLowerCase();
      const sameCategory = (p.category || "").trim().toLowerCase() === form.category.trim().toLowerCase();
      const isSelf = editingId && getIdString(p) === editingId;
      return sameName && sameCategory && !isSelf;
    });
    if (duplicate) {
      toast({
        title: t("duplicateProduct"),
        description: t("duplicateProductDesc"),
        variant: "destructive",
      });
      return;
    }

    const stock = parseInt(form.stock, 10) || 0;
    const minStock = form.minStock.trim() === "" ? DEFAULT_MIN_STOCK : parseInt(form.minStock, 10) || 0;

    const payload = {
      name: form.name.trim(),
      category: form.category.trim(),
      costPrice: parseFloat(form.costPrice) || 0,
      sellingPrice: parseFloat(form.sellingPrice) || 0,
      stock,
      minStock,
    };

    setIsSaving(true);
    try {
      if (isEdit && product) {
        await update({ ...product, ...payload } as InventoryProduct);
        toast({ title: t("productUpdated"), description: t("changesSaved") });
      } else {
        await add(payload as InventoryProduct);
        toast({ title: t("productAdded"), description: t("productSaved") });
      }
      await refresh(true);
      window.dispatchEvent(new CustomEvent("products-should-refresh"));
      onOpenChange(false);
      onSuccess?.();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to save product.";
      toast({ title: t("failed"), description: message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && isSaving) return;
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("editProduct") : t("addProduct")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1">
            <Label>{t("productName")}</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder={t("enterProductName")}
              disabled={isSaving}
            />
          </div>
          <div className="space-y-1">
            <Label>{t("category")}</Label>
            <Input
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              placeholder={t("enterCategory")}
              disabled={isSaving}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>{t("cost")} (rwf)</Label>
              <Input
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={form.costPrice}
                onChange={(e) => setForm({ ...form, costPrice: sanitizeDecimalField(e.target.value) })}
                placeholder="0"
                disabled={isSaving}
              />
            </div>
            <div className="space-y-1">
              <Label>{t("selling")} (rwf)</Label>
              <Input
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={form.sellingPrice}
                onChange={(e) => setForm({ ...form, sellingPrice: sanitizeDecimalField(e.target.value) })}
                placeholder="0"
                disabled={isSaving}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label>{isEdit ? t("stockQuantity") : t("initialStock")}</Label>
            <Input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={form.stock}
              onChange={(e) => setForm({ ...form, stock: sanitizeIntField(e.target.value) })}
              placeholder="0"
              disabled={isSaving}
            />
          </div>
          <div className="space-y-1">
            <Label>{t("minStockAlert")}</Label>
            <Input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={form.minStock}
              onChange={(e) => setForm({ ...form, minStock: sanitizeIntField(e.target.value) })}
              placeholder={String(DEFAULT_MIN_STOCK)}
              disabled={isSaving}
            />
            <p className="text-xs text-muted-foreground">{t("minStockAlertWhen")}</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
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
                {t("saving")}
              </>
            ) : isEdit ? (
              t("update")
            ) : (
              t("save")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
