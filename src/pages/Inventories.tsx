import { useMemo, useState } from "react";

import { AppLayout } from "@/components/layout/AppLayout";

import { Button } from "@/components/ui/button";

import { useApi } from "@/hooks/useApi";

import { useToast } from "@/hooks/use-toast";

import { Plus, Package, MoreVertical, Pencil, Trash2, Loader2 } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";

import { cn } from "@/lib/utils";
import { DesktopDataTable, MobileDataList, MobileListCard } from "@/components/ui/mobile-list-card";

import { AddProductModal, type InventoryProduct } from "@/components/inventories/AddProductModal";

import {

  DropdownMenu,

  DropdownMenuContent,

  DropdownMenuItem,

  DropdownMenuTrigger,

} from "@/components/ui/dropdown-menu";



const getIdString = (x: { _id?: string; id?: number }) => String(x._id ?? x.id ?? "");



const isService = (p: InventoryProduct) => (p.category || "").toLowerCase() === "service";



const Inventories = () => {

  const { toast } = useToast();

  const [addModalOpen, setAddModalOpen] = useState(false);

  const [editingProduct, setEditingProduct] = useState<InventoryProduct | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { items: products, isLoading, refresh, remove } = useApi<InventoryProduct>({

    endpoint: "products",

    defaultValue: [],

  });



  const stockProducts = useMemo(() => products.filter((p) => !isService(p)), [products]);



  const totalStock = useMemo(

    () => stockProducts.reduce((sum, p) => sum + (Number(p.stock) || 0), 0),

    [stockProducts],

  );



  const totalValue = useMemo(

    () => stockProducts.reduce((sum, p) => sum + (Number(p.sellingPrice) || 0) * (Number(p.stock) || 0), 0),

    [stockProducts],

  );



  const openAdd = () => {

    setEditingProduct(null);

    setAddModalOpen(true);

  };



  const openEdit = (product: InventoryProduct) => {

    setEditingProduct(product);

    setAddModalOpen(true);

  };



  const handleModalOpenChange = (open: boolean) => {

    setAddModalOpen(open);

    if (!open) setEditingProduct(null);

  };



  const handleDelete = async (product: InventoryProduct) => {

    if (!window.confirm(`Delete product "${product.name}"?`)) return;

    const id = getIdString(product);

    if (!id) return;

    setDeletingId(id);

    try {

      await remove(product);

      await refresh(true);

      window.dispatchEvent(new CustomEvent("products-should-refresh"));

      toast({ title: "Product deleted", description: "Product removed successfully." });

    } catch (error: unknown) {

      const message = error instanceof Error ? error.message : "Failed to delete product.";

      toast({ title: "Delete failed", description: message, variant: "destructive" });

    } finally {

      setDeletingId(null);

    }

  };



  return (

    <AppLayout title="Inventories">

      <div className="lg:bg-white lg:rounded-lg lg:overflow-hidden space-y-4 pb-4">

        <div className="lg:px-4 lg:pt-4 flex items-center justify-between gap-2">

          <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">

            <Package size={16} />

            <span>

              {isLoading ? "Loading..." : "Products available"}

            </span>

          </div>

          <Button

            className="bg-blue-600 hover:bg-blue-700 text-white gap-2 shrink-0 rounded-lg h-10"

            onClick={openAdd}

          >

            <Plus size={16} />

            Add product

          </Button>

        </div>



        {isLoading ? (

          <>
          <DesktopDataTable className="px-4">

            <table className="w-full border-collapse">

              <thead className="bg-gray-100 border-b border-gray-200">

                <tr>

                  {["Product", "Category", "Stock", "Cost", "Selling", ""].map((col) => (

                    <th key={col} className="text-left py-4 px-6">

                      <Skeleton className="h-4 w-20" />

                    </th>

                  ))}

                </tr>

              </thead>

              <tbody>

                {Array.from({ length: 6 }).map((_, i) => (

                  <tr key={i} className="border-b border-gray-200">

                    {Array.from({ length: 6 }).map((_, j) => (

                      <td key={j} className="py-4 px-6">

                        <Skeleton className="h-4 w-24" />

                      </td>

                    ))}

                  </tr>

                ))}

              </tbody>

            </table>

          </DesktopDataTable>
          <MobileDataList>
            {Array.from({ length: 4 }).map((_, i) => (
              <MobileListCard key={i} index={i}>
                <Skeleton className="h-4 w-32 mb-2" />
                <Skeleton className="h-4 w-full mb-1" />
                <Skeleton className="h-4 w-24" />
              </MobileListCard>
            ))}
          </MobileDataList>
          </>

        ) : stockProducts.length === 0 ? (

          <div className="px-4 py-5 text-sm text-muted-foreground">

            No products available yet. Click <strong>Add product</strong> to get started.

          </div>

        ) : (

          <>
          <DesktopDataTable>

            <table className="w-full border-collapse">

              <thead className="sticky top-0 z-10 bg-gray-100 border-b border-gray-200">

                <tr>

                  <th className="text-left text-sm font-semibold text-gray-700 py-4 px-6">Product</th>

                  <th className="text-left text-sm font-semibold text-gray-700 py-4 px-6">Category</th>

                  <th className="text-right text-sm font-semibold text-gray-700 py-4 px-6">Stock</th>

                  <th className="text-right text-sm font-semibold text-gray-700 py-4 px-6">Cost</th>

                  <th className="text-right text-sm font-semibold text-gray-700 py-4 px-6">Selling</th>

                  <th className="text-right text-sm font-semibold text-gray-700 py-4 px-6">Actions</th>

                </tr>

              </thead>

              <tbody>

                {stockProducts.map((p, index) => {

                  const pid = getIdString(p);

                  const stock = Number(p.stock || 0);

                  const isDeleting = deletingId === pid;

                  return (

                    <tr

                      key={pid}

                      className={cn(

                        "border-b border-gray-200",

                        index % 2 === 0 ? "bg-white" : "bg-gray-50",

                      )}

                    >

                      <td className="py-4 px-6 text-sm font-medium text-gray-900">{p.name}</td>

                      <td className="py-4 px-6 text-sm text-gray-600">{(p.category || "—").toString()}</td>

                      <td className="py-4 px-6 text-sm text-right tabular-nums">

                        <span

                          className={cn(

                            "font-medium",

                            stock === 0 ? "text-red-600" : stock <= 5 ? "text-amber-600" : "text-gray-900",

                          )}

                        >

                          {stock.toLocaleString()}

                        </span>

                      </td>

                      <td className="py-4 px-6 text-sm text-gray-700 text-right tabular-nums">

                        {Number(p.costPrice || 0).toLocaleString()} rwf

                      </td>

                      <td className="py-4 px-6 text-sm font-semibold text-gray-900 text-right tabular-nums">

                        {Number(p.sellingPrice || 0).toLocaleString()} rwf

                      </td>

                      <td className="py-4 px-6 text-right">

                        <DropdownMenu>

                          <DropdownMenuTrigger asChild>

                            <Button

                              variant="ghost"

                              size="sm"

                              className="h-8 w-8 p-0"

                              aria-label="Product actions"

                              disabled={isDeleting}

                            >

                              {isDeleting ? (

                                <Loader2 size={16} className="animate-spin" />

                              ) : (

                                <MoreVertical size={16} />

                              )}

                            </Button>

                          </DropdownMenuTrigger>

                          <DropdownMenuContent align="end">

                            <DropdownMenuItem onClick={() => openEdit(p)}>

                              <Pencil size={14} className="mr-2" />

                              Edit

                            </DropdownMenuItem>

                            <DropdownMenuItem

                              onClick={() => void handleDelete(p)}

                              disabled={isDeleting}

                              className="text-red-600 focus:text-red-600 focus:bg-red-50"

                            >

                              <Trash2 size={14} className="mr-2" />

                              Delete

                            </DropdownMenuItem>

                          </DropdownMenuContent>

                        </DropdownMenu>

                      </td>

                    </tr>

                  );

                })}

                <tr className="border-t border-gray-200 bg-blue-50/70">

                  <td colSpan={2} className="py-4 px-6 text-sm font-semibold text-gray-800">

                    Total

                  </td>

                  <td className="py-4 px-6 text-sm font-semibold text-gray-900 text-right tabular-nums">

                    {totalStock.toLocaleString()}

                  </td>

                  <td />

                  <td className="py-4 px-6 text-sm font-semibold text-gray-900 text-right tabular-nums">

                    {totalValue.toLocaleString()} rwf

                  </td>

                  <td />

                </tr>

              </tbody>

            </table>

          </DesktopDataTable>

          <MobileDataList>
            {stockProducts.map((p, index) => {
              const pid = getIdString(p);
              const stock = Number(p.stock || 0);
              const isDeleting = deletingId === pid;
              return (
                <MobileListCard key={pid} index={index}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{p.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{(p.category || "—").toString()}</p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 shrink-0"
                          aria-label="Product actions"
                          disabled={isDeleting}
                        >
                          {isDeleting ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <MoreVertical size={16} />
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(p)}>
                          <Pencil size={14} className="mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => void handleDelete(p)}
                          disabled={isDeleting}
                          className="text-red-600 focus:text-red-600 focus:bg-red-50"
                        >
                          <Trash2 size={14} className="mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="text-gray-500 block">Stock</span>
                      <span
                        className={cn(
                          "font-semibold tabular-nums",
                          stock === 0 ? "text-red-600" : stock <= 5 ? "text-amber-600" : "text-gray-900",
                        )}
                      >
                        {stock.toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 block">Cost</span>
                      <span className="font-medium text-gray-700 tabular-nums">
                        {Number(p.costPrice || 0).toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 block">Selling</span>
                      <span className="font-semibold text-gray-900 tabular-nums">
                        {Number(p.sellingPrice || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </MobileListCard>
              );
            })}
            <MobileListCard className="bg-blue-50/70">
              <div className="flex items-center justify-between text-sm font-semibold">
                <span className="text-gray-800">Total</span>
                <div className="text-right tabular-nums">
                  <div className="text-gray-900">{totalStock.toLocaleString()} units</div>
                  <div className="text-gray-900">{totalValue.toLocaleString()} rwf</div>
                </div>
              </div>
            </MobileListCard>
          </MobileDataList>
          </>

        )}

      </div>



      <AddProductModal

        open={addModalOpen}

        onOpenChange={handleModalOpenChange}

        product={editingProduct}

        onSuccess={() => void refresh(true)}

      />

    </AppLayout>

  );

};



export default Inventories;

