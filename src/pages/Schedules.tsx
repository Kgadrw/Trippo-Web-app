import { useState, useEffect, useMemo, useCallback } from "react";
import { filterByPageSearch } from "@/lib/pageSearch";
import { usePageSearch } from "@/hooks/usePageSearch";
import { useSearchParams } from "react-router-dom";
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
import { HelpTip } from "@/components/ui/help-tip";
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Calendar as CalendarIcon, 
  CheckCircle2, 
  Mail,
  Bell,
  User,
  Repeat,
  AlertCircle,
  Filter,
  X,
  UserPlus,
  ChevronDown,
  ChevronRight,
  ChevronLeft
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CurrencyAmount } from "@/lib/currency";
import {
  mobileFilterPanelClass,
  mobileFilterToggleActiveClass,
  mobileFilterToggleClass,
} from "@/lib/fieldStyles";
import { useToast } from "@/hooks/use-toast";
import { useApi } from "@/hooks/useApi";
import { playUpdateBeep, playDeleteBeep, playErrorBeep } from "@/lib/sound";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "@/hooks/useTranslation";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  filterSelectClass,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { scheduleApi, clientApi } from "@/lib/api";
import { FINANCE_TD_CLASS, FINANCE_TH_CLASS } from "@/components/finance/financeTable";
import {
  AUTOMATION_TYPE_LABEL_KEYS,
  AUTOMATION_TYPE_TITLE_PH_KEYS,
  AUTOMATION_TYPE_VALUES,
  AutomationType,
  normalizeAutomationType,
} from "@/lib/automationTypes";

interface Client {
  id?: number;
  _id?: string;
  name: string;
  email?: string;
  phone?: string;
  businessType?: string;
  clientType?: "debtor" | "worker" | "other";
  notes?: string;
}

interface Schedule {
  id?: number;
  _id?: string;
  title: string;
  description?: string;
  clientId?: string | Client;
  dueDate: string | Date;
  frequency: 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  automationType?: AutomationType;
  amount?: number;
  status: 'pending' | 'completed' | 'cancelled';
  notifyUser: boolean;
  notifyClient: boolean;
  userNotificationMessage?: string;
  clientNotificationMessage?: string;
  advanceNotificationDays: number;
  repeatUntil?: string | Date;
}

interface ScheduleFormData {
  title: string;
  description: string;
  clientId: string;
  // Client information fields (for creating new client)
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  clientBusinessType: string;
  clientType: "debtor" | "worker" | "other";
  dueDate: string;
  frequency: 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  automationType: AutomationType;
  amount: string;
  notifyUser: boolean;
  notifyClient: boolean;
  userNotificationMessage: string;
  clientNotificationMessage: string;
  advanceNotificationDays: string;
  repeatUntil: string;
}

const Schedules = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    items: schedules,
    isLoading,
    add: addSchedule,
    update: updateSchedule,
    remove: removeSchedule,
    refresh: refreshSchedules,
  } = useApi<Schedule>({
    endpoint: "schedules",
    defaultValue: [],
    onError: (error: any) => {
      // Don't show errors for connection issues (offline mode)
      if (error?.response?.silent || error?.response?.connectionError) {
        console.log("Offline mode: using local data");
        return;
      }
      console.error("Error with schedules:", error);
      toast({
        title: t("error"),
        description: t("failedLoadSchedules"),
        variant: "destructive",
      });
    },
  });

  const [clients, setClients] = useState<Client[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [frequencyFilter, setFrequencyFilter] = useState<string>("all");
  const [automationTypeFilter, setAutomationTypeFilter] = useState<string>("all");
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [scheduleToDelete, setScheduleToDelete] = useState<Schedule | null>(null);
  const [scheduleToComplete, setScheduleToComplete] = useState<Schedule | null>(null);
  const [completionMessage, setCompletionMessage] = useState("");
  const [sendCompletionEmail, setSendCompletionEmail] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4; // Basic Info, Client Details, Frequency, Notifications
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isCreatingClient, setIsCreatingClient] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [clientForm, setClientForm] = useState<{
    name: string;
    email: string;
    phone: string;
    businessType: string;
    clientType: "debtor" | "worker" | "other";
    notes: string;
  }>({
    name: "",
    email: "",
    phone: "",
    businessType: "",
    clientType: "other",
    notes: "",
  });
  const [formData, setFormData] = useState<ScheduleFormData>({
    title: "",
    description: "",
    clientId: "",
    clientName: "",
    clientEmail: "",
    clientPhone: "",
    clientBusinessType: "",
    clientType: "other",
    dueDate: "",
    frequency: "once",
    automationType: "payment_reminder",
    amount: "",
    notifyUser: true,
    notifyClient: true,
    userNotificationMessage: "",
    clientNotificationMessage: "",
    advanceNotificationDays: "0",
    repeatUntil: "",
  });
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [deleteClientDialogOpen, setDeleteClientDialogOpen] = useState(false);

  // Load clients function
  const loadClients = useCallback(async () => {
      try {
      console.log("Loading clients from database...");
        const response = await clientApi.getAll();
      console.log("Clients API response:", response);
      
      if (response && response.data) {
        console.log(`Loaded ${response.data.length} clients from database`);
          setClients(response.data);
      } else {
        console.warn("No data in response:", response);
        setClients([]);
        }
    } catch (error: any) {
        console.error("Error loading clients:", error);
      toast({
        title: t("error"),
        description: error?.message || t("failedLoadClientsFromDb"),
        variant: "destructive",
      });
      setClients([]);
      }
  }, [toast]);

  // Load clients on mount
  useEffect(() => {
    loadClients();
  }, [loadClients]);

  // Get schedules for a specific client
  const getSchedulesForClient = useCallback((clientId: string) => {
    return schedules.filter((s) => {
      const sid = (s as any).clientId;
      const linkedId = typeof sid === "object" ? (sid?._id || sid?.id) : sid;
      return linkedId?.toString() === clientId;
    }).sort((a, b) => {
      const dateA = new Date(a.dueDate).getTime();
      const dateB = new Date(b.dueDate).getTime();
      return dateA - dateB;
    });
  }, [schedules]);

  // Toggle client expansion
  const toggleClientExpansion = (clientId: string) => {
    setExpandedClients((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(clientId)) {
        newSet.delete(clientId);
      } else {
        newSet.add(clientId);
      }
      return newSet;
    });
  };

  // Check URL params for clientId and auto-open create modal
  useEffect(() => {
    const clientId = searchParams.get("clientId");
    const create = searchParams.get("create");
    
    if (clientId && create === "true" && clients.length > 0) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const existingClient = clients.find((c: any) => ((c._id || c.id)?.toString()) === clientId);
      
      setFormData({
        title: "",
        description: "",
        clientId: clientId,
        clientName: existingClient?.name || "",
        clientEmail: existingClient?.email || "",
        clientPhone: existingClient?.phone || "",
        clientBusinessType: existingClient?.businessType || "",
        clientType: existingClient?.clientType || "other",
        // Format for datetime-local: YYYY-MM-DDTHH:mm (default to 9:00 AM)
        dueDate: (() => {
          const date = new Date(tomorrow);
          date.setHours(9, 0, 0, 0);
          return date.toISOString().slice(0, 16);
        })(),
        frequency: "once",
        amount: "",
        notifyUser: true,
        notifyClient: true,
        userNotificationMessage: "",
        clientNotificationMessage: "",
        advanceNotificationDays: "0",
        repeatUntil: "",
      });
      
      setIsModalOpen(true);
      setEditingSchedule(null);
      setSearchParams({});
    }
  }, [searchParams, clients, setSearchParams]);

  // If URL has clientId (without create=true), expand that client
  useEffect(() => {
    const clientId = searchParams.get("clientId");
    const create = searchParams.get("create");
    if (clientId && create !== "true") {
      setExpandedClients(new Set([clientId]));
    }
  }, [searchParams]);

  const filteredClients = useMemo(() => {
    let filtered = clients;

    if (clientFilter !== "all") {
      filtered = filtered.filter((c) => {
        const clientId = ((c as any)._id || c.id)?.toString();
        return clientId === clientFilter;
      });
    }
    
    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [clients, clientFilter]);


  const getClientName = (clientId?: string | Client) => {
    if (!clientId) return t("noClientLabel");
    if (typeof clientId === "object") return clientId.name;
    const client = clients.find((c) => (c._id || c.id) === clientId);
    return client?.name || t("unknownClient");
  };

  const getClientInfo = (clientId?: string | Client): Client | undefined => {
    if (!clientId) return undefined;
    if (typeof clientId === "object") return clientId as Client;
    return clients.find((c) => (c._id || c.id) === clientId);
  };

  const openClientCreateModal = () => {
    setClientForm({
      name: "",
      email: "",
      phone: "",
      businessType: "",
      clientType: "other",
      notes: "",
    });
    setIsClientModalOpen(true);
  };

  const handleCreateClient = async () => {
    if (editingClient) {
      // Handle update
      const clientId = (editingClient as any)._id || editingClient.id;
      if (!clientId) return;
      
      setIsCreatingClient(true);
      try {
        await clientApi.update(clientId.toString(), {
          name: clientForm.name.trim(),
          email: clientForm.email.trim(),
          phone: clientForm.phone.trim() || undefined,
          businessType: clientForm.businessType.trim(),
          clientType: clientForm.clientType,
          notes: clientForm.notes.trim() || undefined,
        });
        
        // Refresh clients from database
        await loadClients();
        
        playUpdateBeep();
        toast({ title: t("clientUpdatedSuccess"), description: t("clientUpdatedDesc") });
        setIsClientModalOpen(false);
        setEditingClient(null);
        setClientForm({
          name: "",
          email: "",
          phone: "",
          businessType: "",
          clientType: "other",
          notes: "",
        });
      } catch (e: any) {
        playErrorBeep();
        toast({
          title: t("updateClientFailedTitle"),
          description: e?.response?.error || e?.message || t("updateClientFailed"),
          variant: "destructive",
        });
      } finally {
        setIsCreatingClient(false);
      }
      return;
    }
    
    // Handle create (existing code)
    if (!clientForm.name.trim()) {
      toast({ title: t("validationErrorTitle"), description: t("clientNameRequired"), variant: "destructive" });
      return;
    }
    if (!clientForm.email.trim()) {
      toast({ title: t("validationErrorTitle"), description: t("clientEmailRequired"), variant: "destructive" });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientForm.email.trim())) {
      toast({ title: t("validationErrorTitle"), description: t("validEmailRequired"), variant: "destructive" });
      return;
    }
    if (!clientForm.businessType.trim()) {
      toast({ title: t("validationErrorTitle"), description: t("businessTypeRequired"), variant: "destructive" });
      return;
    }

    setIsCreatingClient(true);
    try {
      const res = await clientApi.create({
        name: clientForm.name.trim(),
        email: clientForm.email.trim(),
        phone: clientForm.phone.trim() || undefined,
        businessType: clientForm.businessType.trim(),
        clientType: clientForm.clientType,
        notes: clientForm.notes.trim() || undefined,
      });

      const created = res.data as any;
      const createdId = created?._id || created?.id;
      
      // Refresh clients from database to get all registered clients
      await loadClients();
      
      if (createdId) {
        setFormData((prev) => ({
          ...prev,
          clientId: createdId.toString(),
          notifyClient: true, // smart default when you just created a client
        }));
      }

      playUpdateBeep();
      toast({ title: t("clientAddedSuccess"), description: t("clientCreatedAndSelected") });
      setIsClientModalOpen(false);
      setClientForm({
        name: "",
        email: "",
        phone: "",
        businessType: "",
        clientType: "other",
        notes: "",
      });
    } catch (e: any) {
      playErrorBeep();
      toast({
        title: t("createClientFailedTitle"),
        description: e?.response?.error || e?.message || t("clientCreationFailed"),
        variant: "destructive",
      });
    } finally {
      setIsCreatingClient(false);
    }
  };

  const openAddModal = () => {
    setEditingSchedule(null);
    setCurrentStep(1); // Reset to first step
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const urlClientId = searchParams.get("clientId");
    const existingClient = urlClientId ? clients.find((c: any) => ((c._id || c.id)?.toString()) === urlClientId) : null;
    
    setFormData({
      title: "",
      description: "",
      clientId: urlClientId || "",
      clientName: existingClient?.name || "",
      clientEmail: existingClient?.email || "",
      clientPhone: existingClient?.phone || "",
      clientBusinessType: existingClient?.businessType || "",
      clientType: existingClient?.clientType || "other",
      // Format for datetime-local: YYYY-MM-DDTHH:mm (default to 9:00 AM)
      dueDate: (() => {
        const date = new Date(tomorrow);
        date.setHours(9, 0, 0, 0);
        return date.toISOString().slice(0, 16);
      })(),
      frequency: "once",
      automationType: "payment_reminder",
      amount: "",
      notifyUser: true,
      notifyClient: true,
      userNotificationMessage: "",
      clientNotificationMessage: "",
      advanceNotificationDays: "0",
      repeatUntil: "",
    });
    setIsModalOpen(true);
  };

  const openEditModal = (schedule: Schedule) => {
    setEditingSchedule(schedule);
    setCurrentStep(1); // Reset to first step
    const clientId = typeof schedule.clientId === "object" 
      ? (schedule.clientId._id || schedule.clientId.id) 
      : schedule.clientId;
    
    // Ensure clientId is set - if schedule has no client, require user to select one
    if (!clientId) {
      playErrorBeep();
      toast({
        title: t("invalidScheduleTitle"),
        description: t("invalidScheduleNoClient"),
        variant: "destructive",
      });
      return;
    }
    
    const clientInfo = typeof schedule.clientId === "object" ? schedule.clientId : 
      clients.find((c: any) => ((c._id || c.id)?.toString()) === clientId?.toString());
    
    setFormData({
      title: schedule.title,
      description: schedule.description || "",
      clientId: clientId.toString(),
      clientName: clientInfo && typeof clientInfo === "object" ? clientInfo.name : "",
      clientEmail: clientInfo && typeof clientInfo === "object" ? (clientInfo.email || "") : "",
      clientPhone: clientInfo && typeof clientInfo === "object" ? (clientInfo.phone || "") : "",
      clientBusinessType: clientInfo && typeof clientInfo === "object" ? (clientInfo.businessType || "") : "",
      clientType: clientInfo && typeof clientInfo === "object" ? (clientInfo.clientType || "other") : "other",
      // Format datetime-local: YYYY-MM-DDTHH:mm (convert to local time)
      dueDate: (() => {
        const date = new Date(schedule.dueDate);
        // Get local date components
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
      })(),
      frequency: schedule.frequency,
      automationType: normalizeAutomationType((schedule as Schedule).automationType),
      amount: schedule.amount?.toString() || "",
      notifyUser: schedule.notifyUser,
      notifyClient: schedule.notifyClient,
      userNotificationMessage: schedule.userNotificationMessage || "",
      clientNotificationMessage: schedule.clientNotificationMessage || "",
      advanceNotificationDays: schedule.advanceNotificationDays.toString(),
      repeatUntil: schedule.repeatUntil 
        ? new Date(schedule.repeatUntil).toISOString().split("T")[0] 
        : "",
    });
    setIsModalOpen(true);
  };

  // Step navigation functions
  const nextStep = () => {
    // Validate current step before moving forward
    if (currentStep === 1) {
      // Validate Basic Information
      if (!formData.title.trim()) {
        playErrorBeep();
        toast({
          title: t("validationErrorTitle"),
          description: t("scheduleTitleRequired"),
          variant: "destructive",
        });
        return;
      }
      if (!formData.dueDate) {
        playErrorBeep();
        toast({
          title: t("validationErrorTitle"),
          description: t("dueDateRequired"),
          variant: "destructive",
        });
        return;
      }
    } else if (currentStep === 2) {
      // Validate Client Details
      if (!formData.clientName.trim()) {
        playErrorBeep();
        toast({
          title: t("validationErrorTitle"),
          description: t("clientNameRequired"),
          variant: "destructive",
        });
        return;
      }
      if (!formData.clientEmail.trim()) {
        playErrorBeep();
        toast({
          title: t("validationErrorTitle"),
          description: t("clientEmailRequired"),
          variant: "destructive",
        });
        return;
      }
      if (!formData.clientBusinessType.trim()) {
        playErrorBeep();
        toast({
          title: t("validationErrorTitle"),
          description: t("businessTypeRequired"),
          variant: "destructive",
        });
        return;
      }
    }
    
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      playErrorBeep();
      toast({
        title: t("validationErrorTitle"),
        description: t("scheduleTitleRequired"),
        variant: "destructive",
      });
      return;
    }

    if (!formData.dueDate) {
      playErrorBeep();
      toast({
        title: t("validationErrorTitle"),
        description: t("dueDateRequired"),
        variant: "destructive",
      });
      return;
    }

    // Validate client information
    if (!formData.clientName.trim()) {
      playErrorBeep();
      toast({
        title: t("validationErrorTitle"),
        description: t("clientNameRequired"),
        variant: "destructive",
      });
      return;
    }

    if (!formData.clientEmail.trim()) {
      playErrorBeep();
      toast({
        title: t("validationErrorTitle"),
        description: t("clientEmailRequired"),
        variant: "destructive",
      });
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.clientEmail.trim())) {
      playErrorBeep();
      toast({
        title: t("validationErrorTitle"),
        description: t("validEmailRequired"),
        variant: "destructive",
      });
      return;
    }

    if (!formData.clientBusinessType.trim()) {
      playErrorBeep();
      toast({
        title: t("validationErrorTitle"),
        description: t("businessTypeRequired"),
        variant: "destructive",
      });
      return;
    }

    try {
      let finalClientId = formData.clientId;

      // If no clientId is set, check if client exists by email, otherwise create new client
      if (!finalClientId) {
        const existingClient = clients.find(
          (c: any) => c.email?.toLowerCase() === formData.clientEmail.trim().toLowerCase()
        );
        
        if (existingClient) {
          finalClientId = (existingClient._id || existingClient.id)?.toString();
        } else {
          // Create new client
          try {
            const clientRes = await clientApi.create({
              name: formData.clientName.trim(),
              email: formData.clientEmail.trim(),
              phone: formData.clientPhone.trim() || undefined,
              businessType: formData.clientBusinessType.trim(),
              clientType: formData.clientType,
            });
            const createdClient = clientRes.data as any;
            finalClientId = (createdClient._id || createdClient.id)?.toString();
            await loadClients(); // Refresh clients list
          } catch (clientError: any) {
            playErrorBeep();
            toast({
              title: t("clientCreationFailed"),
              description: clientError?.response?.error || clientError?.message || t("clientCreationFailed"),
              variant: "destructive",
            });
            return;
          }
        }
      }

      const scheduleData: any = {
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        clientId: finalClientId,
        // Ensure full datetime is preserved with time component
        dueDate: new Date(formData.dueDate).toISOString(),
        frequency: formData.frequency,
        automationType: formData.automationType,
        amount: formData.amount && formData.amount.trim() !== '' ? Number(formData.amount) : undefined,
        notifyUser: formData.notifyUser,
        notifyClient: formData.notifyClient,
        userNotificationMessage: formData.userNotificationMessage.trim() || undefined,
        clientNotificationMessage: formData.clientNotificationMessage.trim() || undefined,
        advanceNotificationDays: parseInt(formData.advanceNotificationDays) || 0,
        repeatUntil: formData.repeatUntil ? new Date(formData.repeatUntil).toISOString() : undefined,
      };

      if (editingSchedule) {
        // Update client information if it has changed
        const currentClientId = typeof editingSchedule.clientId === "object" 
          ? (editingSchedule.clientId._id || editingSchedule.clientId.id) 
          : editingSchedule.clientId;
        
        if (finalClientId === currentClientId?.toString()) {
          // Same client - check if client info needs updating
          const currentClient = clients.find((c: any) => ((c._id || c.id)?.toString()) === finalClientId);
          if (currentClient) {
            const clientNeedsUpdate = 
              currentClient.name !== formData.clientName.trim() ||
              currentClient.email !== formData.clientEmail.trim() ||
              currentClient.phone !== formData.clientPhone.trim() ||
              currentClient.businessType !== formData.clientBusinessType.trim() ||
              currentClient.clientType !== formData.clientType;
            
            if (clientNeedsUpdate) {
              try {
                await clientApi.update(finalClientId, {
                  name: formData.clientName.trim(),
                  email: formData.clientEmail.trim(),
                  phone: formData.clientPhone.trim() || undefined,
                  businessType: formData.clientBusinessType.trim(),
                  clientType: formData.clientType,
                });
                await loadClients(); // Refresh clients list
              } catch (clientError: any) {
                console.error("Failed to update client:", clientError);
                // Continue with schedule update even if client update fails
              }
            }
          }
        }

        const updatedSchedule: Schedule = {
          ...editingSchedule,
          ...scheduleData,
        };
        await updateSchedule(updatedSchedule);
        playUpdateBeep();
        toast({
          title: t("scheduleUpdatedTitle"),
          description: t("scheduleUpdatedDesc"),
        });
      } else {
        await addSchedule(scheduleData);
        playUpdateBeep();
        toast({
          title: t("scheduleCreatedTitle"),
          description: t("scheduleCreatedDesc"),
        });
      }
      setIsModalOpen(false);
      setEditingSchedule(null);
      // Reset form
      setFormData({
        title: "",
        description: "",
        clientId: "",
        clientName: "",
        clientEmail: "",
        clientPhone: "",
        clientBusinessType: "",
        clientType: "other",
        dueDate: "",
        frequency: "once",
        automationType: "payment_reminder",
        amount: "",
        notifyUser: true,
        notifyClient: true,
        userNotificationMessage: "",
        clientNotificationMessage: "",
        advanceNotificationDays: "0",
        repeatUntil: "",
      });
    } catch (error) {
      playErrorBeep();
      toast({
        title: editingSchedule ? t("updateFailed") : t("createFailedTitle"),
        description: t("pleaseTryAgain"),
        variant: "destructive",
      });
    }
  };

  const handleCompleteClick = (schedule: Schedule) => {
    setScheduleToComplete(schedule);
    setCompletionMessage("");
    setSendCompletionEmail(false);
    setCompleteDialogOpen(true);
  };

  const handleCompleteConfirm = async () => {
    if (!scheduleToComplete) return;
    
    try {
      const scheduleId = (scheduleToComplete as any)._id || scheduleToComplete.id;
      const completionData: any = {};
      
      // Send email if checkbox is checked (message is optional)
      if (sendCompletionEmail) {
        completionData.completionMessage = completionMessage.trim() || undefined;
        completionData.notifyClient = true;
        completionData.notifyUser = true;
      }
      
      await scheduleApi.complete(scheduleId, completionData);
      await refreshSchedules();
      playUpdateBeep();
      toast({
        title: t("scheduleCompletedTitle"),
        description: sendCompletionEmail
          ? t("scheduleCompletedWithEmail")
          : t("scheduleCompletedNoEmail"),
      });
      setCompleteDialogOpen(false);
      setScheduleToComplete(null);
      setCompletionMessage("");
      setSendCompletionEmail(false);
    } catch (error) {
      playErrorBeep();
      toast({
        title: t("error"),
        description: t("completeScheduleFailed"),
        variant: "destructive",
      });
    }
  };

  const handleDeleteClick = (schedule: Schedule) => {
    setScheduleToDelete(schedule);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!scheduleToDelete) return;
    const schedule = scheduleToDelete;
    setDeleteDialogOpen(false);
    setScheduleToDelete(null);

    try {
      await removeSchedule(schedule);
      playDeleteBeep();
      toast({
        title: t("scheduleDeletedTitle"),
        description: t("scheduleDeletedDesc"),
      });
    } catch (error) {
      playErrorBeep();
      toast({
        title: t("error"),
        description: t("pleaseTryAgain"),
        variant: "destructive",
      });
    }
  };

  const handleDeleteClientConfirm = async () => {
    if (!clientToDelete) return;

    const client = clientToDelete;
    const clientId = (client as any)._id || client.id;
    const clientIdStr = clientId?.toString() || "";
    const clientSchedules = getSchedulesForClient(clientIdStr);

    if (clientSchedules.length > 0) {
      playErrorBeep();
      toast({
        title: t("cannotDeleteClientTitle"),
        description: t("cannotDeleteClientSchedules").replace("{count}", String(clientSchedules.length)),
        variant: "destructive",
      });
      setDeleteClientDialogOpen(false);
      setClientToDelete(null);
      return;
    }

    setDeleteClientDialogOpen(false);
    setClientToDelete(null);
    setClients((prev) => prev.filter((c) => String((c as any)._id || c.id) !== clientIdStr));

    try {
      await clientApi.delete(clientIdStr);
      playDeleteBeep();
      toast({
        title: t("clientDeletedSuccess"),
        description: t("clientDeletedDesc"),
      });
    } catch (error: any) {
      setClients((prev) => [...prev, client]);
      playErrorBeep();
      toast({
        title: t("deleteClientFailed"),
        description: error?.response?.error || error?.message || t("deleteClientFailed"),
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-700 border-green-300";
      case "cancelled":
        return "bg-gray-100 text-gray-700 border-gray-300";
      default:
        return "bg-blue-100 text-blue-700 border-blue-300";
    }
  };

  const isOverdue = (dueDate: string | Date) => {
    const due = new Date(dueDate);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    return due < now && due.toDateString() !== now.toDateString();
  };

  const getDaysUntilDue = (dueDate: string | Date) => {
    const due = new Date(dueDate);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    const diffTime = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const upcomingSchedules = useMemo(() => {
    return schedules.filter((s) => {
      const dueDate = new Date(s.dueDate);
      const now = new Date();
      return dueDate >= now && s.status === "pending";
    }).slice(0, 5);
  }, [schedules]);

  const overdueSchedules = useMemo(() => {
    return schedules.filter((s) => isOverdue(s.dueDate) && s.status === "pending");
  }, [schedules]);

  const { query: pageSearchQuery } = usePageSearch();

  // Flat filtered schedule list for card grid
  const filteredSchedules = useMemo(() => {
    let list = filterByPageSearch(schedules, pageSearchQuery, (schedule) => {
      const client = typeof schedule.clientId === "object" ? schedule.clientId : null;
      return [
        schedule.title,
        schedule.description,
        client?.name,
        client?.email,
        client?.phone,
        schedule.status,
        schedule.frequency,
      ];
    });

    // Status filter
    if (statusFilter !== "all") {
      list = list.filter((s) => s.status === statusFilter);
    }

    // Date filter
    if (dateFilter !== "all") {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const today = new Date(now);
      const nextWeek = new Date(now);
      nextWeek.setDate(nextWeek.getDate() + 7);
      const nextMonth = new Date(now);
      nextMonth.setMonth(nextMonth.getMonth() + 1);

      list = list.filter((s) => {
        const d = new Date(s.dueDate);
        d.setHours(0, 0, 0, 0);
        switch (dateFilter) {
          case "today": return d.getTime() === today.getTime();
          case "thisWeek": return d >= today && d <= nextWeek;
          case "thisMonth": return d >= today && d <= nextMonth;
          case "overdue": return d < today && s.status === "pending";
          case "upcoming": return d > today && s.status === "pending";
          default: return true;
        }
      });
    }

    // Frequency filter
    if (frequencyFilter !== "all") {
      list = list.filter((s) => s.frequency === frequencyFilter);
    }

    // Automation type filter
    if (automationTypeFilter !== "all") {
      list = list.filter((s) => normalizeAutomationType((s as Schedule).automationType) === automationTypeFilter);
    }

    // Client filter
    if (clientFilter !== "all") {
      list = list.filter((s) => {
        const sid = (s as any).clientId;
        const linkedId = typeof sid === "object" ? (sid?._id || sid?.id) : sid;
        return linkedId?.toString() === clientFilter;
      });
    }

    // Sort: overdue first, then by due date ascending
    list.sort((a, b) => {
      const aOverdue = isOverdue(a.dueDate) && a.status === "pending" ? 0 : 1;
      const bOverdue = isOverdue(b.dueDate) && b.status === "pending" ? 0 : 1;
      if (aOverdue !== bOverdue) return aOverdue - bOverdue;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });

    return list;
  }, [schedules, statusFilter, dateFilter, frequencyFilter, automationTypeFilter, clientFilter, pageSearchQuery]);

  // Stats
  const activeCount = schedules.filter((s) => s.status === "pending").length;
  const completedCount = schedules.filter((s) => s.status === "completed").length;
  const overdueCount = overdueSchedules.length;
  const hasActiveFilters =
    statusFilter !== "all" ||
    dateFilter !== "all" ||
    frequencyFilter !== "all" ||
    automationTypeFilter !== "all" ||
    clientFilter !== "all";

  const clearAllFilters = () => {
    setStatusFilter("all");
    setDateFilter("all");
    setFrequencyFilter("all");
    setAutomationTypeFilter("all");
    setClientFilter("all");
  };

  // Skeleton
  const SchedulesSkeleton = () => (
    <AppLayout title={t("emailAutomationsTitle")}>
      <div className="flex flex-col gap-4 pb-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div><Skeleton className="h-7 w-48 mb-1" /><Skeleton className="h-4 w-64" /></div>
          <Skeleton className="h-10 w-40 rounded-lg" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[1,2,3].map(i=>(<div key={i} className="bg-white border border-gray-200 rounded-xl p-4"><Skeleton className="h-4 w-16 mb-2" /><Skeleton className="h-7 w-10" /></div>))}
        </div>
        <div className="overflow-hidden border border-gray-200 bg-white">
          <div className="divide-y divide-gray-100">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );

  if (isLoading) {
    return <SchedulesSkeleton />;
  }

  return (
    <AppLayout title={t("emailAutomationsTitle")}>
      <div className="flex flex-col gap-4 pb-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                {t("emailAutomationsTitle")}
              </h2>
              <HelpTip text={t("helpAutomations")} />
            </div>
            <p className="text-sm text-gray-500 mt-0.5">{t("emailAutomationsSubtitle")}</p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button onClick={openClientCreateModal} variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-50 gap-2 flex-1 sm:flex-initial">
              <UserPlus size={16} /> {t("clientLabel")}
            </Button>
            <Button onClick={openAddModal} className="bg-sky-400 text-white hover:bg-sky-500 border border-sky-400 gap-2 flex-1 sm:flex-initial">
              <Plus size={16} /> {t("newAutomation")}
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3">
          <button onClick={() => setStatusFilter(statusFilter === "pending" ? "all" : "pending")} className={cn("text-left rounded-xl border p-3 sm:p-4 transition-all", statusFilter === "pending" ? "bg-blue-50 border-blue-300 ring-1 ring-blue-300" : "bg-white border-gray-200 hover:border-blue-200")}>
            <div className="text-xs font-medium text-gray-500 mb-1">{t("statusActive")}</div>
            <div className="text-xl sm:text-2xl font-bold text-blue-700">{activeCount}</div>
          </button>
          <button onClick={() => setStatusFilter(statusFilter === "completed" ? "all" : "completed")} className={cn("text-left rounded-xl border p-3 sm:p-4 transition-all", statusFilter === "completed" ? "bg-green-50 border-green-300 ring-1 ring-green-300" : "bg-white border-gray-200 hover:border-green-200")}>
            <div className="text-xs font-medium text-gray-500 mb-1">{t("statusCompleted")}</div>
            <div className="text-xl sm:text-2xl font-bold text-green-700">{completedCount}</div>
          </button>
          <button onClick={() => setDateFilter(dateFilter === "overdue" ? "all" : "overdue")} className={cn("text-left rounded-xl border p-3 sm:p-4 transition-all", dateFilter === "overdue" ? "bg-red-50 border-red-300 ring-1 ring-red-300" : "bg-white border-gray-200 hover:border-red-200")}>
            <div className="text-xs font-medium text-gray-500 mb-1">{t("statusOverdue")}</div>
            <div className={cn("text-xl sm:text-2xl font-bold", overdueCount > 0 ? "text-red-600" : "text-gray-400")}>{overdueCount}</div>
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3">
          <div className="lg:hidden flex justify-end">
            <Button
              type="button"
              onClick={() => setShowFilters((v) => !v)}
              variant="outline"
              className={cn(mobileFilterToggleClass, showFilters && mobileFilterToggleActiveClass)}
            >
              <Filter size={18} />
            </Button>
          </div>
          {showFilters ? (
            <div className={cn("lg:hidden", mobileFilterPanelClass)}>
              <div className="space-y-3">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className={cn("w-full h-10 rounded-none", filterSelectClass)}>
                    <SelectValue placeholder={t("status")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("allStatus")}</SelectItem>
                    <SelectItem value="pending">{t("statusActive")}</SelectItem>
                    <SelectItem value="completed">{t("statusCompleted")}</SelectItem>
                    <SelectItem value="cancelled">{t("statusCancelled")}</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger className={cn("w-full h-10 rounded-none", filterSelectClass)}>
                    <SelectValue placeholder={t("date")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("allDates")}</SelectItem>
                    <SelectItem value="today">{t("filterToday")}</SelectItem>
                    <SelectItem value="thisWeek">{t("filterThisWeek")}</SelectItem>
                    <SelectItem value="thisMonth">{t("filterThisMonth")}</SelectItem>
                    <SelectItem value="overdue">{t("filterOverdue")}</SelectItem>
                    <SelectItem value="upcoming">{t("filterUpcoming")}</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={frequencyFilter} onValueChange={setFrequencyFilter}>
                  <SelectTrigger className={cn("w-full h-10 rounded-none", filterSelectClass)}>
                    <SelectValue placeholder={t("scheduleFrequencySection")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("allFrequency")}</SelectItem>
                    <SelectItem value="once">{t("freqOnce")}</SelectItem>
                    <SelectItem value="daily">{t("freqDaily")}</SelectItem>
                    <SelectItem value="weekly">{t("freqWeekly")}</SelectItem>
                    <SelectItem value="monthly">{t("freqMonthly")}</SelectItem>
                    <SelectItem value="yearly">{t("freqYearly")}</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={automationTypeFilter} onValueChange={setAutomationTypeFilter}>
                  <SelectTrigger className={cn("w-full h-10 rounded-none", filterSelectClass)}>
                    <SelectValue placeholder={t("automationTypeLabel")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("allAutomationTypes")}</SelectItem>
                    {AUTOMATION_TYPE_VALUES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {t(AUTOMATION_TYPE_LABEL_KEYS[type])}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={clientFilter} onValueChange={setClientFilter}>
                  <SelectTrigger className={cn("w-full h-10 rounded-none", filterSelectClass)}>
                    <SelectValue placeholder={t("clientLabel")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("allClientsFilter")}</SelectItem>
                    {clients.map((c) => {
                      const cid = ((c as any)._id || c.id)?.toString();
                      return (
                        <SelectItem key={cid} value={cid}>
                          {c.name}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {hasActiveFilters ? (
                  <Button type="button" variant="outline" onClick={clearAllFilters} className="h-10 rounded-none w-full">
                    <X size={14} className="mr-1.5" />
                    {t("clearFilters")}
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}
          <div className="hidden lg:flex flex-wrap items-center gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className={cn(filterSelectClass, "rounded-none w-40 h-9 text-sm shrink-0")}>
                <Filter size={14} className="mr-1.5 text-gray-400" />
                <SelectValue placeholder={t("status")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("allStatus")}</SelectItem>
                <SelectItem value="pending">{t("statusActive")}</SelectItem>
                <SelectItem value="completed">{t("statusCompleted")}</SelectItem>
                <SelectItem value="cancelled">{t("statusCancelled")}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className={cn(filterSelectClass, "rounded-none w-40 h-9 text-sm shrink-0")}>
                <CalendarIcon size={14} className="mr-1.5 text-gray-400" />
                <SelectValue placeholder={t("date")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("allDates")}</SelectItem>
                <SelectItem value="today">{t("filterToday")}</SelectItem>
                <SelectItem value="thisWeek">{t("filterThisWeek")}</SelectItem>
                <SelectItem value="thisMonth">{t("filterThisMonth")}</SelectItem>
                <SelectItem value="overdue">{t("filterOverdue")}</SelectItem>
                <SelectItem value="upcoming">{t("filterUpcoming")}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={frequencyFilter} onValueChange={setFrequencyFilter}>
              <SelectTrigger className={cn(filterSelectClass, "rounded-none w-40 h-9 text-sm shrink-0")}>
                <Repeat size={14} className="mr-1.5 text-gray-400" />
                <SelectValue placeholder={t("scheduleFrequencySection")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("allFrequency")}</SelectItem>
                <SelectItem value="once">{t("freqOnce")}</SelectItem>
                <SelectItem value="daily">{t("freqDaily")}</SelectItem>
                <SelectItem value="weekly">{t("freqWeekly")}</SelectItem>
                <SelectItem value="monthly">{t("freqMonthly")}</SelectItem>
                <SelectItem value="yearly">{t("freqYearly")}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={automationTypeFilter} onValueChange={setAutomationTypeFilter}>
              <SelectTrigger className={cn(filterSelectClass, "rounded-none w-44 h-9 text-sm shrink-0")}>
                <Filter size={14} className="mr-1.5 text-gray-400" />
                <SelectValue placeholder={t("automationTypeLabel")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("allAutomationTypes")}</SelectItem>
                {AUTOMATION_TYPE_VALUES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {t(AUTOMATION_TYPE_LABEL_KEYS[type])}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={clientFilter} onValueChange={setClientFilter}>
              <SelectTrigger className={cn(filterSelectClass, "rounded-none w-44 h-9 text-sm shrink-0")}>
                <User size={14} className="mr-1.5 text-gray-400" />
                <SelectValue placeholder={t("clientLabel")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("allClientsFilter")}</SelectItem>
                {clients.map((c) => {
                  const cid = ((c as any)._id || c.id)?.toString();
                  return (
                    <SelectItem key={cid} value={cid}>
                      {c.name}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={clearAllFilters}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium whitespace-nowrap shrink-0 self-center"
              >
                {t("clearFilters")}
              </button>
            ) : null}
          </div>
        </div>

        {/* Automation Table */}
        <div className="overflow-hidden bg-white border border-gray-200">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-collapse">
              <thead>
                <tr>
                  <th className={cn(FINANCE_TH_CLASS, "pl-4")}>{t("scheduleTitleLabel")}</th>
                  <th className={FINANCE_TH_CLASS}>{t("automationTypeLabel")}</th>
                  <th className={FINANCE_TH_CLASS}>{t("clientLabel")}</th>
                  <th className={FINANCE_TH_CLASS}>{t("dueDateTimeLabel")}</th>
                  <th className={cn(FINANCE_TH_CLASS, "hidden md:table-cell")}>{t("scheduleFrequencySection")}</th>
                  <th className={FINANCE_TH_CLASS}>{t("status")}</th>
                  <th className={cn(FINANCE_TH_CLASS, "text-right hidden sm:table-cell")}>{t("amount")}</th>
                  <th className={cn(FINANCE_TH_CLASS, "hidden lg:table-cell")}>{t("lastSent")}</th>
                  <th className={cn(FINANCE_TH_CLASS, "w-28 pr-4 text-right")} />
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {filteredSchedules.length > 0 ? (
                  filteredSchedules.map((schedule) => {
                    const scheduleId = (schedule as any)._id || schedule.id;
                    const overdue = isOverdue(schedule.dueDate) && schedule.status === "pending";
                    const daysUntil = getDaysUntilDue(schedule.dueDate);
                    const isToday = daysUntil === 0;
                    const clientInfo = getClientInfo(schedule.clientId);
                    const clientName = getClientName(schedule.clientId);
                    const clientEmail = clientInfo?.email || "";
                    const automationType = normalizeAutomationType((schedule as Schedule).automationType);
                    const frequencyLabel =
                      schedule.frequency === "once"
                        ? t("freqOnce")
                        : schedule.frequency === "daily"
                          ? t("freqDaily")
                          : schedule.frequency === "weekly"
                            ? t("freqWeekly")
                            : schedule.frequency === "monthly"
                              ? t("freqMonthly")
                              : t("freqYearly");
                    const statusLabel = overdue
                      ? t("statusOverdue")
                      : schedule.status === "pending"
                        ? t("statusActive")
                        : schedule.status === "completed"
                          ? t("statusCompleted")
                          : t("statusCancelled");
                    const dueLabel = overdue
                      ? t("daysOverdue").replace("{days}", String(Math.abs(daysUntil)))
                      : isToday
                        ? t("dueToday")
                        : daysUntil === 1
                          ? t("dueTomorrow")
                          : schedule.status === "completed"
                            ? new Date(schedule.dueDate).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              })
                            : t("daysRemaining").replace("{days}", String(daysUntil));
                    const sendDate = new Date(schedule.dueDate);
                    const lastNotified = (schedule as any).lastNotified as string | undefined;

                    return (
                      <tr
                        key={scheduleId}
                        className={cn(
                          "transition-colors hover:bg-gray-50/80",
                          overdue && "bg-red-50/40",
                          schedule.status === "completed" && "opacity-80",
                        )}
                      >
                        <td className={cn(FINANCE_TD_CLASS, "pl-4 max-w-[220px]")}>
                          <div className="font-semibold text-gray-900 truncate">{schedule.title}</div>
                          {schedule.description ? (
                            <div className="text-xs text-gray-500 truncate mt-0.5">{schedule.description}</div>
                          ) : null}
                        </td>
                        <td className={FINANCE_TD_CLASS}>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 whitespace-nowrap">
                            {t(AUTOMATION_TYPE_LABEL_KEYS[automationType])}
                          </span>
                        </td>
                        <td className={cn(FINANCE_TD_CLASS, "max-w-[180px]")}>
                          <div className="truncate text-gray-900">{clientName}</div>
                          {clientEmail ? (
                            <div className="truncate text-xs text-gray-500 mt-0.5">{clientEmail}</div>
                          ) : null}
                        </td>
                        <td className={FINANCE_TD_CLASS}>
                          <div className={cn("text-sm font-medium tabular-nums", overdue ? "text-red-600" : isToday ? "text-blue-600" : "text-gray-800")}>
                            {dueLabel}
                          </div>
                          <div className="text-xs text-gray-500 tabular-nums mt-0.5">
                            {sendDate.toLocaleString(undefined, {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        </td>
                        <td className={cn(FINANCE_TD_CLASS, "hidden md:table-cell text-gray-700")}>
                          <span className="inline-flex items-center gap-1">
                            <Repeat size={12} className="text-purple-500" />
                            {frequencyLabel}
                          </span>
                        </td>
                        <td className={FINANCE_TD_CLASS}>
                          <span
                            className={cn(
                              "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap",
                              schedule.status === "completed" && "bg-green-100 text-green-700",
                              schedule.status === "pending" && !overdue && "bg-blue-100 text-blue-700",
                              schedule.status === "cancelled" && "bg-gray-100 text-gray-600",
                              overdue && "bg-red-100 text-red-700",
                            )}
                          >
                            {statusLabel}
                          </span>
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {schedule.notifyUser ? (
                              <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-700">
                                <Bell size={10} /> {t("notifyYou")}
                              </span>
                            ) : null}
                            {schedule.notifyClient ? (
                              <span className="inline-flex items-center gap-0.5 text-[10px] text-cyan-700">
                                <Mail size={10} /> {t("notifyClientBadge")}
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className={cn(FINANCE_TD_CLASS, "text-right hidden sm:table-cell tabular-nums")}>
                          {schedule.amount ? (
                            <span className="font-semibold text-green-700">
                              <CurrencyAmount amount={schedule.amount} codeFirst codeClassName="text-green-700/70" />
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className={cn(FINANCE_TD_CLASS, "hidden lg:table-cell text-xs text-gray-600")}>
                          {lastNotified
                            ? new Date(lastNotified).toLocaleString(undefined, {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "—"}
                        </td>
                        <td className={cn(FINANCE_TD_CLASS, "pr-4")}>
                          <div className="flex items-center justify-end gap-0.5">
                            {schedule.status === "pending" ? (
                              <button
                                type="button"
                                onClick={() => handleCompleteClick(schedule)}
                                className="p-1.5 text-green-600 rounded-lg hover:bg-green-50"
                                title={t("completeAction")}
                              >
                                <CheckCircle2 size={15} />
                              </button>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => openEditModal(schedule)}
                              className="p-1.5 text-gray-500 rounded-lg hover:bg-gray-100"
                              title={t("editAction")}
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteClick(schedule)}
                              className="p-1.5 text-gray-400 rounded-lg hover:bg-red-50 hover:text-red-600"
                              title={t("deleteAction")}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={9} className="py-16 text-center">
                      <p className="text-base font-semibold text-gray-700 mb-1">
                        {hasActiveFilters ? t("noAutomationsFound") : t("noAutomationsYet")}
                      </p>
                      <p className="text-sm text-gray-500 mb-5 max-w-xs mx-auto">
                        {hasActiveFilters ? t("tryAdjustFilters") : t("createFirstAutomationHint")}
                      </p>
                      {!hasActiveFilters ? (
                        <Button onClick={openAddModal} className="bg-sky-400 text-white hover:bg-sky-500 border border-sky-400 gap-2">
                          <Plus size={16} /> {t("createAutomation")}
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={(open) => {
        setIsModalOpen(open);
        if (!open) {
          setCurrentStep(1); // Reset step when modal closes
        }
      }}>
        <DialogContent className="lg:bg-white bg-white/80 backdrop-blur-sm max-w-2xl w-[95vw] sm:w-full max-h-[90vh] sm:max-h-[85vh] overflow-y-auto mx-2 sm:mx-4">
          <DialogHeader className="space-y-1 border-b border-gray-200 pb-3 sm:pb-4">
            <DialogTitle className="text-base sm:text-lg font-semibold text-gray-900">
              {editingSchedule ? t("editScheduleModal") : t("createScheduleModal")}
            </DialogTitle>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">
              {editingSchedule ? t("editScheduleDesc") : t("createScheduleDesc")}
            </p>
            
            {/* Progress Indicator */}
            <div className="mt-3 sm:mt-4 flex items-center justify-between gap-1 sm:gap-2">
              {[1, 2, 3, 4].map((step) => (
                <div key={step} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div className={cn(
                      "w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-semibold",
                      currentStep >= step 
                        ? "bg-gray-900 text-white" 
                        : "bg-gray-200 text-gray-600"
                    )}>
                      {step}
                    </div>
                    <span className={cn(
                      "text-[10px] sm:text-xs mt-0.5 sm:mt-1 text-center",
                      currentStep >= step ? "text-gray-900 font-medium" : "text-gray-500"
                    )}>
                      {step === 1 && t("stepBasic")}
                      {step === 2 && t("stepClient")}
                      {step === 3 && t("stepFreq")}
                      {step === 4 && t("stepNotify")}
                    </span>
                  </div>
                  {step < 4 && (
                    <div className={cn(
                      "h-0.5 flex-1 mx-1 sm:mx-2",
                      currentStep > step ? "bg-gray-900" : "bg-gray-200"
                    )} />
                  )}
                </div>
              ))}
            </div>
          </DialogHeader>
          
          <div className="py-4 sm:py-6">
            {/* Step 1: Basic Information */}
            {currentStep === 1 && (
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                <CalendarIcon size={16} className="text-gray-500" />
                <h3 className="text-sm sm:text-base font-semibold text-gray-900">{t("basicInformation")}</h3>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-900">{t("automationTypeLabel")}</Label>
                <p className="text-xs text-gray-500">{t("automationPurposeHint")}</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {AUTOMATION_TYPE_VALUES.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFormData({ ...formData, automationType: type })}
                      className={cn(
                        "rounded-lg border px-2 py-2 text-left text-xs font-medium transition-colors",
                        formData.automationType === type
                          ? "border-gray-900 bg-gray-100 text-gray-900"
                          : "border-gray-200 bg-white text-gray-700 hover:border-gray-300",
                      )}
                    >
                      {t(AUTOMATION_TYPE_LABEL_KEYS[type])}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-900">
                    {t("scheduleTitleLabel")} <span className="text-red-600">*</span>
                  </Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder={t(AUTOMATION_TYPE_TITLE_PH_KEYS[formData.automationType] as "automationTitlePhCustom")}
                    className="h-9 sm:h-10"
                  />
                  <p className="text-xs text-gray-500">{t("scheduleTitleHint")}</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-900">
                    {t("dueDateTimeLabel")} <span className="text-red-600">*</span>
                  </Label>
                  <Input
                    type="datetime-local"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="h-9 sm:h-10"
                  />
                  <p className="text-xs text-gray-500">{t("dueDateHint")}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-900">{t("note")}</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder={t("descriptionOptionalHint")}
                  rows={3}
                />
                <p className="text-xs text-gray-500">{t("descriptionOptionalHint")}</p>
              </div>
            </div>
            )}

            {/* Step 2: Client & Amount Section */}
            {currentStep === 2 && (
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                <User size={16} className="text-gray-500" />
                <h3 className="text-sm sm:text-base font-semibold text-gray-900">{t("clientPaymentDetails")}</h3>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-900">
                    {t("clientNameLabel")} <span className="text-red-600">*</span>
                  </Label>
                  <Input
                    value={formData.clientName}
                    onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                    placeholder={t("enterClientName")}
                    className="h-9 sm:h-10"
                  />
                  </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-900">
                    {t("emailAddress")} <span className="text-red-600">*</span>
                  </Label>
                  <Input
                    type="email"
                    value={formData.clientEmail}
                    onChange={(e) => setFormData({ ...formData, clientEmail: e.target.value })}
                    placeholder="client@example.com"
                    className="h-9 sm:h-10"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-900">
                    {t("businessTypeWhatTheyDo")} <span className="text-red-600">*</span>
                  </Label>
                  <Input
                    value={formData.clientBusinessType}
                    onChange={(e) => setFormData({ ...formData, clientBusinessType: e.target.value })}
                    placeholder={t("businessTypePhShort")}
                    className="h-9 sm:h-10"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-900">{t("phoneNumber")}</Label>
                  <Input
                    type="tel"
                    value={formData.clientPhone}
                    onChange={(e) => setFormData({ ...formData, clientPhone: e.target.value })}
                    placeholder="+250 7xx xxx xxx"
                    className="h-9 sm:h-10"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-900">{t("clientTypeRelationship")}</Label>
                  <Select
                    value={formData.clientType} 
                    onValueChange={(value: "debtor" | "worker" | "other") => setFormData({ ...formData, clientType: value })}
                  >
                    <SelectTrigger className="h-9 sm:h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="debtor">{t("clientTypeDebtorShort")}</SelectItem>
                      <SelectItem value="worker">{t("clientTypeWorkerShort")}</SelectItem>
                      <SelectItem value="other">{t("clientTypeOther")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-900">{t("amount")} (Rwf)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="0"
                    className="h-9 sm:h-10"
                  />
                  <p className="text-xs text-gray-500">{t("amountOptionalHint")}</p>
                </div>
              </div>
            </div>
            )}

            {/* Step 3: Schedule Frequency Section */}
            {currentStep === 3 && (
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                <Repeat size={16} className="text-gray-500" />
                <h3 className="text-sm sm:text-base font-semibold text-gray-900">{t("scheduleFrequencySection")}</h3>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-900">{t("scheduleFrequencySection")}</Label>
                  <Select value={formData.frequency} onValueChange={(value: any) => setFormData({ ...formData, frequency: value })}>
                    <SelectTrigger className="h-9 sm:h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="once">{t("freqOnceLong")}</SelectItem>
                      <SelectItem value="daily">{t("freqDailyLong")}</SelectItem>
                      <SelectItem value="weekly">{t("freqWeeklyLong")}</SelectItem>
                      <SelectItem value="monthly">{t("freqMonthlyLong")}</SelectItem>
                      <SelectItem value="yearly">{t("freqYearlyLong")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500">
                    {formData.frequency === "once" && t("freqOnceHint")}
                    {formData.frequency === "daily" && t("freqDailyHint")}
                    {formData.frequency === "weekly" && t("freqWeeklyHint")}
                    {formData.frequency === "monthly" && t("freqMonthlyHint")}
                    {formData.frequency === "yearly" && t("freqYearlyHint")}
                  </p>
                </div>

                {formData.frequency !== "once" && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-900">{t("repeatUntilLabel")}</Label>
                    <Input
                      type="date"
                      value={formData.repeatUntil}
                      onChange={(e) => setFormData({ ...formData, repeatUntil: e.target.value })}
                      className="h-9 sm:h-10"
                    />
                    <p className="text-xs text-gray-500">{t("repeatUntilHint")}</p>
                  </div>
                )}
                </div>
              </div>
            )}

            {/* Step 4: Notification Settings Section */}
            {currentStep === 4 && (
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                <Mail size={16} className="text-gray-500" />
                <h3 className="text-sm sm:text-base font-semibold text-gray-900">{t("notificationSettings")}</h3>
              </div>
              
              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-start space-x-2 sm:space-x-3 p-2.5 sm:p-3 bg-gray-50 border border-gray-200 rounded">
                  <Checkbox
                    id="notifyUser"
                    checked={formData.notifyUser}
                    onCheckedChange={(checked) => setFormData({ ...formData, notifyUser: checked === true })}
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <Label htmlFor="notifyUser" className="cursor-pointer font-medium text-gray-900 text-sm">
                      {t("notifyMeUser")}
                    </Label>
                    <p className="text-xs text-gray-600 mt-0.5">{t("notifyMeUserDesc")}</p>
                  </div>
                </div>

                <div className="flex items-start space-x-2 sm:space-x-3 p-2.5 sm:p-3 bg-gray-50 border border-gray-200 rounded">
                  <Checkbox
                    id="notifyClient"
                    checked={formData.notifyClient}
                    onCheckedChange={(checked) => setFormData({ ...formData, notifyClient: checked === true })}
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <Label htmlFor="notifyClient" className="cursor-pointer font-medium text-gray-900 text-sm">
                      {t("notifyClientLabel")}
                    </Label>
                    <p className="text-xs text-gray-600 mt-0.5">
                      {formData.clientId && formData.clientId !== "none" 
                        ? t("notifyClientEnabledDesc")
                        : t("notifyClientSelectFirst")}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-900">{t("advanceNotificationLabel")}</Label>
                  <div className="flex items-center gap-3">
                    <Input
                      type="number"
                      min="0"
                      value={formData.advanceNotificationDays}
                      onChange={(e) => setFormData({ ...formData, advanceNotificationDays: e.target.value })}
                      placeholder="0"
                      className="h-9 sm:h-10 w-24"
                    />
                    <span className="text-sm text-gray-700">{t("daysBeforeDue")}</span>
                  </div>
                  <p className="text-xs text-gray-500">{t("advanceNotificationHint")}</p>
                </div>

                {formData.notifyUser && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-900">{t("customUserNotificationMsg")}</Label>
                    <Textarea
                      value={formData.userNotificationMessage}
                      onChange={(e) => setFormData({ ...formData, userNotificationMessage: e.target.value })}
                      placeholder={t("customUserNotificationPh")}
                      rows={3}
                    />
                    <p className="text-xs text-gray-500">{t("customUserNotificationHint")}</p>
                  </div>
                )}

                {formData.notifyClient && formData.clientId && formData.clientId !== "none" && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-900">{t("customClientNotificationMsg")}</Label>
                    <Textarea
                      value={formData.clientNotificationMessage}
                      onChange={(e) => setFormData({ ...formData, clientNotificationMessage: e.target.value })}
                      placeholder={t("customClientNotificationPh")}
                      rows={3}
                    />
                    <p className="text-xs text-gray-500">{t("customClientNotificationHint")}</p>
                  </div>
                )}
              </div>
            </div>
            )}
          </div>
          
          <DialogFooter className="border-t border-gray-200 pt-4 gap-2">
            <Button 
              variant="cancel" 
              onClick={() => {
                setIsModalOpen(false);
                setEditingSchedule(null);
                setCurrentStep(1); // Reset step
                setFormData({
                  title: "",
                  description: "",
                  clientId: "",
                  clientName: "",
                  clientEmail: "",
                  clientPhone: "",
                  clientBusinessType: "",
                  clientType: "other",
                  dueDate: "",
                  frequency: "once",
                  automationType: "payment_reminder",
                  amount: "",
                  notifyUser: true,
                  notifyClient: true,
                  userNotificationMessage: "",
                  clientNotificationMessage: "",
                  advanceNotificationDays: "0",
                  repeatUntil: "",
                });
              }}
              className="text-sm sm:text-base px-3 sm:px-4"
            >
              {t("cancel")}
            </Button>
            
            <div className="flex gap-2 flex-col sm:flex-row">
              {currentStep > 1 && (
                <Button 
                  variant="outline" 
                  onClick={prevStep}
                  className="border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-700 text-sm sm:text-base px-3 sm:px-4 order-2 sm:order-1"
                >
                  <ChevronLeft size={14} className="sm:w-4 sm:h-4 mr-1" />
                  {t("previous")}
                </Button>
              )}
              
              {currentStep < totalSteps ? (
                <Button 
                  onClick={nextStep} 
                  className="bg-sky-400 text-white hover:bg-sky-500 border border-sky-400 px-4 sm:px-6 text-sm sm:text-base order-1 sm:order-2 flex-1 sm:flex-initial"
                >
                  {t("next")}
                  <ChevronRight size={14} className="sm:w-4 sm:h-4 ml-1" />
                </Button>
              ) : (
            <Button 
              onClick={handleSave} 
                  className="bg-sky-400 text-white hover:bg-sky-500 border border-sky-400 px-4 sm:px-6 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base order-1 sm:order-2 flex-1 sm:flex-initial"
                  disabled={!formData.clientName.trim() || !formData.clientEmail.trim() || !formData.clientBusinessType.trim()}
            >
              {editingSchedule ? t("updateScheduleBtn") : t("createScheduleBtn")}
            </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Client Modal (inline from schedules) */}
      <Dialog open={isClientModalOpen} onOpenChange={setIsClientModalOpen}>
        <DialogContent className="lg:bg-white bg-white/80 backdrop-blur-sm max-w-3xl max-h-[95vh] overflow-y-auto">
          <DialogHeader className="space-y-1 border-b border-gray-200 pb-4">
            <DialogTitle className="text-base sm:text-lg font-semibold text-gray-900">
              {editingClient ? t("editClientFromSchedules") : t("createClientModal")}
            </DialogTitle>
            <p className="text-sm text-gray-600 mt-1">
              {editingClient ? t("editClientFromSchedulesDesc") : t("createClientFromSchedulesDesc")}
            </p>
          </DialogHeader>

          <div className="py-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-900">
                  {t("clientNameLabel")} <span className="text-red-600">*</span>
                </Label>
                <Input
                  value={clientForm.name}
                  onChange={(e) => setClientForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder={t("enterClientName")}
                  className="h-9 sm:h-10"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-900">
                  {t("businessTypeWhatTheyDo")} <span className="text-red-600">*</span>
                </Label>
                <Input
                  value={clientForm.businessType}
                  onChange={(e) => setClientForm((p) => ({ ...p, businessType: e.target.value }))}
                  placeholder={t("businessTypePhSchedule")}
                  className="h-9 sm:h-10"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-900">
                  Email <span className="text-red-600">*</span>
                </Label>
                <Input
                  type="email"
                  value={clientForm.email}
                  onChange={(e) => setClientForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder="client@example.com"
                  className="h-9 sm:h-10"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-900">Phone</Label>
                <Input
                  type="tel"
                  value={clientForm.phone}
                  onChange={(e) => setClientForm((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="+250 7xx xxx xxx"
                  className="h-9 sm:h-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-900">{t("clientTypeRelationship")}</Label>
              <Select
                value={clientForm.clientType}
                onValueChange={(value: any) => setClientForm((p) => ({ ...p, clientType: value }))}
              >
                <SelectTrigger className="h-9 sm:h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="debtor">{t("clientTypeDebtorShort")}</SelectItem>
                  <SelectItem value="worker">{t("clientTypeWorkerShort")}</SelectItem>
                  <SelectItem value="other">{t("clientTypeOther")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-900">{t("note")}</Label>
              <Textarea
                value={clientForm.notes}
                onChange={(e) => setClientForm((p) => ({ ...p, notes: e.target.value }))}
                placeholder={t("optionalNotesClient")}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="border-t border-gray-200 pt-4 gap-2">
            <Button
              variant="cancel"
              onClick={() => {
                setIsClientModalOpen(false);
                setEditingClient(null);
                setClientForm({
                  name: "",
                  email: "",
                  phone: "",
                  businessType: "",
                  clientType: "other",
                  notes: "",
                });
              }}
              disabled={isCreatingClient}
            >
              {t("cancel")}
            </Button>
            <Button
              onClick={handleCreateClient}
              className="bg-sky-400 text-white hover:bg-sky-500 border border-sky-400 px-6"
              disabled={isCreatingClient}
            >
              {isCreatingClient 
                ? (editingClient ? t("updating") : t("creating")) 
                : (editingClient ? t("updateClientBtn") : t("createClientModal"))}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Complete Confirmation Dialog */}
      <AlertDialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <CheckCircle2 size={20} className="text-green-600" />
              {t("completeScheduleTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("completeScheduleDesc").replace("{title}", scheduleToComplete?.title ?? "")}
              {scheduleToComplete?.frequency !== "once" && t("completeScheduleRecurringNote")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="py-4 space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="send-completion-email"
                checked={sendCompletionEmail}
                onCheckedChange={(checked) => setSendCompletionEmail(checked === true)}
              />
              <Label htmlFor="send-completion-email" className="text-sm font-normal cursor-pointer">
                {t("sendCompletionNotification")}
              </Label>
            </div>
            
            {sendCompletionEmail && (
              <div className="space-y-2">
                <Label htmlFor="completion-message" className="text-sm font-medium">
                  {t("completionMessageOptional")}
                </Label>
                <Textarea
                  id="completion-message"
                  value={completionMessage}
                  onChange={(e) => setCompletionMessage(e.target.value)}
                  placeholder={t("completionMessagePh")}
                  className="min-h-[100px]"
                  rows={4}
                />
                <p className="text-xs text-gray-500">
                  {t("completionMessageHint")}
                </p>
              </div>
            )}
          </div>
          
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setScheduleToComplete(null);
              setCompletionMessage("");
              setSendCompletionEmail(false);
            }}>
              {t("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCompleteConfirm}
              className="bg-green-600 text-white hover:bg-green-700"
            >
              {t("markComplete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Schedule Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 size={20} className="text-red-600" />
              {t("deleteScheduleTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteScheduleConfirm").replace("{title}", scheduleToDelete?.title ?? "")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setScheduleToDelete(null)}>
              {t("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {t("deleteScheduleBtn")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Client Confirmation Dialog */}
      <AlertDialog open={deleteClientDialogOpen} onOpenChange={setDeleteClientDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 size={20} className="text-red-600" />
              {t("deleteClientModal")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteClientFromSchedulesConfirm").replace("{name}", clientToDelete?.name ?? "")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setClientToDelete(null)}>
              {t("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteClientConfirm}
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

export default Schedules;
