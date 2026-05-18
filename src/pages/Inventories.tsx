import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { inventoryApi } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { Plus, Trash2, Loader2, Boxes } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  inventoryId?: string | null;
};

const getIdString = (x: { _id?: string; id?: number }) => String(x._id ?? x.id ?? "");

const Inventories = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { items: products } = useApi<Product>({ endpoint: "products", defaultValue: [] });

  const [inventories, setInventories] = useState<Inventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const refresh = async () => {
    setLoading(true);
    try {
      const res = await inventoryApi.getAll();
      setInventories(Array.isArray(res.data) ? res.data : []);
    } catch (e: any) {
      toast({
        title: "Failed to load inventories",
        description: e?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const countsByInventoryId = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of products) {
      const invId = (p.inventoryId ?? null) as any;
      if (!invId) continue;
      const key = String(invId);
      map.set(key, (map.get(key) || 0) + 1);
    }
    return map;
  }, [products]);

  const openCreate = () => {
    setName("");
    setDescription("");
    setOpen(true);
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await inventoryApi.create({ name: name.trim(), description: description.trim() || undefined });
      toast({ title: "Inventory created" });
      setOpen(false);
      await refresh();
    } catch (e: any) {
      toast({
        title: "Create failed",
        description: e?.message || e?.response?.error || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (inv: Inventory) => {
    const id = getIdString(inv);
    if (!id) return;
    if (!window.confirm(`Delete inventory "${inv.name}"?`)) return;
    setDeletingId(id);
    try {
      await inventoryApi.delete(id);
      toast({ title: "Inventory deleted" });
      await refresh();
    } catch (e: any) {
      toast({
        title: "Delete failed",
        description: e?.response?.error || e?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <AppLayout title="Inventories">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Boxes size={16} />
            {loading ? "Loading..." : `${inventories.length} inventories`}
          </div>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2" onClick={openCreate}>
            <Plus size={16} />
            Add Inventory
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1 space-y-2">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-3 w-56" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-8 w-8 rounded-md" />
                  </div>
                </div>
              ))
            : null}
          {inventories.map((inv) => {
            const id = getIdString(inv);
            const count = id ? countsByInventoryId.get(id) || 0 : 0;
            const isDeleting = deletingId === id;
            return (
              <div
                key={id}
                className="rounded-lg border border-gray-200 bg-white p-4 space-y-2 cursor-pointer hover:bg-gray-50"
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/inventories/${id}`)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    navigate(`/inventories/${id}`);
                  }
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold text-gray-900 truncate">{inv.name}</div>
                    {inv.description ? (
                      <div className="text-xs text-gray-500 line-clamp-2">{inv.description}</div>
                    ) : null}
                    <div className="text-xs text-gray-500 mt-1">{count} product(s)</div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-red-600 hover:bg-red-50"
                    disabled={isDeleting}
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleDelete(inv);
                    }}
                    aria-label={isDeleting ? "Deleting" : "Delete inventory"}
                  >
                    {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  </Button>
                </div>
              </div>
            );
          })}
          {!loading && inventories.length === 0 ? (
            <div className="text-sm text-muted-foreground">No inventories yet. Create one to group your products.</div>
          ) : null}
        </div>
      </div>

      <Dialog open={open} onOpenChange={(v) => (!saving ? setOpen(v) : null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Inventory</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} disabled={saving} placeholder="e.g. Shop 1" />
            </div>
            <div className="space-y-1">
              <Label>Description (optional)</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={saving}
                placeholder="e.g. Main stock for retail"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleCreate} disabled={saving}>
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

export default Inventories;

