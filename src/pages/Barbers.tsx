import { useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
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
import { useApi } from "@/hooks/useApi";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Trash2, UserRound, Pencil } from "lucide-react";

interface Barber {
  id?: number;
  _id?: string;
  name: string;
  businessType?: string;
  clientType?: "debtor" | "worker" | "other";
}

export default function Barbers() {
  const { toast } = useToast();
  const { items, isLoading, add, update, remove, refresh } = useApi<Barber>({
    endpoint: "clients",
    defaultValue: [],
  });

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editingBarber, setEditingBarber] = useState<Barber | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");

  const barbers = useMemo(() => {
    // Strictly keep barber/worker records only to avoid mixing with other client types
    const workers = items.filter((x) => x.clientType === "worker");
    if (!query.trim()) return workers;
    const q = query.toLowerCase();
    return workers.filter((x) =>
      `${x.name} ${x.businessType || ""}`.toLowerCase().includes(q)
    );
  }, [items, query]);

  const openCreate = () => {
    setEditingBarber(null);
    setName("");
    setCategory("");
    setOpen(true);
  };

  const openEdit = (barber: Barber) => {
    setEditingBarber(barber);
    setName(barber.name || "");
    setCategory(barber.businessType || "");
    setOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim() || !category.trim()) {
      toast({ title: "Missing Information", description: "Name and category are required.", variant: "destructive" });
      return;
    }
    try {
      if (editingBarber) {
        await update({
          ...editingBarber,
          name: name.trim(),
          businessType: category.trim(),
          clientType: "worker",
        } as any);
        toast({ title: "Barber Updated", description: "Barber updated successfully." });
      } else {
        await add({
          name: name.trim(),
          businessType: category.trim(),
          clientType: "worker",
        } as any);
        toast({ title: "Barber Added", description: "Barber created successfully." });
      }
      await refresh(true);
      setName("");
      setCategory("");
      setEditingBarber(null);
      setOpen(false);
    } catch (error: any) {
      toast({
        title: "Save Failed",
        description: error?.message || "Failed to save barber. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (barber: Barber) => {
    if (!window.confirm(`Delete ${barber.name}?`)) return;
    try {
      await remove(barber as any);
      await refresh(true);
      toast({ title: "Deleted", description: "Barber removed." });
    } catch (error: any) {
      toast({
        title: "Delete Failed",
        description: error?.message || "Failed to delete barber. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <AppLayout title="Barbers">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search barbers..."
              className="pl-9"
            />
          </div>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2" onClick={openCreate}>
            <Plus size={16} />
            Add Barber
          </Button>
        </div>

        {isLoading ? (
          <div className="rounded-lg border bg-white p-6 text-sm text-gray-600">Loading barbers...</div>
        ) : barbers.length === 0 ? (
          <div className="rounded-lg border bg-white p-6 text-sm text-gray-600">
            No barbers found. Click <strong>Add Barber</strong> to create one.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {barbers.map((b) => {
              const id = (b as any)._id || b.id;
              return (
                <div key={id} className="rounded-lg border bg-white p-4 flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 font-medium text-gray-900">
                      <UserRound size={16} />
                      {b.name}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{b.businessType || "Barber"}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" className="hover:bg-gray-100" onClick={() => openEdit(b)}>
                      <Pencil size={14} />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50" onClick={() => handleDelete(b)}>
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingBarber ? "Edit Barber" : "Add Barber"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. John" />
            </div>
            <div className="space-y-1">
              <Label>Category</Label>
              <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Barber, Nail Artist" />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setOpen(false);
                setEditingBarber(null);
                setName("");
                setCategory("");
              }}
            >
              Cancel
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleSave}>
              {editingBarber ? "Update" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
