import { useState, useEffect, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Search, Pencil, Trash2, X, User, Mail, Phone, Building, Calendar, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useApi } from "@/hooks/useApi";
import { playUpdateBeep, playDeleteBeep, playErrorBeep } from "@/lib/sound";
import { clientApi } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "@/hooks/useTranslation";
import { Textarea } from "@/components/ui/textarea";

interface Client {
  id?: number;
  _id?: string;
  name: string;
  email?: string;
  phone?: string;
  businessType?: string;
  clientType?: 'debtor' | 'worker' | 'other';
  notes?: string;
}

interface ClientFormData {
  name: string;
  email: string;
  phone: string;
  businessType: string;
  clientType: 'debtor' | 'worker' | 'other';
  notes: string;
}

interface Schedule {
  id?: number;
  _id?: string;
  title: string;
  description?: string;
  clientId?: string | Client;
  dueDate: string | Date;
  frequency: 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  amount?: number;
  status: 'pending' | 'completed' | 'cancelled';
  notifyUser: boolean;
  notifyClient: boolean;
}

const Clients = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    items: clients,
    isLoading,
    add: addClient,
    update: updateClient,
    remove: removeClient,
    refresh: refreshClients,
  } = useApi<Client>({
    endpoint: "clients",
    defaultValue: [],
    onError: (error: any) => {
      // Don't show errors for connection issues (offline mode)
      if (error?.response?.silent || error?.response?.connectionError) {
        console.log("Offline mode: using local data");
        return;
      }
      console.error("Error with clients:", error);
      toast({
        title: t("error"),
        description: t("failedLoadClients"),
        variant: "destructive",
      });
    },
  });

  const {
    items: schedules,
    isLoading: schedulesLoading,
    refresh: refreshSchedules,
  } = useApi<Schedule>({
    endpoint: "schedules",
    defaultValue: [],
    onError: (error) => {
      console.error("Error with schedules:", error);
    },
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState<ClientFormData>({
    name: "",
    email: "",
    phone: "",
    businessType: "",
    clientType: "other",
    notes: "",
  });
  const [newlyCreatedClientId, setNewlyCreatedClientId] = useState<string | null>(null);
  const [showAddScheduleDialog, setShowAddScheduleDialog] = useState(false);
  const [expandedClientId, setExpandedClientId] = useState<string | null>(null);
  const [quickCreateMode, setQuickCreateMode] = useState<"client" | "worker" | null>(null);

  const getClientScheduleList = (clientId: string) => {
    return schedules
      .filter((s) => {
        const sid = (s as any).clientId;
        const linkedId = typeof sid === "object" ? (sid?._id || sid?.id) : sid;
        return linkedId?.toString() === clientId;
      })
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  };

  const getStatusBadge = (status: Schedule["status"]) => {
    switch (status) {
      case "completed":
        return "bg-gray-100 text-gray-700 border border-gray-300";
      case "cancelled":
        return "bg-gray-100 text-gray-700 border border-gray-300";
      default:
        return "bg-blue-100 text-blue-700 border border-blue-200";
    }
  };

  const isOverdue = (dueDate: string | Date) => {
    const due = new Date(dueDate);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    return due < now;
  };

  const filteredClients = useMemo(() => {
    let filtered = clients;
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          c.email?.toLowerCase().includes(query) ||
          c.phone?.includes(query) ||
          c.businessType?.toLowerCase().includes(query)
      );
    }
    
    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [clients, searchQuery]);

  const openAddModal = (preferredType: 'debtor' | 'worker' | 'other' = "other") => {
    setEditingClient(null);
    setNewlyCreatedClientId(null);
    setFormData({
      name: "",
      email: "",
      phone: "",
      businessType: "",
      clientType: preferredType,
      notes: "",
    });
    setIsModalOpen(true);
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const create = params.get("create");
    if (create === "client") {
      setQuickCreateMode("client");
      openAddModal("other");
    } else if (create === "worker") {
      setQuickCreateMode("worker");
      openAddModal("worker");
    } else {
      setQuickCreateMode(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  const openEditModal = (client: Client) => {
    setEditingClient(client);
    setNewlyCreatedClientId(null);
    setFormData({
      name: client.name,
      email: client.email || "",
      phone: client.phone || "",
      businessType: client.businessType || "",
      clientType: client.clientType || "other",
      notes: client.notes || "",
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({
        title: t("validationErrorTitle"),
        description: t("clientNameRequired"),
        variant: "destructive",
      });
      return;
    }

    if (!formData.email.trim()) {
      toast({
        title: t("validationErrorTitle"),
        description: t("clientEmailRequired"),
        variant: "destructive",
      });
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      toast({
        title: t("validationErrorTitle"),
        description: t("validEmailRequired"),
        variant: "destructive",
      });
      return;
    }

    if (!formData.businessType.trim()) {
      toast({
        title: t("validationErrorTitle"),
        description: t("businessTypeRequired"),
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingClient) {
        const updatedClient: Client = {
          ...editingClient,
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim() || undefined,
          businessType: formData.businessType.trim(),
          clientType: formData.clientType,
          notes: formData.notes.trim() || undefined,
        };
        await updateClient(updatedClient);
        await refreshClients();
        playUpdateBeep();
        toast({
          title: t("clientUpdatedSuccess"),
          description: t("clientUpdatedDesc"),
        });
        setIsModalOpen(false);
        setEditingClient(null);
      } else {
        const newClient: Client = {
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim() || undefined,
          businessType: formData.businessType.trim(),
          clientType: formData.clientType,
          notes: formData.notes.trim() || undefined,
        };
        
        // Use clientApi directly to get the created client response
        const response = await clientApi.create(newClient);
        await refreshClients();
        playUpdateBeep();
        
        // Get the created client ID from response
        const createdClientId = response.data?._id || response.data?.id;
        if (createdClientId) {
          setNewlyCreatedClientId(createdClientId.toString());
          setIsModalOpen(false);
          setShowAddScheduleDialog(true);
        } else {
          toast({
            title: t("clientAddedSuccess"),
            description: t("clientAddedDesc"),
          });
          setIsModalOpen(false);
        }
      }
    } catch (error) {
      playErrorBeep();
      toast({
        title: editingClient ? t("updateClientFailedTitle") : t("addClientFailed"),
        description: editingClient ? t("updateClientFailed") : t("addClientFailed"),
        variant: "destructive",
      });
    }
  };

  const handleDeleteClick = (client: Client) => {
    setClientToDelete(client);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!clientToDelete) return;
    
    try {
      await removeClient(clientToDelete);
      await refreshClients();
      playDeleteBeep();
      toast({
        title: t("clientDeletedSuccess"),
        description: t("clientDeletedDesc"),
      });
      setDeleteDialogOpen(false);
      setClientToDelete(null);
    } catch (error) {
      playErrorBeep();
      toast({
        title: t("deleteClientFailed"),
        description: t("deleteClientFailed"),
        variant: "destructive",
      });
    }
  };

  // Clients Page Skeleton
  const ClientsSkeleton = () => (
    <AppLayout title={t("clientsPageTitle")}>
      <div className="flex flex-col h-[calc(100vh-3rem)]">
        <div className="bg-white shadow-sm flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-200 px-4 py-4 flex-shrink-0 shadow-sm">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-10 w-32" />
              </div>
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
          <div className="overflow-auto flex-1">
            <div className="p-4 space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );

  if (isLoading) {
    return <ClientsSkeleton />;
  }

  return (
    <AppLayout title={t("clientsPageTitle")}>
      <div className="flex flex-col h-[calc(100vh-3rem)]">
        <div className="lg:bg-white bg-white/80 backdrop-blur-sm flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Filter Section */}
          <div className="lg:bg-white bg-white/80 backdrop-blur-sm border-b border-gray-200 px-4 py-4 flex-shrink-0">
            <div className="flex flex-col gap-4">
              {quickCreateMode && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
                  {quickCreateMode === "worker"
                    ? t("quickCreateWorkerHint")
                    : t("quickCreateClientHint")}
                </div>
              )}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-gray-800">{t("manageClients")}</h3>
                <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                  <Button
                    onClick={() => navigate("/schedules")}
                    variant="outline"
                    className="border-gray-300 text-gray-700 hover:bg-gray-50 shadow-sm hover:shadow transition-all font-medium px-4 py-2 gap-2 flex items-center"
                  >
                    <Calendar size={18} />
                    <span className="hidden sm:inline">{t("goToSchedules")}</span>
                    <span className="sm:hidden">{t("schedulesLinkedLabel")}</span>
                  </Button>
                </div>
              </div>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10" />
                <Input
                  placeholder={t("searchClientsPlaceholder")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 lg:bg-white bg-white/80 backdrop-blur-sm border border-gray-300 text-gray-900 placeholder:text-gray-500 focus:border-gray-500 rounded-lg"
                />
              </div>
              <div className="text-xs text-gray-500">
                {t("showingClientsCount")
                  .replace("{filtered}", String(filteredClients.length))
                  .replace("{total}", String(clients.length))}
              </div>
            </div>
          </div>

          {/* Clients List */}
          <div className="overflow-auto flex-1">
            <div className="p-4">
              {filteredClients.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredClients.map((client) => {
                    const clientId = (client as any)._id || client.id;
                    const clientIdStr = clientId?.toString();
                    const linkedSchedules = clientIdStr ? getClientScheduleList(clientIdStr) : [];
                    const activeCount = linkedSchedules.filter((s) => s.status === "pending").length;
                    const previewSchedules = linkedSchedules.slice(0, expandedClientId === clientIdStr ? 10 : 3);
                    return (
                      <div
                        key={clientId}
                        className="lg:bg-white bg-white/80 backdrop-blur-sm border border-gray-300 rounded p-4 transition-colors hover:border-gray-400"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1 min-w-0">
                            <h4 className="text-base font-semibold text-gray-900 mb-2 flex items-center gap-2">
                              <User size={18} className="text-gray-600" />
                              {client.name}
                            </h4>
                            <div className="flex items-center gap-2 mb-2">
                              <Building size={14} className="text-gray-500" />
                              <span className="text-sm font-medium text-gray-700">{client.businessType}</span>
                            </div>
                            {client.clientType && (
                              <div className="mb-2">
                                <span className={cn(
                                  "px-2 py-0.5 text-xs font-semibold rounded",
                                  client.clientType === "debtor" && "bg-orange-100 text-orange-700 border border-orange-200",
                                  client.clientType === "worker" && "bg-blue-100 text-blue-700 border border-blue-200",
                                  client.clientType === "other" && "bg-gray-100 text-gray-700 border border-gray-200"
                                )}>
                                  {client.clientType === "debtor" && t("clientTypeDebtor")}
                                  {client.clientType === "worker" && t("clientTypeWorker")}
                                  {client.clientType === "other" && t("clientTypeOther")}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="flex gap-1 ml-2 shrink-0">
                            <button
                              onClick={() => {
                                const cid = (client._id || client.id)?.toString();
                                navigate(`/schedules?clientId=${cid}`);
                              }}
                              className="p-2 text-green-600 hover:bg-green-50 hover:text-green-700 transition-all rounded-lg"
                              title={t("addScheduleForClient")}
                            >
                              <Calendar size={16} />
                            </button>
                            <button
                              onClick={() => openEditModal(client)}
                              className="p-2 text-blue-600 hover:bg-blue-50 hover:text-blue-700 transition-all rounded-lg"
                              title={t("editClientTooltip")}
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteClick(client)}
                              className="p-2 text-red-600 hover:bg-red-50 hover:text-red-700 transition-all rounded-lg"
                              title={t("deleteClientTooltip")}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                        <div className="space-y-2 text-sm">
                          {client.email && (
                            <div className="flex items-center gap-2 text-gray-700">
                              <Mail size={14} className="text-gray-400" />
                              <a href={`mailto:${client.email}`} className="hover:text-blue-600">
                                {client.email}
                              </a>
                            </div>
                          )}
                          {client.phone && (
                            <div className="flex items-center gap-2 text-gray-700">
                              <Phone size={14} className="text-gray-400" />
                              <a href={`tel:${client.phone}`} className="hover:text-blue-600">
                                {client.phone}
                              </a>
                            </div>
                          )}
                          {client.notes && (
                            <div className="text-xs text-gray-600 mt-2 pt-2 border-t border-gray-100">
                              {client.notes}
                            </div>
                          )}

                          {/* Linked Schedules */}
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <div className="text-xs font-semibold text-gray-900 flex items-center gap-2">
                                <Calendar size={14} className="text-gray-500" />
                                {t("schedulesLinkedLabel")}
                                <span className="text-gray-600 font-medium">
                                  {t("schedulesCountLabel")
                                    .replace("{total}", String(linkedSchedules.length))
                                    .replace("{active}", String(activeCount))}
                                </span>
                              </div>
                              {linkedSchedules.length > 0 && (
                                <button
                                  type="button"
                                  className="text-xs font-medium text-gray-700 hover:text-gray-900 underline underline-offset-2"
                                  onClick={() => navigate(`/schedules?clientId=${clientIdStr}`)}
                                >
                                  {t("viewAll")}
                                </button>
                              )}
                            </div>

                            {schedulesLoading ? (
                              <div className="text-xs text-gray-500">{t("loadingSchedules")}</div>
                            ) : linkedSchedules.length === 0 ? (
                              <div className="text-xs text-gray-500">
                                {t("noSchedulesForClient")}
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {previewSchedules.map((s) => {
                                  const sid = (s as any)._id || s.id;
                                  const overdue = s.status === "pending" && isOverdue(s.dueDate);
                                  return (
                                    <div
                                      key={sid}
                                      className={cn(
                                        "p-2 rounded border text-xs",
                                        overdue ? "border-red-300 bg-red-50" : "border-gray-200 bg-white"
                                      )}
                                    >
                                      <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                          <div className="font-medium text-gray-900 truncate">
                                            {s.title}
                                          </div>
                                          <div className="flex items-center gap-2 text-gray-600 mt-0.5">
                                            <span className="flex items-center gap-1">
                                              <Clock size={12} className="text-gray-400" />
                                              {new Date(s.dueDate).toLocaleDateString()}
                                            </span>
                                            {s.amount ? (
                                              <span className="text-gray-900 font-medium">
                                                {s.amount.toLocaleString()} RWF
                                              </span>
                                            ) : null}
                                          </div>
                                        </div>
                                        <span className={cn("px-2 py-0.5 rounded border text-[11px] font-semibold", getStatusBadge(s.status))}>
                                          {overdue ? t("statusOverdue") : s.status === "pending" ? t("statusActive") : s.status === "completed" ? t("statusCompleted") : t("statusCancelled")}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}

                                {linkedSchedules.length > 3 && (
                                  <button
                                    type="button"
                                    className="text-xs font-medium text-gray-700 hover:text-gray-900 underline underline-offset-2"
                                    onClick={() =>
                                      setExpandedClientId(expandedClientId === clientIdStr ? null : clientIdStr)
                                    }
                                  >
                                    {expandedClientId === clientIdStr
                                      ? t("showLess")
                                      : t("showMoreSchedules").replace("{count}", String(Math.min(7, linkedSchedules.length - 3)))}
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <User size={48} className="mx-auto mb-4 text-gray-400 opacity-50" />
                  <p className="text-base font-medium text-gray-400">
                    {searchQuery ? t("noClientsSearch") : t("noClientsYet")}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {searchQuery ? t("tryAdjustSearch") : t("addFirstClient")}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-card max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingClient
                ? t("editClientModal")
                : formData.clientType === "worker"
                  ? t("addNewWorkerModal")
                  : t("addNewClientModal")}
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>{t("clientNameLabel")} *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t("enterClientName")}
                className="input-field"
              />
            </div>

            <div className="space-y-2">
              <Label>{t("clientTypeRelationship")} *</Label>
              <Select value={formData.clientType} onValueChange={(value: 'debtor' | 'worker' | 'other') => setFormData({ ...formData, clientType: value })}>
                <SelectTrigger className="input-field">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="debtor">{t("clientTypeDebtorOption")}</SelectItem>
                  <SelectItem value="worker">{t("clientTypeWorkerOption")}</SelectItem>
                  <SelectItem value="other">{t("clientTypeOtherOption")}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">{t("clientTypeSelectHint")}</p>
            </div>

            <div className="space-y-2">
              <Label>{t("businessTypeWhatTheyDo")} *</Label>
              <Input
                value={formData.businessType}
                onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
                placeholder={
                  formData.clientType === "worker"
                    ? t("businessTypeWorkerPh")
                    : t("businessTypeClientPh")
                }
                className="input-field"
                required
              />
              <p className="text-xs text-gray-500">{t("businessTypeDescribeHint")}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("emailAddress")} *</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="client@example.com"
                  className="input-field"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>{t("phoneNumber")}</Label>
                <Input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+250 791 998 365"
                  className="input-field"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t("note")}</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder={t("notesAboutClient")}
                className="input-field"
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsModalOpen(false);
              setEditingClient(null);
            }}>
              {t("cancel")}
            </Button>
            <Button onClick={handleSave} className="bg-green-600 text-white hover:bg-green-700">
              {editingClient ? t("updateClientBtn") : t("addClientBtn")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Schedule Dialog (after creating client) */}
      <AlertDialog open={showAddScheduleDialog} onOpenChange={setShowAddScheduleDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Calendar size={20} className="text-green-600" />
              {t("clientCreatedSuccess")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("clientCreatedSchedulePrompt")} <strong>{formData.name}</strong>?
              <br /><br />
              {t("clientCreatedScheduleHint")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowAddScheduleDialog(false);
              setNewlyCreatedClientId(null);
              toast({
                title: t("clientAddedSuccess"),
                description: t("clientAddedDesc"),
              });
            }}>
              {t("notNow")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowAddScheduleDialog(false);
                const clientId = newlyCreatedClientId;
                setNewlyCreatedClientId(null);
                navigate(`/schedules?clientId=${clientId}&create=true`);
              }}
              className="bg-green-600 text-white hover:bg-green-700"
            >
              {t("addScheduleBtn")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 size={20} className="text-red-600" />
              {t("deleteClientModal")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteClientConfirmFull").replace("{name}", clientToDelete?.name ?? "")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setClientToDelete(null)}>
              {t("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {t("deleteClientModal")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
};

export default Clients;
