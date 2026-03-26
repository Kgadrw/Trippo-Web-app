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
import { useTranslation } from "@/hooks/useTranslation";

interface Barber {
  id?: number;
  _id?: string;
  name: string;
  businessType?: string;
  clientType?: "debtor" | "worker" | "other";
}

export default function Barbers() {
  const { toast } = useToast();
  const { t, language } = useTranslation();
  const { items, isLoading, add, update, remove } = useApi<Barber>({
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
      toast({ title: "Deleted", description: "Barber removed." });
    } catch (error: any) {
      toast({
        title: "Delete Failed",
        description: error?.message || "Failed to delete barber. Please try again.",
        variant: "destructive",
      });
    }
  };

  const barbersTitle =
    language === "rw" ? "Umwogoshi" : language === "fr" ? "Coiffeurs" : "Barbers";
  const barberSingular =
    language === "rw" ? "Umwogoshi" : language === "fr" ? "Coiffeur" : "Barber";

  return (
    <AppLayout title={barbersTitle}>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`${t("search")} ${barbersTitle.toLowerCase()}...`}
              className="pl-9 rounded-full"
            />
          </div>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2 rounded-full" onClick={openCreate}>
            <Plus size={16} />
            {t("add")} {barberSingular}
          </Button>
        </div>

        {isLoading ? (
          <div className="rounded-lg border bg-white p-6 text-sm text-gray-600">Loading barbers...</div>
        ) : barbers.length === 0 ? (
          <div className="rounded-lg border bg-white p-6 text-sm text-gray-600">
            No barbers found. Click <strong>Add Barber</strong> to create one.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {barbers.map((b) => {
              const id = (b as any)._id || b.id;
              return (
                <div
                  key={id}
                  className="rounded-lg border border-gray-200 bg-white p-3 md:p-2 flex flex-col aspect-square md:aspect-[4/3] lg:aspect-[5/3] transition-all hover:shadow-sm relative overflow-hidden"
                >
                  <img
                    src="/logo.png"
                    alt=""
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 m-auto h-24 w-24 opacity-[0.06] select-none object-contain"
                  />
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-2 font-medium text-gray-900">
                        <UserRound size={16} className="mt-0.5 shrink-0" />
                        <span className="line-clamp-2 break-words">{b.name}</span>
                      </div>
                      <p className="text-xs text-gray-600 mt-1 line-clamp-2 break-words">
                        {b.businessType || "Barber"}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="sm" className="hover:bg-gray-100 rounded-full" onClick={() => openEdit(b)}>
                      <Pencil size={14} />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50 rounded-full" onClick={() => handleDelete(b)}>
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
                  <div className="mt-auto pt-3">
                    <div className="text-[11px] text-gray-500">Barber</div>
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
              className="rounded-full"
            >
              Cancel
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-full" onClick={handleSave}>
              {editingBarber ? "Update" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
