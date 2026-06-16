import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarClock, Plus, Loader2, UserRound, Scissors } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "@/hooks/useTranslation";
import { useToast } from "@/hooks/use-toast";
import { bookingApi } from "@/lib/api";
import { cn } from "@/lib/utils";

export type BookingStatus =
  | "pending"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "no_show";

export interface Booking {
  id?: number;
  _id?: string;
  clientName: string;
  phone?: string;
  clientId?: string;
  serviceId?: string;
  serviceName: string;
  workerId?: string;
  workerName?: string;
  startAt: string;
  durationMinutes?: number;
  status: BookingStatus;
  notes?: string;
}

interface Product {
  id?: number;
  _id?: string;
  name: string;
  category?: string;
}

interface Client {
  id?: number;
  _id?: string;
  name: string;
  clientType?: "debtor" | "worker" | "other";
  workerStatus?: "active" | "inactive";
}

interface DashboardBookingsProps {
  products: Product[];
  clients: Client[];
  className?: string;
}

function getId(item: { _id?: string; id?: number }) {
  return String(item._id ?? item.id ?? "");
}

function isService(product: Product) {
  return (product.category || "").toLowerCase() === "service";
}

function toDateInputValue(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function toTimeInputValue(date: Date) {
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

function formatBookingTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

const STATUS_LABEL_KEYS: Record<BookingStatus, keyof import("@/lib/translations").Translations> = {
  pending: "bookingStatusPending",
  confirmed: "bookingStatusConfirmed",
  in_progress: "bookingStatusInProgress",
  completed: "bookingStatusCompleted",
  cancelled: "bookingStatusCancelled",
  no_show: "bookingStatusNoShow",
};

const STATUS_STYLES: Record<BookingStatus, string> = {
  pending: "bg-amber-100 text-amber-800",
  confirmed: "bg-blue-100 text-blue-800",
  in_progress: "bg-violet-100 text-violet-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-gray-100 text-gray-700",
  no_show: "bg-red-100 text-red-800",
};

export function DashboardBookings({ products, clients, className }: DashboardBookingsProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const now = new Date();
  const [form, setForm] = useState({
    clientName: "",
    phone: "",
    serviceId: "",
    workerId: "",
    date: toDateInputValue(now),
    time: toTimeInputValue(now),
    durationMinutes: "30",
    notes: "",
  });

  const services = useMemo(() => products.filter(isService), [products]);
  const workers = useMemo(
    () => clients.filter((c) => c.clientType === "worker" && c.workerStatus !== "inactive"),
    [clients],
  );

  const loadBookings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await bookingApi.getAll({ date: toDateInputValue(new Date()) });
      setBookings(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error("Failed to load bookings:", error);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  const sortedBookings = useMemo(
    () =>
      [...bookings].sort(
        (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
      ),
    [bookings],
  );

  const resetForm = () => {
    const current = new Date();
    setForm({
      clientName: "",
      phone: "",
      serviceId: "",
      workerId: "",
      date: toDateInputValue(current),
      time: toTimeInputValue(current),
      durationMinutes: "30",
      notes: "",
    });
  };

  const handleCreate = async () => {
    if (!form.clientName.trim()) {
      toast({ title: t("error"), description: t("bookingClientName"), variant: "destructive" });
      return;
    }
    if (!form.serviceId) {
      toast({ title: t("error"), description: t("bookingService"), variant: "destructive" });
      return;
    }

    const service = services.find((s) => getId(s) === form.serviceId);
    const worker = workers.find((w) => getId(w) === form.workerId);
    const startAt = new Date(`${form.date}T${form.time}`);

    if (Number.isNaN(startAt.getTime())) {
      toast({ title: t("error"), description: t("bookingTime"), variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      await bookingApi.create({
        clientName: form.clientName.trim(),
        phone: form.phone.trim(),
        serviceId: form.serviceId,
        serviceName: service?.name || "",
        workerId: form.workerId || undefined,
        workerName: worker?.name || "",
        startAt: startAt.toISOString(),
        durationMinutes: Number(form.durationMinutes) || 30,
        notes: form.notes.trim(),
        status: "pending",
      });
      toast({ title: t("success"), description: t("bookingCreated") });
      setDialogOpen(false);
      resetForm();
      await loadBookings();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t("bookingFailed");
      toast({ title: t("error"), description: message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (booking: Booking, status: BookingStatus) => {
    const id = getId(booking);
    if (!id) return;
    setUpdatingId(id);
    try {
      await bookingApi.update(id, { status });
      setBookings((prev) => prev.map((b) => (getId(b) === id ? { ...b, status } : b)));
      toast({ title: t("success"), description: t("bookingUpdated") });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t("bookingFailed");
      toast({ title: t("error"), description: message, variant: "destructive" });
    } finally {
      setUpdatingId(null);
    }
  };

  const renderActions = (booking: Booking) => {
    const id = getId(booking);
    const busy = updatingId === id;

    const isFinished =
      booking.status === "completed" || booking.status === "cancelled" || booking.status === "no_show";
    if (isFinished) return null;

    return (
      <div className="flex flex-wrap gap-1.5">
        <Button size="sm" disabled={busy} className="bg-green-600 hover:bg-green-700 text-white" onClick={() => updateStatus(booking, "completed")}>
          {t("bookingConfirm")}
        </Button>
        {booking.status === "pending" ? (
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => updateStatus(booking, "cancelled")}>
            {t("bookingCancel")}
          </Button>
        ) : null}
      </div>
    );
  };

  return (
    <div className={cn("rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden", className)}>
      <div className="flex items-start justify-between gap-3 p-4 border-b border-gray-200">
        <div>
          <div className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-blue-600" />
            <h3 className="text-sm font-semibold text-gray-900 lg:text-base">{t("todaysBookings")}</h3>
          </div>
          <p className="text-xs text-gray-600 mt-1">{t("bookingsSubtitle")}</p>
        </div>
        <Button size="sm" className="shrink-0 gap-1.5" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">{t("addBooking")}</span>
        </Button>
      </div>

      {loading ? (
        <div className="p-4 space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : sortedBookings.length === 0 ? (
        <div className="p-8 text-center">
          <CalendarClock className="h-10 w-10 mx-auto mb-3 text-gray-300" />
          <p className="text-sm text-muted-foreground">{t("noBookingsToday")}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => setDialogOpen(true)}>
            {t("addBooking")}
          </Button>
        </div>
      ) : (
        <div className="divide-y divide-gray-100 max-h-[420px] overflow-auto">
          {sortedBookings.map((booking) => (
            <div key={getId(booking)} className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-gray-900 tabular-nums">
                      {formatBookingTime(booking.startAt)}
                    </span>
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold",
                        STATUS_STYLES[booking.status],
                      )}
                    >
                      {t(STATUS_LABEL_KEYS[booking.status])}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-900 mt-1 truncate">{booking.clientName}</p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-gray-600">
                    <span className="inline-flex items-center gap-1">
                      <Scissors className="h-3.5 w-3.5" />
                      {booking.serviceName}
                    </span>
                    {booking.workerName ? (
                      <span className="inline-flex items-center gap-1">
                        <UserRound className="h-3.5 w-3.5" />
                        {booking.workerName}
                      </span>
                    ) : null}
                    {booking.phone ? <span>{booking.phone}</span> : null}
                  </div>
                  {booking.notes ? (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{booking.notes}</p>
                  ) : null}
                </div>
                <div className="text-[10px] text-gray-400 shrink-0 tabular-nums">
                  {booking.durationMinutes || 30} min
                </div>
              </div>
              {renderActions(booking)}
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("addBooking")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="booking-client">{t("bookingClientName")}</Label>
              <Input
                id="booking-client"
                value={form.clientName}
                onChange={(e) => setForm((f) => ({ ...f, clientName: e.target.value }))}
                placeholder={t("name")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="booking-phone">{t("bookingPhone")}</Label>
              <Input
                id="booking-phone"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="07..."
              />
            </div>
            <div className="space-y-2">
              <Label>{t("bookingService")}</Label>
              <Select value={form.serviceId} onValueChange={(v) => setForm((f) => ({ ...f, serviceId: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder={t("selectService")} />
                </SelectTrigger>
                <SelectContent>
                  {services.map((service) => (
                    <SelectItem key={getId(service)} value={getId(service)}>
                      {service.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("bookingWorker")}</Label>
              <Select value={form.workerId} onValueChange={(v) => setForm((f) => ({ ...f, workerId: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder={t("selectWorker")} />
                </SelectTrigger>
                <SelectContent>
                  {workers.map((worker) => (
                    <SelectItem key={getId(worker)} value={getId(worker)}>
                      {worker.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="booking-date">{t("bookingDate")}</Label>
                <Input
                  id="booking-date"
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="booking-time">{t("bookingTime")}</Label>
                <Input
                  id="booking-time"
                  type="time"
                  value={form.time}
                  onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t("bookingDuration")}</Label>
              <Select
                value={form.durationMinutes}
                onValueChange={(v) => setForm((f) => ({ ...f, durationMinutes: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["15", "30", "45", "60", "90", "120"].map((mins) => (
                    <SelectItem key={mins} value={mins}>
                      {mins} min
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="booking-notes">{t("bookingNotes")}</Label>
              <Textarea
                id="booking-notes"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t("cancel")}
            </Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
