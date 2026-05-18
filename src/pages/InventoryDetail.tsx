import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { inventoryApi } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { ArrowLeft, Pencil, Plus, Loader2, Package } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

type Inventory = {
  _id?: string;
  id?: number;
  name: string;
  description?: string;
};

type Product = {
  _id?: string;
  id?: number;
  name: string;
  category?: string;
  stock?: number;
  sellingPrice?: number;
  costPrice?: number;
  inventoryId?: string | null;
};

const getIdString = (x: { _id?: string; id?: number }) => String(x._id ?? x.id ?? "");

const InventoryDetail = () => {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { items: allProducts, isLoading: productsLoading, refresh: refreshProducts } = useApi<Product>({
    endpoint: "products",
    defaultValue: [],
  });

  const [inventory, setInventory] = useState<Inventory | null>(null);
  const [loading, setLoading] = useState(true);

  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const loadInventory = async () => {
    setLoading(true);
    try {
      const res = await inventoryApi.getById(id);
      const inv = (res.data || null) as any;
      setInventory(inv);
      setName(inv?.name || "");
      setDescription(inv?.description || "");
    } catch (e: any) {
      toast({
        title: "Failed to load inventory",
        description: e?.message || e?.response?.error || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    loadInventory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const products = useMemo(() => {
    return allProducts.filter((p: any) => String(p.inventoryId ?? "") === String(id));
  }, [allProducts, id]);

  const openEdit = () => {
    setName(inventory?.name || "");
    setDescription(inventory?.description || "");
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await inventoryApi.update(id, { name: name.trim(), description: description.trim() || undefined });
      toast({ title: "Inventory updated" });
      setEditOpen(false);
      await loadInventory();
    } catch (e: any) {
      toast({
        title: "Update failed",
        description: e?.message || e?.response?.error || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAddProduct = () => {
    navigate(`/products/add?inventoryId=${encodeURIComponent(id)}`);
  };

  const title = loading ? "Inventory" : inventory?.name || "Inventory";

  return (
    <AppLayout title={title}>
      {loading ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-10 w-24 rounded-md" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-10 w-28 rounded-md" />
              <Skeleton className="h-10 w-28 rounded-md" />
            </div>
          </div>

          <Skeleton className="h-4 w-72" />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-40" />
            </div>
            <Skeleton className="h-3 w-20" />
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-3">
            <div className="space-y-3">
              <div className="grid grid-cols-5 gap-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </div>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="grid grid-cols-5 gap-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Button variant="outline" className="gap-2" onClick={() => navigate("/inventories")}>
              <ArrowLeft size={16} />
              Back
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="gap-2" onClick={openEdit} disabled={loading || !inventory}>
              <Pencil size={16} />
              Edit shop
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2" onClick={handleAddProduct} disabled={loading}>
              <Plus size={16} />
              Add product
            </Button>
          </div>
        </div>

        {inventory?.description ? <div className="text-sm text-muted-foreground">{inventory.description}</div> : null}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            <Package size={16} />
            Products in this shop
          </div>
          <div className="text-xs text-gray-500">
            {productsLoading ? "Loading..." : `${products.length} product(s)`}
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-3">
            {productsLoading ? (
              <div className="text-sm text-muted-foreground">Loading products...</div>
            ) : products.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                No products yet in this inventory. Click <b>Add product</b>.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead className="text-right">Selling</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((p) => {
                    const pid = getIdString(p);
                    return (
                      <TableRow key={pid}>
                        <TableCell className="font-medium text-gray-900">{p.name}</TableCell>
                        <TableCell className="text-gray-600">{(p.category || "-").toString()}</TableCell>
                        <TableCell className="text-right">{Number(p.stock || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-right">{Number(p.costPrice || 0).toLocaleString()} rwf</TableCell>
                        <TableCell className="text-right font-semibold">{Number(p.sellingPrice || 0).toLocaleString()} rwf</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
        </div>
      </div>
      )}

      <Dialog open={editOpen} onOpenChange={(v) => (!saving ? setEditOpen(v) : null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit shop</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} disabled={saving} />
            </div>
            <div className="space-y-1">
              <Label>Description (optional)</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} disabled={saving} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={saveEdit} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default InventoryDetail;

