import { useMemo, useState, useCallback } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useApi } from "@/hooks/useApi";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";
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
import { Loader2, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsDesktopLg } from "@/hooks/use-mobile";
import { DesktopDataTable } from "@/components/ui/mobile-list-card";
import { SpreadsheetEditor } from "@/components/ui/spreadsheet-editor";
import {
  buildSpreadsheetRows,
  ensureTrailingEmptyRows,
  isSpreadsheetRowEmpty,
  type SpreadsheetRow,
} from "@/lib/spreadsheet";
import { useSpreadsheetAutoSave } from "@/hooks/useSpreadsheetAutoSave";
import { useSpreadsheetInit } from "@/hooks/useSpreadsheetInit";
import { useAddSheetRow } from "@/hooks/useAddSheetRow";
import { AddEntryButton } from "@/components/ui/add-entry-button";

const BOOKING_SHEET_KEYS = ["clientName", "phone", "serviceId", "workerId", "date", "time", "durationMinutes", "notes"] as const;

type BookingStatus =
  | "pending"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "no_show";

type Booking = {
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
};

type Product = {
  id?: number;
  _id?: string;
  name: string;
  category?: string;
};

type Client = {
  id?: number;
  _id?: string;
  name: string;
  clientType?: "debtor" | "worker" | "other";
  workerStatus?: "active" | "inactive";
};

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

function formatStatusLabel(t: (k: any) => string, status: BookingStatus) {
  switch (status) {
    case "pending":
      return t("bookingStatusPending");
    case "confirmed":
      return t("bookingStatusConfirmed");
    case "in_progress":
      return t("bookingStatusInProgress");
    case "completed":
      return t("bookingStatusCompleted");
    case "cancelled":
      return t("bookingStatusCancelled");
    case "no_show":
      return t("bookingStatusNoShow");
  }
}

function statusStyles(status: BookingStatus) {
  switch (status) {
    case "pending":
      return "bg-amber-100 text-amber-800";
    case "confirmed":
      return "bg-blue-100 text-blue-800";
    case "in_progress":
      return "bg-violet-100 text-violet-800";
    case "completed":
      return "bg-green-100 text-green-800";
    case "cancelled":
      return "bg-gray-100 text-gray-700";
    case "no_show":
      return "bg-red-100 text-red-800";
  }
}

function formatBookingTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function renderBookingActions(
  booking: Booking,
  t: (k: any) => string,
  onStatus: (b: Booking, status: BookingStatus) => void,
  onDelete: (b: Booking) => void,
) {
  const isFinished =
    booking.status === "completed" || booking.status === "cancelled" || booking.status === "no_show";

  return (
    <div className="flex flex-wrap items-center justify-end gap-1">
      {!isFinished ? (
        <>
          <Button
            size="sm"
            className="h-7 px-2 text-xs bg-green-600 hover:bg-green-700 text-white"
            onClick={() => onStatus(booking, "completed")}
          >
            {t("bookingConfirm")}
          </Button>
          {booking.status === "pending" ? (
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => onStatus(booking, "cancelled")}>
              {t("bookingCancel")}
            </Button>
          ) : null}
        </>
      ) : null}
      <Button
        size="sm"
        variant="ghost"
        className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
        onClick={() => onDelete(booking)}
        title={t("delete")}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

export default function Bookings() {
  const { t } = useTranslation();
  const { toast } = useToast();

  const today = useMemo(() => toDateInputValue(new Date()), []);
  const [date, setDate] = useState(today);
  const [statusFilter, setStatusFilter] = useState<BookingStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const showInlineTable = useIsDesktopLg();
  const [sheetRows, setSheetRows] = useState<SpreadsheetRow[]>([]);
  const { focusRowId, addRow, clearFocus } = useAddSheetRow(
    setSheetRows,
    BOOKING_SHEET_KEYS,
    (row) => ({ ...row, date }),
  );
  const [form, setForm] = useState({
    clientName: "",
    phone: "",
    serviceId: "",
    workerId: "",
    date: today,
    time: "10:00",
    durationMinutes: "30",
    notes: "",
  });

  const { items: products } = useApi<Product>({ endpoint: "products", defaultValue: [] });
  const { items: clients } = useApi<Client>({ endpoint: "clients", defaultValue: [] });

  const {
    items: bookings,
    isLoading,
    add: addBooking,
    update: updateBooking,
    remove: removeBooking,
  } = useApi<Booking>({
    endpoint: "bookings",
    defaultValue: [],
    onError: (error) => {
      console.error("Bookings error:", error);
      toast({ title: t("error"), description: t("bookingFailed"), variant: "destructive" });
    },
  });

  const services = useMemo(() => products.filter(isService), [products]);
  const workers = useMemo(
    () => clients.filter((c) => c.clientType === "worker" && c.workerStatus !== "inactive"),
    [clients],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return bookings
      .filter((b) => {
        const day = String(b.startAt || "").slice(0, 10);
        if (day !== date) return false;
        if (statusFilter !== "all" && b.status !== statusFilter) return false;
        if (!q) return true;
        const hay = `${b.clientName} ${b.phone || ""} ${b.serviceName} ${b.workerName || ""}`.toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  }, [bookings, date, statusFilter, search]);

  const dayBookings = useMemo(
    () => bookings.filter((b) => String(b.startAt || "").slice(0, 10) === date),
    [bookings, date],
  );

  const serviceOptions = useMemo(
    () => services.map((s) => ({ value: getId(s), label: s.name })),
    [services],
  );
  const workerOptions = useMemo(
    () => workers.map((w) => ({ value: getId(w), label: w.name })),
    [workers],
  );

  const bookingSheetColumns = useMemo(
    () => [
      { key: "clientName", label: t("bookingClientName"), type: "text" as const, required: true, width: "14%" },
      { key: "phone", label: t("bookingPhone"), type: "text" as const, width: "11%" },
      {
        key: "serviceId",
        label: t("bookingService"),
        type: "select" as const,
        required: true,
        width: "14%",
        options: serviceOptions,
      },
      {
        key: "workerId",
        label: t("bookingWorker"),
        type: "select" as const,
        width: "12%",
        options: workerOptions,
        placeholder: "—",
      },
      { key: "date", label: t("bookingDate"), type: "date" as const, required: true, width: "11%" },
      { key: "time", label: t("bookingTime"), type: "text" as const, required: true, width: "8%" },
      { key: "durationMinutes", label: t("bookingDuration"), type: "number" as const, width: "8%" },
      { key: "notes", label: t("bookingNotes"), type: "text" as const, width: "14%" },
    ],
    [t, serviceOptions, workerOptions],
  );

  const initBookingSheet = useCallback(() => {
    const ordered = [...dayBookings].sort(
      (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
    );
    setSheetRows(
      buildSpreadsheetRows(
        ordered,
        (b) => getId(b),
        (b) => {
          const start = new Date(b.startAt);
          const time =
            Number.isNaN(start.getTime())
              ? "10:00"
              : `${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}`;
          return {
            clientName: b.clientName || "",
            phone: b.phone || "",
            serviceId: b.serviceId ? String(b.serviceId) : "",
            workerId: b.workerId ? String(b.workerId) : "",
            date: String(b.startAt || "").slice(0, 10) || date,
            time,
            durationMinutes: String(b.durationMinutes ?? 30),
            notes: b.notes || "",
          };
        },
        [...BOOKING_SHEET_KEYS],
        1,
      ),
    );
  }, [dayBookings, date]);

  useSpreadsheetInit(showInlineTable, isLoading, initBookingSheet, date);

  const visibleSheetRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sheetRows.filter((row) => {
      if (isSpreadsheetRowEmpty(row, [...BOOKING_SHEET_KEYS])) return true;
      const booking = row._entityId ? bookings.find((b) => getId(b) === row._entityId) : undefined;
      if (statusFilter !== "all" && booking && booking.status !== statusFilter) return false;
      if (!q) return true;
      const service = services.find((s) => getId(s) === row.serviceId);
      const worker = workers.find((w) => getId(w) === row.workerId);
      const hay = `${row.clientName} ${row.phone || ""} ${service?.name || booking?.serviceName || ""} ${worker?.name || booking?.workerName || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [sheetRows, search, statusFilter, bookings, services, workers]);

  const bookingToPayload = useCallback(
    (row: SpreadsheetRow, existing?: Booking) => {
      if (!String(row.clientName ?? "").trim() || !String(row.serviceId ?? "").trim()) return null;
      const rowDate = String(row.date || date);
      const rowTime = String(row.time || "10:00");
      const startAt = new Date(`${rowDate}T${rowTime}`);
      if (Number.isNaN(startAt.getTime())) return null;
      const service = services.find((s) => getId(s) === row.serviceId);
      const worker = workers.find((w) => getId(w) === row.workerId);
      return {
        ...(existing || {}),
        clientName: String(row.clientName).trim(),
        phone: String(row.phone ?? "").trim(),
        serviceId: String(row.serviceId),
        serviceName: service?.name || existing?.serviceName || "",
        workerId: row.workerId ? String(row.workerId) : undefined,
        workerName: worker?.name || existing?.workerName || "",
        startAt: startAt.toISOString(),
        durationMinutes: Number(row.durationMinutes) || 30,
        notes: String(row.notes ?? "").trim(),
        status: existing?.status || "pending",
      } as Booking;
    },
    [date, services, workers],
  );

  const { rowStatus, onRowsChange, onRowBlur, saveRowNow } = useSpreadsheetAutoSave<Booking>({
    sheetRows,
    setSheetRows,
    columnKeys: [...BOOKING_SHEET_KEYS],
    requiredFields: ["clientName", "serviceId", "date", "time"],
    findExisting: (id) => bookings.find((b) => getId(b) === id),
    toPayload: bookingToPayload,
    add: (payload) => addBooking(payload as Booking),
    update: (payload) => updateBooking(payload as Booking),
    debounceMs: 400,
  });

  const resetForm = () => {
    setForm({
      clientName: "",
      phone: "",
      serviceId: "",
      workerId: "",
      date: today,
      time: "10:00",
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

    const startAt = new Date(`${form.date}T${form.time}`);
    if (Number.isNaN(startAt.getTime())) {
      toast({ title: t("error"), description: t("bookingTime"), variant: "destructive" });
      return;
    }

    const service = services.find((s) => getId(s) === form.serviceId);
    const worker = workers.find((w) => getId(w) === form.workerId);

    setSaving(true);
    try {
      await addBooking({
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
      } as any);
      toast({ title: t("success"), description: t("bookingCreated") });
      setDialogOpen(false);
      resetForm();
      setDate(form.date);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t("bookingFailed");
      toast({ title: t("error"), description: message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const quickStatus = async (booking: Booking, status: BookingStatus) => {
    const id = booking._id || booking.id;
    if (!id) return;
    try {
      await updateBooking({ ...booking, status } as any);
      toast({ title: t("success"), description: t("bookingUpdated") });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t("bookingFailed");
      toast({ title: t("error"), description: message, variant: "destructive" });
    }
  };

  const handleDelete = async (booking: Booking) => {
    const id = booking._id || booking.id;
    if (!id) return;
    if (!window.confirm(`${t("delete")} "${booking.clientName}"?`)) return;
    await removeBooking(id);
    setSheetRows((prev) =>
      ensureTrailingEmptyRows(
        prev.filter((r) => r._entityId !== getId(booking)),
        [...BOOKING_SHEET_KEYS],
      ),
    );
    toast({ title: t("success"), description: t("deleted") });
  };

  return (
    <AppLayout title={t("bookings")}>
      <div className="lg:bg-white lg:rounded-lg lg:overflow-hidden">
        <div className="lg:px-4 lg:py-4 flex-shrink-0 mb-4 lg:mb-0">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-end gap-3 flex-wrap">
              <div className="space-y-1">
                <Label>{t("bookingDate")}</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-[170px]" />
              </div>
              <div className="space-y-1">
                <Label>{t("status")}</Label>
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("all")}</SelectItem>
                    <SelectItem value="pending">{t("bookingStatusPending")}</SelectItem>
                    <SelectItem value="confirmed">{t("bookingStatusConfirmed")}</SelectItem>
                    <SelectItem value="in_progress">{t("bookingStatusInProgress")}</SelectItem>
                    <SelectItem value="completed">{t("bookingStatusCompleted")}</SelectItem>
                    <SelectItem value="cancelled">{t("bookingStatusCancelled")}</SelectItem>
                    <SelectItem value="no_show">{t("bookingStatusNoShow")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>{t("search")}</Label>
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("search")} className="w-[220px]" />
              </div>
            </div>

            <div className="flex gap-2 shrink-0">
              <Button className="gap-2 shrink-0 lg:hidden" onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4" />
                {t("addBooking")}
              </Button>
              {showInlineTable ? (
                <AddEntryButton
                  label={t("addBooking")}
                  onClick={() => {
                    setStatusFilter("all");
                    setSearch("");
                    addRow();
                  }}
                  className="hidden lg:flex"
                />
              ) : null}
            </div>
          </div>
        </div>

        {showInlineTable && isLoading ? (
          <DesktopDataTable breakpoint="lg">
            <table className="w-full border-collapse min-w-[900px]">
              <thead className="bg-gray-100 border-b border-gray-200">
                <tr>
                  {Array.from({ length: 8 }).map((_, i) => (
                    <th key={i} className="text-left py-4 px-4">
                      <Skeleton className="h-4 w-20" />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white">
                {Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-200">
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="py-4 px-4">
                        <Skeleton className="h-4 w-24" />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </DesktopDataTable>
        ) : showInlineTable ? (
          <div className="hidden lg:block lg:px-4 lg:pb-4">
            <SpreadsheetEditor
              variant="table"
              minWidth="min-w-[900px]"
              columns={bookingSheetColumns}
              rows={visibleSheetRows}
              onRowsChange={onRowsChange}
              onRowBlur={(rowId) => onRowBlur(rowId, sheetRows)}
              onAddRow={addRow}
              autoSave
              rowStatus={rowStatus}
              addRowLabel={t("addRow")}
              focusRowId={focusRowId}
              onFocusRowHandled={clearFocus}
              hideAddButton
              onRowSave={(rowId) => saveRowNow(rowId, sheetRows)}
              saveRowLabel={t("save")}
              renderRowActions={(row) => {
                if (!row._entityId) return null;
                const booking = bookings.find((b) => getId(b) === row._entityId);
                if (!booking) return null;
                return (
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
                        statusStyles(booking.status),
                      )}
                    >
                      {formatStatusLabel(t, booking.status)}
                    </span>
                    {renderBookingActions(booking, t, quickStatus, handleDelete)}
                  </div>
                );
              }}
            />
          </div>
        ) : null}

        {!showInlineTable && isLoading ? (
            <DesktopDataTable breakpoint="lg">
              <table className="w-full border-collapse min-w-[900px]">
                <thead className="bg-gray-100 border-b border-gray-200">
                  <tr>
                    {Array.from({ length: 8 }).map((_, i) => (
                      <th key={i} className="text-left py-4 px-4">
                        <Skeleton className="h-4 w-20" />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-gray-200">
                      {Array.from({ length: 8 }).map((_, j) => (
                        <td key={j} className="py-4 px-4">
                          <Skeleton className="h-4 w-24" />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </DesktopDataTable>
          ) : !showInlineTable && filtered.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">{t("noBookingsToday")}</div>
          ) : !showInlineTable ? (
            <div className="lg:hidden overflow-x-auto">
                <table className="w-full border-collapse min-w-[720px]">
                    <thead className="bg-gray-100 border-b border-gray-200">
                      <tr>
                        <th className="text-left text-xs font-semibold text-gray-700 py-3 px-3">{t("bookingTime")}</th>
                        <th className="text-left text-xs font-semibold text-gray-700 py-3 px-3">{t("name")}</th>
                        <th className="text-left text-xs font-semibold text-gray-700 py-3 px-3">{t("bookingService")}</th>
                        <th className="text-left text-xs font-semibold text-gray-700 py-3 px-3">{t("status")}</th>
                        <th className="text-right text-xs font-semibold text-gray-700 py-3 px-3">{t("actions")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((b, index) => (
                        <tr
                          key={getId(b)}
                          className={cn(
                            "border-b border-gray-200",
                            index % 2 === 0 ? "bg-white" : "bg-gray-50",
                          )}
                        >
                          <td className="py-3 px-3 text-xs font-medium text-gray-900 tabular-nums whitespace-nowrap">
                            {formatBookingTime(b.startAt)}
                          </td>
                          <td className="py-3 px-3">
                            <p className="text-xs font-medium text-gray-900">{b.clientName}</p>
                            <p className="text-[10px] text-gray-500">{b.workerName || b.phone || "—"}</p>
                          </td>
                          <td className="py-3 px-3 text-xs text-gray-700">{b.serviceName}</td>
                          <td className="py-3 px-3">
                            <span
                              className={cn(
                                "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap",
                                statusStyles(b.status),
                              )}
                            >
                              {formatStatusLabel(t, b.status)}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            {renderBookingActions(b, t, quickStatus, handleDelete)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                </table>
              </div>
          ) : null}
      </div>

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
              <Select value={form.durationMinutes} onValueChange={(v) => setForm((f) => ({ ...f, durationMinutes: v }))}>
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
    </AppLayout>
  );
}

