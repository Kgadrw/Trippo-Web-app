import { useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useApi } from "@/hooks/useApi";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Search, Pencil, Trash2, Scissors } from "lucide-react";
import { RecordSaleModal } from "@/components/mobile/RecordSaleModal";
import { useTranslation } from "@/hooks/useTranslation";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ServiceItem {
  id?: number;
  _id?: string;
  name: string;
  sellingPrice: number;
  costPrice?: number;
  category?: string;
  stock?: number;
}

const Products = () => {
  const { toast } = useToast();
  const { t, language } = useTranslation();
  const { items, isLoading, add, update, remove } = useApi<ServiceItem>({
    endpoint: "products",
    defaultValue: [],
  });
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceItem | null>(null);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [recordModalOpen, setRecordModalOpen] = useState(false);
  const [prefillServiceName, setPrefillServiceName] = useState("");

  const services = useMemo(() => {
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter((x) => x.name.toLowerCase().includes(q));
  }, [items, query]);

  const openCreate = () => {
    setEditing(null);
    setName("");
    setPrice("");
    setOpen(true);
  };

  const openEdit = (item: ServiceItem) => {
    setEditing(item);
    setName(item.name);
    setPrice(String(item.sellingPrice || 0));
    setOpen(true);
  };

  const openRecordService = (item: ServiceItem) => {
    setPrefillServiceName(item.name || "");
    setRecordModalOpen(true);
  };

  const handleSave = async () => {
    const parsedPrice = Number(price);
    if (!name.trim() || Number.isNaN(parsedPrice) || parsedPrice <= 0) {
      toast({ title: "Invalid Input", description: "Enter a valid service name and price.", variant: "destructive" });
      return;
    }
    const payload = {
      name: name.trim(),
      sellingPrice: parsedPrice,
      costPrice: 0,
      category: "service",
      stock: 999999,
    } as ServiceItem;
    if (editing) {
      await update({ ...editing, ...payload } as any);
      toast({ title: "Service Updated", description: "Service updated successfully." });
    } else {
      await add(payload as any);
      toast({ title: "Service Added", description: "Service created successfully." });
    }
    setOpen(false);
  };

  const handleDelete = async (item: ServiceItem) => {
    if (!window.confirm(`Delete service "${item.name}"?`)) return;
    await remove(item as any);
    toast({ title: "Service Deleted", description: "Service removed successfully." });
  };

  const servicesTitle =
    language === "rw" ? "Serivisi" : language === "fr" ? "Services" : "Services";
  const serviceSingular =
    language === "rw" ? "Serivisi" : language === "fr" ? "Service" : "Service";

  if (isLoading) {
    return (
      <AppLayout title={servicesTitle}>
        <div className="p-4 text-sm text-gray-600">
          {t("loading")}...
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={servicesTitle}>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`${t("search")} ${servicesTitle.toLowerCase()}...`}
              className="pl-9"
            />
          </div>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2" onClick={openCreate}>
            <Plus size={16} />
            {t("add")} {serviceSingular}
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {services.map((service) => {
            const id = (service as any)._id || service.id;
            return (
              <div
                key={id}
                className="rounded-xl border border-gray-200 bg-white p-3 cursor-pointer transition-all hover:bg-gray-50 hover:shadow-sm aspect-square flex flex-col"
                onClick={() => openRecordService(service)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openRecordService(service);
                  }
                }}
                role="button"
                tabIndex={0}
                aria-label={`Record new service for ${service.name}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 font-medium text-gray-900 min-w-0 flex-1">
                    <Scissors size={16} className="mt-0.5 shrink-0" />
                    <span className="line-clamp-2 break-words">{service.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEdit(service);
                      }}
                    >
                      <Pencil size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-red-600 hover:bg-red-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(service);
                      }}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
                <div className="mt-auto pt-3">
                  <div className="text-[11px] text-gray-500">
                    {language === "rw" ? "Igiciro" : language === "fr" ? "Prix" : "Price"}
                  </div>
                  <div className="text-sm font-semibold text-gray-900 whitespace-nowrap">
                    {Number(service.sellingPrice || 0).toLocaleString()} rwf
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Service" : "Add Service"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Service Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Hair Cut" />
            </div>
            <div className="space-y-1">
              <Label>Price</Label>
              <Input type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <RecordSaleModal
        open={recordModalOpen}
        onOpenChange={setRecordModalOpen}
        initialServiceName={prefillServiceName}
      />
    </AppLayout>
  );
};

export default Products;
