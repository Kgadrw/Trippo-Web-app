import { useState, useMemo } from "react";
import { AlertTriangle, Edit2, Check, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { playUpdateBeep, playWarningBeep, initAudio } from "@/lib/sound";
import { useApi } from "@/hooks/useApi";

interface Product {
  id?: number;
  _id?: string;
  name: string;
  stock: number;
  minStock?: number;
}

interface LowStockItem {
  id: string | number;
  name: string;
  stock: number;
  minStock?: number;
}

export function LowStockAlert() {
  const { toast } = useToast();
  const {
    items: products,
    update: updateProduct,
    refresh: refreshProducts,
  } = useApi<Product>({
    endpoint: "products",
    defaultValue: [],
  });

  // Filter products with low stock
  const lowStockItems = useMemo(() => {
    return products
      .filter((product) => {
        const minStock = product.minStock || 0;
        return product.stock <= minStock;
      })
      .map((product) => ({
        id: product._id || product.id || '',
        name: product.name,
        stock: product.stock,
        minStock: product.minStock,
      }))
      .slice(0, 5); // Show top 5 low stock items
  }, [products]);

  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [editStock, setEditStock] = useState<string>("");

  const handleEdit = (item: LowStockItem) => {
    setEditingId(item.id);
    setEditStock(item.stock.toString());
  };

  const handleSave = async (id: string | number) => {
    const stockValue = parseInt(editStock);
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
      const productId = (p as any)._id || p.id;
      return productId?.toString() === id.toString();
    });

    if (product) {
      try {
        await updateProduct({ ...product, stock: stockValue } as any);
        await refreshProducts();
        setEditingId(null);
        setEditStock("");

        playUpdateBeep();
        toast({
          title: "Stock Updated",
          description: "Stock quantity has been updated successfully.",
        });
      } catch (error) {
        playWarningBeep();
        toast({
          title: "Update Failed",
          description: "Failed to update stock. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditStock("");
  };

  return (
    <div className="kpi-card border border-transparent bg-white">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-10 h-10 !border-0 outline-none flex items-center justify-center" style={{ border: 'none', background: 'transparent' }}>
          <AlertTriangle size={20} className="text-red-600" style={{ border: 'none', outline: 'none' }} />
        </div>
        <h3 className="text-lg font-bold text-red-600">Low Stock Alert</h3>
      </div>
      <div className="space-y-3">
        {lowStockItems.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No low stock items
          </p>
        ) : (
          lowStockItems.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between py-2 border-b border-transparent last:border-0 gap-2 hover:bg-gray-100 transition-colors rounded-md px-2"
          >
            <span className="font-medium text-gray-800 text-sm flex-1 min-w-0 truncate">
              {item.name}
            </span>
            {editingId === item.id ? (
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  value={editStock}
                  onChange={(e) => setEditStock(e.target.value)}
                  className="w-20 h-8 text-sm border-2 border-transparent focus:border-transparent focus:ring-2 focus:ring-blue-300"
                  autoFocus
                />
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 hover:bg-green-100 rounded-full"
                  onClick={() => handleSave(item.id)}
                >
                  <Check size={14} className="text-green-600" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 hover:bg-red-100 rounded-full"
                  onClick={handleCancel}
                >
                  <X size={14} className="text-red-600" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-gray-700 whitespace-nowrap bg-gray-100 px-2 py-1 rounded">
                  {item.stock} left
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 hover:bg-gray-100 rounded-full"
                  onClick={() => handleEdit(item)}
                >
                  <Edit2 size={14} className="text-blue-700" />
                </Button>
              </div>
            )}
          </div>
          ))
        )}
      </div>
    </div>
  );
}
