import { useState, useEffect, useMemo } from "react";
import { X, Plus, ShoppingCart, Search, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { useApi } from "@/hooks/useApi";
import { playSaleBeep, playErrorBeep } from "@/lib/sound";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks/useTranslation";

interface Product {
  id?: number;
  _id?: string;
  name: string;
  category: string;
  costPrice: number;
  sellingPrice: number;
  stock: number;
}

interface Sale {
  id?: number;
  _id?: string;
  product: string;
  quantity: number;
  revenue: number;
  profit: number;
  cost: number;
  date: string;
  timestamp?: string;
  paymentMethod: string;
  saleType?: "service";
  serviceName?: string;
  workerId?: string;
  workerName?: string;
}

interface Client {
  id?: number;
  _id?: string;
  name: string;
  clientType?: "debtor" | "worker" | "other";
}

interface RecordSaleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaleRecorded?: () => void;
  initialServiceName?: string;
}

const ServiceCombobox = ({
  value,
  onValueChange,
  services,
  placeholder = "Search services...",
  className,
}: {
  value: string;
  onValueChange: (value: string) => void;
  services: Product[];
  placeholder?: string;
  className?: string;
}) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredServices = useMemo(() => {
    if (!searchQuery) return services;
    const query = searchQuery.toLowerCase();
    return services.filter((service) => service.name.toLowerCase().includes(query));
  }, [services, searchQuery]);

  const selectedService = services.find((s) => s.name === value) ?? null;

  return (
    <div className="relative w-full">
      <Popover open={open} onOpenChange={setOpen} modal={false}>
        <PopoverTrigger asChild>
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10 pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <Input
              type="text"
              value={selectedService ? selectedService.name : searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (!open) setOpen(true);
                if (e.target.value === "") {
                  onValueChange("");
                }
              }}
              onFocus={(e) => {
                e.stopPropagation();
                setOpen(true);
              }}
              onClick={(e) => {
                e.stopPropagation();
                setOpen(true);
              }}
              placeholder={placeholder}
              className={cn("pl-10 pr-10 cursor-text", className)}
            />
            {selectedService && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  onValueChange("");
                  setSearchQuery("");
                  setOpen(true);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 z-10"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            {!selectedService && (
              <ChevronsUpDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            )}
          </div>
        </PopoverTrigger>
        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] p-0"
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
          onInteractOutside={(e) => {
            const target = e.target as HTMLElement;
            if (target.closest('[role="combobox"]') || target.closest(".relative")) {
              e.preventDefault();
            }
          }}
        >
          <Command shouldFilter={false}>
            <CommandList>
              <CommandEmpty>No services found.</CommandEmpty>
              <CommandGroup>
                {filteredServices.length > 0 ? (
                  filteredServices.map((service) => {
                    const sid = ((service as any)._id || service.id || service.name).toString();
                    return (
                      <CommandItem
                        key={sid}
                        value={service.name}
                        onSelect={() => {
                          onValueChange(service.name);
                          setOpen(false);
                          setSearchQuery("");
                        }}
                        className="flex items-center justify-between gap-3"
                      >
                        <span className="truncate font-medium">{service.name}</span>
                        <span className="shrink-0 text-sm font-semibold text-gray-700">
                          rwf {service.sellingPrice.toLocaleString()}
                        </span>
                      </CommandItem>
                    );
                  })
                ) : (
                  <CommandEmpty>No services found. Try a different search.</CommandEmpty>
                )}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export function RecordSaleModal({ open, onOpenChange, onSaleRecorded, initialServiceName }: RecordSaleModalProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { items: products } = useApi<Product>({
    endpoint: "products",
    defaultValue: [],
  });
  const { add: addSale } = useApi<Sale>({
    endpoint: "sales",
    defaultValue: [],
  });
  const { items: clients } = useApi<Client>({
    endpoint: "clients",
    defaultValue: [],
  });

  const [serviceName, setServiceName] = useState("");
  const [selectedWorkerId, setSelectedWorkerId] = useState("");
  const [serviceAmount, setServiceAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [saleDate, setSaleDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [isRecordingSale, setIsRecordingSale] = useState(false);

  useEffect(() => {
    if (!open) {
      setServiceName("");
      setSelectedWorkerId("");
      setServiceAmount("");
      setPaymentMethod("cash");
      setSaleDate(new Date().toISOString().split("T")[0]);
    } else if (initialServiceName?.trim()) {
      setServiceName(initialServiceName.trim());
    }
  }, [open, initialServiceName]);

  const workers = useMemo(
    () => clients.filter((c) => c.clientType === "worker"),
    [clients],
  );

  const availableServices = useMemo(() => {
    return [...products]
      .filter((p) => (p.category || "").toLowerCase() === "service" && p.name?.trim())
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [products]);

  useEffect(() => {
    if (!open || !initialServiceName?.trim()) return;
    const selected = availableServices.find((s) => s.name === initialServiceName.trim());
    if (selected && selected.sellingPrice > 0) {
      setServiceAmount(String(selected.sellingPrice));
    }
  }, [open, initialServiceName, availableServices]);

  const handleServiceChange = (value: string) => {
    setServiceName(value);
    const selectedService = availableServices.find((s) => s.name === value);
    if (selectedService && selectedService.sellingPrice > 0) {
      setServiceAmount(String(selectedService.sellingPrice));
    }
  };

  const handleRecordSale = async () => {
    if (!serviceName.trim() || !selectedWorkerId || !serviceAmount) {
      playErrorBeep();
      toast({
        title: t("missingInformation"),
        description: t("fillServiceWorkerAmount"),
        variant: "destructive",
      });
      return;
    }

    const amount = parseFloat(serviceAmount);
    if (isNaN(amount) || amount <= 0) {
      playErrorBeep();
      toast({
        title: t("invalidAmount"),
        description: t("serviceAmountMustBePositive"),
        variant: "destructive",
      });
      return;
    }

    const worker = workers.find((w) => ((w as any)._id || w.id)?.toString() === selectedWorkerId);
    if (!worker) {
      playErrorBeep();
      toast({
        title: t("workerNotFound"),
        description: t("selectValidWorker"),
        variant: "destructive",
      });
      return;
    }

    setIsRecordingSale(true);
    try {
      const now = new Date();
      let saleDateTime: Date;
      if (saleDate) {
        const selectedDate = new Date(saleDate + "T00:00:00");
        saleDateTime = new Date(selectedDate);
        saleDateTime.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
      } else {
        saleDateTime = now;
      }

      const newSale: Sale = {
        product: serviceName.trim(),
        quantity: 1,
        revenue: amount,
        cost: 0,
        profit: 0,
        date: saleDateTime.toISOString(),
        timestamp: new Date().toISOString(),
        paymentMethod,
        saleType: "service",
        serviceName: serviceName.trim(),
        workerId: selectedWorkerId,
        workerName: worker.name,
      };

      await addSale(newSale);
      playSaleBeep();
      toast({
        title: t("serviceRecorded"),
        description: t("serviceRecordedDesc")
          .replace("{product}", serviceName.trim())
          .replace("{worker}", worker.name)
          .replace("{amount}", amount.toLocaleString()),
      });

      setServiceName("");
      setSelectedWorkerId("");
      setServiceAmount("");
      setPaymentMethod("cash");
      setSaleDate(new Date().toISOString().split("T")[0]);

      onSaleRecorded?.();

      setTimeout(() => {
        onOpenChange(false);
      }, 500);
    } catch (error: any) {
      playErrorBeep();
      toast({
        title: t("errorRecordingService"),
        description: error?.message || error?.response?.error || t("recordServiceFailedDesc"),
        variant: "destructive",
      });
    } finally {
      setIsRecordingSale(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[480px] max-h-[85vh] overflow-y-auto p-0 bg-white border-gray-300 rounded-2xl shadow-xl">
        <div className="p-4">
          <DialogHeader className="mb-3 pb-3 border-b border-gray-100">
            <DialogTitle className="flex items-center justify-between text-gray-900 text-lg font-semibold">
              <span className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <Plus size={18} className="text-white" />
                </div>
                <span>{t("recordNewSale")}</span>
              </span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-600">{t("serviceName")}</Label>
              <ServiceCombobox
                value={serviceName}
                onValueChange={handleServiceChange}
                services={availableServices}
                placeholder={t("selectService")}
                className="h-10 text-base"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-600">{t("worker")}</Label>
              <Select value={selectedWorkerId} onValueChange={setSelectedWorkerId}>
                <SelectTrigger className="h-10 text-base">
                  <SelectValue placeholder={t("selectWorker")} />
                </SelectTrigger>
                <SelectContent>
                  {workers.length > 0 ? (
                    workers.map((worker) => {
                      const workerId = ((worker as any)._id || worker.id)?.toString();
                      if (!workerId) return null;
                      return (
                        <SelectItem key={workerId} value={workerId}>
                          {worker.name}
                        </SelectItem>
                      );
                    })
                  ) : (
                    <SelectItem value="__no_worker__" disabled>
                      {t("noWorkersAddFirst")}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-gray-600">{t("amount")} (rwf)</Label>
                <Input
                  type="number"
                  min="0"
                  value={serviceAmount}
                  onChange={(e) => setServiceAmount(e.target.value)}
                  className="h-10 text-base"
                  placeholder={t("amount")}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-gray-600">{t("paymentMethod")}</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger className="h-10 text-base">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">{t("cash")}</SelectItem>
                    <SelectItem value="momo">{t("momoPay")}</SelectItem>
                    <SelectItem value="card">{t("card")}</SelectItem>
                    <SelectItem value="airtel">{t("airtelPay")}</SelectItem>
                    <SelectItem value="transfer">{t("bankTransfer")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-gray-600">{t("date")}</Label>
                <Input
                  type="date"
                  value={saleDate}
                  onChange={(e) => setSaleDate(e.target.value)}
                  className="h-10 text-base"
                />
              </div>
            </div>

            <Button
              onClick={handleRecordSale}
              disabled={isRecordingSale || !serviceName.trim() || !selectedWorkerId || !serviceAmount}
              className="w-full h-11 bg-primary hover:bg-blue-700 text-white font-semibold shadow-md hover:shadow-lg transition-all rounded-lg gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ShoppingCart size={18} />
              {isRecordingSale ? t("recording") : t("recordSale")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
