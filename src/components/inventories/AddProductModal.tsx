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

export interface InventoryProduct {
  _id?: string;
  id?: number;
  name: string;
  category?: string;
  stock?: number;
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
};

export function AddProductModal({ open, onOpenChange, product, onSuccess }: AddProductModalProps) {
  const isEdit = !!product;
  const { toast } = useToast();
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
      });
    } else {
      setForm(emptyForm);
    }
  }, [open, product]);

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({ title: "Name required", description: "Enter a product name.", variant: "destructive" });
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
        title: "Duplicate product",
        description: "A product with this name and category already exists.",
        variant: "destructive",
      });
      return;
    }

    const payload = {
      name: form.name.trim(),
      category: form.category.trim(),
      costPrice: parseFloat(form.costPrice) || 0,
      sellingPrice: parseFloat(form.sellingPrice) || 0,
      stock: parseInt(form.stock, 10) || 0,
    };

    setIsSaving(true);
    try {
      if (isEdit && product) {
        await update({ ...product, ...payload } as InventoryProduct);
        toast({ title: "Product updated", description: "Changes saved successfully." });
      } else {
        await add(payload as InventoryProduct);
        toast({ title: "Product added", description: "Product saved successfully." });
      }
      await refresh(true);
      window.dispatchEvent(new CustomEvent("products-should-refresh"));
      onOpenChange(false);
      onSuccess?.();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to save product.";
      toast({ title: "Save failed", description: message, variant: "destructive" });
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
          <DialogTitle>{isEdit ? "Edit product" : "Add product"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1">
            <Label>Product name</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Enter product name"
              disabled={isSaving}
            />
          </div>
          <div className="space-y-1">
            <Label>Category</Label>
            <Input
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              placeholder="Enter category"
              disabled={isSaving}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Cost (rwf)</Label>
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
              <Label>Selling (rwf)</Label>
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
            <Label>Stock quantity</Label>
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
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            className="bg-blue-600 hover:bg-blue-700 text-white min-w-[7rem]"
            onClick={() => void handleSave()}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : isEdit ? (
              "Update"
            ) : (
              "Save"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
