import { useState, useEffect, useMemo, useCallback } from "react";
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
import { 
  Plus, 
  Search, 
  Pencil, 
  Trash2, 
  Calendar as CalendarIcon, 
  CheckCircle2, 
  Mail,
  Clock, 
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
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { scheduleApi, clientApi } from "@/lib/api";

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
        title: "Error",
        description: "Failed to load schedules. Please try again.",
        variant: "destructive",
      });
    },
  });

  const [clients, setClients] = useState<Client[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [frequencyFilter, setFrequencyFilter] = useState<string>("all");
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
    amount: "",
    notifyUser: true,
    notifyClient: false,
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
        title: "Error",
        description: error?.message || "Failed to load clients from database.",
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
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((c) => {
        const clientId = ((c as any)._id || c.id)?.toString() || "";
        const clientMatches = 
          c.name.toLowerCase().includes(query) ||
          c.email?.toLowerCase().includes(query) ||
          c.businessType?.toLowerCase().includes(query) ||
          c.phone?.toLowerCase().includes(query);
        
        // Also check if any schedule for this client matches
        const clientSchedules = getSchedulesForClient(clientId);
        const scheduleMatches = clientSchedules.some((s) =>
          s.title.toLowerCase().includes(query) ||
          s.description?.toLowerCase().includes(query)
      );
    
        return clientMatches || scheduleMatches;
      });
    }

    // Filter by client
    if (clientFilter !== "all") {
      filtered = filtered.filter((c) => {
        const clientId = ((c as any)._id || c.id)?.toString();
        return clientId === clientFilter;
      });
    }
    
    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [clients, searchQuery, clientFilter, getSchedulesForClient]);


  const getClientName = (clientId?: string | Client) => {
    if (!clientId) return "No Client";
    if (typeof clientId === "object") return clientId.name;
    const client = clients.find((c) => (c._id || c.id) === clientId);
    return client?.name || "Unknown Client";
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
        toast({ title: "Client Updated", description: "Client has been updated successfully." });
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
          title: "Update Client Failed",
          description: e?.response?.error || e?.message || "Failed to update client. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsCreatingClient(false);
      }
      return;
    }
    
    // Handle create (existing code)
    if (!clientForm.name.trim()) {
      toast({ title: "Validation Error", description: "Client name is required.", variant: "destructive" });
      return;
    }
    if (!clientForm.email.trim()) {
      toast({ title: "Validation Error", description: "Client email is required.", variant: "destructive" });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientForm.email.trim())) {
      toast({ title: "Validation Error", description: "Please enter a valid email address.", variant: "destructive" });
      return;
    }
    if (!clientForm.businessType.trim()) {
      toast({ title: "Validation Error", description: "Business type is required.", variant: "destructive" });
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
      toast({ title: "Client Created", description: "Client has been created and selected." });
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
        title: "Create Client Failed",
        description: e?.response?.error || e?.message || "Failed to create client. Please try again.",
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
      amount: "",
      notifyUser: true,
      notifyClient: false,
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
        title: "Invalid Schedule",
        description: "This schedule has no assigned client. Please assign a client to continue.",
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
          title: "Validation Error",
          description: "Schedule title is required.",
          variant: "destructive",
        });
        return;
      }
      if (!formData.dueDate) {
        playErrorBeep();
        toast({
          title: "Validation Error",
          description: "Due date is required.",
          variant: "destructive",
        });
        return;
      }
    } else if (currentStep === 2) {
      // Validate Client Details
      if (!formData.clientName.trim()) {
        playErrorBeep();
        toast({
          title: "Validation Error",
          description: "Client name is required.",
          variant: "destructive",
        });
        return;
      }
      if (!formData.clientEmail.trim()) {
        playErrorBeep();
        toast({
          title: "Validation Error",
          description: "Client email is required.",
          variant: "destructive",
        });
        return;
      }
      if (!formData.clientBusinessType.trim()) {
        playErrorBeep();
        toast({
          title: "Validation Error",
          description: "Business type is required.",
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
        title: "Validation Error",
        description: "Schedule title is required.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.dueDate) {
      playErrorBeep();
      toast({
        title: "Validation Error",
        description: "Due date is required.",
        variant: "destructive",
      });
      return;
    }

    // Validate client information
    if (!formData.clientName.trim()) {
      playErrorBeep();
      toast({
        title: "Validation Error",
        description: "Client name is required.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.clientEmail.trim()) {
      playErrorBeep();
      toast({
        title: "Validation Error",
        description: "Client email is required.",
        variant: "destructive",
      });
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.clientEmail.trim())) {
      playErrorBeep();
      toast({
        title: "Validation Error",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.clientBusinessType.trim()) {
      playErrorBeep();
      toast({
        title: "Validation Error",
        description: "Business type is required.",
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
              title: "Client Creation Failed",
              description: clientError?.response?.error || clientError?.message || "Failed to create client. Please try again.",
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
        await refreshSchedules();
        playUpdateBeep();
        toast({
          title: "Schedule Updated",
          description: "Schedule and client information have been updated successfully.",
        });
      } else {
        await addSchedule(scheduleData);
        await refreshSchedules();
        playUpdateBeep();
        toast({
          title: "Schedule Created",
          description: "Schedule has been created successfully.",
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
        amount: "",
        notifyUser: true,
        notifyClient: false,
        userNotificationMessage: "",
        clientNotificationMessage: "",
        advanceNotificationDays: "0",
        repeatUntil: "",
      });
    } catch (error) {
      playErrorBeep();
      toast({
        title: editingSchedule ? "Update Failed" : "Create Failed",
        description: `Failed to ${editingSchedule ? "update" : "create"} schedule. Please try again.`,
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
        title: "Schedule Completed",
        description: sendCompletionEmail
          ? "Schedule has been marked as completed and notification sent." 
          : "Schedule has been marked as completed.",
      });
      setCompleteDialogOpen(false);
      setScheduleToComplete(null);
      setCompletionMessage("");
      setSendCompletionEmail(false);
    } catch (error) {
      playErrorBeep();
      toast({
        title: "Error",
        description: "Failed to complete schedule. Please try again.",
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
    
    try {
      await removeSchedule(scheduleToDelete);
      await refreshSchedules();
      playDeleteBeep();
      toast({
        title: "Schedule Deleted",
        description: "Schedule has been deleted successfully.",
      });
      setDeleteDialogOpen(false);
      setScheduleToDelete(null);
    } catch (error) {
      playErrorBeep();
      toast({
        title: "Delete Failed",
        description: "Failed to delete schedule. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteClientConfirm = async () => {
    if (!clientToDelete) return;
    
    try {
      const clientId = (clientToDelete as any)._id || clientToDelete.id;
      const clientIdStr = clientId?.toString() || "";
      const clientSchedules = getSchedulesForClient(clientIdStr);
      
      // Check if client has schedules
      if (clientSchedules.length > 0) {
        playErrorBeep();
        toast({
          title: "Cannot Delete Client",
          description: `This client has ${clientSchedules.length} schedule(s) assigned. Please delete or reassign the schedules first.`,
          variant: "destructive",
        });
        setDeleteClientDialogOpen(false);
        setClientToDelete(null);
        return;
      }

      await clientApi.delete(clientIdStr);
      await loadClients();
      playDeleteBeep();
      toast({
        title: "Client Deleted",
        description: "Client has been deleted successfully.",
      });
      setDeleteClientDialogOpen(false);
      setClientToDelete(null);
    } catch (error: any) {
      playErrorBeep();
      toast({
        title: "Delete Failed",
        description: error?.response?.error || error?.message || "Failed to delete client. Please try again.",
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

  // Flat filtered schedule list for card grid
  const filteredSchedules = useMemo(() => {
    let list = [...schedules];

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((s) => {
        const clientName = getClientName(s.clientId).toLowerCase();
        return (
          s.title.toLowerCase().includes(q) ||
          s.description?.toLowerCase().includes(q) ||
          clientName.includes(q)
        );
      });
    }

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
  }, [schedules, searchQuery, statusFilter, dateFilter, frequencyFilter, clientFilter]);

  // Stats
  const activeCount = schedules.filter((s) => s.status === "pending").length;
  const completedCount = schedules.filter((s) => s.status === "completed").length;
  const overdueCount = overdueSchedules.length;

  // Skeleton
  const SchedulesSkeleton = () => (
    <AppLayout title="Email Automations">
      <div className="flex flex-col gap-4 pb-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div><Skeleton className="h-7 w-48 mb-1" /><Skeleton className="h-4 w-64" /></div>
          <Skeleton className="h-10 w-40 rounded-lg" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[1,2,3].map(i=>(<div key={i} className="bg-white border border-gray-200 rounded-xl p-4"><Skeleton className="h-4 w-16 mb-2" /><Skeleton className="h-7 w-10" /></div>))}
        </div>
        <Skeleton className="h-10 w-full rounded-lg" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1,2,3,4].map(i=>(<div key={i} className="bg-white border border-gray-200 rounded-xl p-5"><Skeleton className="h-5 w-40 mb-3" /><Skeleton className="h-4 w-56 mb-4" /><div className="flex gap-2"><Skeleton className="h-6 w-16 rounded-full" /><Skeleton className="h-6 w-20 rounded-full" /></div></div>))}
        </div>
      </div>
    </AppLayout>
  );

  if (isLoading) {
    return <SchedulesSkeleton />;
  }

  return (
    <AppLayout title="Email Automations">
      <div className="flex flex-col gap-4 pb-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Mail size={22} className="text-blue-600" />
              Email Automations
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">Schedule automated email reminders for clients and yourself</p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button onClick={openClientCreateModal} variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-50 gap-2 flex-1 sm:flex-initial">
              <UserPlus size={16} /> Client
            </Button>
            <Button onClick={openAddModal} className="bg-blue-600 text-white hover:bg-blue-700 gap-2 flex-1 sm:flex-initial">
              <Plus size={16} /> New Automation
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3">
          <button onClick={() => setStatusFilter(statusFilter === "pending" ? "all" : "pending")} className={cn("text-left rounded-xl border p-3 sm:p-4 transition-all", statusFilter === "pending" ? "bg-blue-50 border-blue-300 ring-1 ring-blue-300" : "bg-white border-gray-200 hover:border-blue-200")}>
            <div className="text-xs font-medium text-gray-500 mb-1">Active</div>
            <div className="text-xl sm:text-2xl font-bold text-blue-700">{activeCount}</div>
          </button>
          <button onClick={() => setStatusFilter(statusFilter === "completed" ? "all" : "completed")} className={cn("text-left rounded-xl border p-3 sm:p-4 transition-all", statusFilter === "completed" ? "bg-green-50 border-green-300 ring-1 ring-green-300" : "bg-white border-gray-200 hover:border-green-200")}>
            <div className="text-xs font-medium text-gray-500 mb-1">Completed</div>
            <div className="text-xl sm:text-2xl font-bold text-green-700">{completedCount}</div>
          </button>
          <button onClick={() => setDateFilter(dateFilter === "overdue" ? "all" : "overdue")} className={cn("text-left rounded-xl border p-3 sm:p-4 transition-all", dateFilter === "overdue" ? "bg-red-50 border-red-300 ring-1 ring-red-300" : "bg-white border-gray-200 hover:border-red-200")}>
            <div className="text-xs font-medium text-gray-500 mb-1">Overdue</div>
            <div className={cn("text-xl sm:text-2xl font-bold", overdueCount > 0 ? "text-red-600" : "text-gray-400")}>{overdueCount}</div>
          </button>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col gap-3">
          {/* Search Bar */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search automations or clients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-white border border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-blue-400 rounded-lg"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X size={16} />
                </button>
              )}
            </div>
            <Button onClick={() => setShowFilters(!showFilters)} variant="outline" className={cn("lg:hidden border-gray-200 px-3", showFilters && "bg-blue-50 border-blue-300 text-blue-700")}>
              <Filter size={16} />
            </Button>
          </div>

          {/* Mobile Filters */}
          {showFilters && (
            <div className="lg:hidden grid grid-cols-2 gap-2 p-3 bg-white border border-gray-200 rounded-lg">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="border-gray-200 rounded-lg h-9 text-sm"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="border-gray-200 rounded-lg h-9 text-sm"><SelectValue placeholder="Date" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Dates</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="thisWeek">This Week</SelectItem>
                  <SelectItem value="thisMonth">This Month</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                </SelectContent>
              </Select>
              <Select value={frequencyFilter} onValueChange={setFrequencyFilter}>
                <SelectTrigger className="border-gray-200 rounded-lg h-9 text-sm"><SelectValue placeholder="Frequency" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Frequency</SelectItem>
                  <SelectItem value="once">Once</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
              <Select value={clientFilter} onValueChange={setClientFilter}>
                <SelectTrigger className="border-gray-200 rounded-lg h-9 text-sm"><SelectValue placeholder="Client" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clients</SelectItem>
                  {clients.map((c) => { const cid = ((c as any)._id || c.id)?.toString(); return <SelectItem key={cid} value={cid}>{c.name}</SelectItem>; })}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Desktop Filters */}
          <div className="hidden lg:flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="border-gray-200 rounded-lg w-40 h-9 text-sm"><Filter size={14} className="mr-1.5 text-gray-400" /><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="border-gray-200 rounded-lg w-40 h-9 text-sm"><CalendarIcon size={14} className="mr-1.5 text-gray-400" /><SelectValue placeholder="Date" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Dates</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="thisWeek">This Week</SelectItem>
                <SelectItem value="thisMonth">This Month</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="upcoming">Upcoming</SelectItem>
              </SelectContent>
            </Select>
            <Select value={frequencyFilter} onValueChange={setFrequencyFilter}>
              <SelectTrigger className="border-gray-200 rounded-lg w-40 h-9 text-sm"><Repeat size={14} className="mr-1.5 text-gray-400" /><SelectValue placeholder="Frequency" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Frequency</SelectItem>
                <SelectItem value="once">Once</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
            <Select value={clientFilter} onValueChange={setClientFilter}>
              <SelectTrigger className="border-gray-200 rounded-lg w-44 h-9 text-sm"><User size={14} className="mr-1.5 text-gray-400" /><SelectValue placeholder="Client" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Clients</SelectItem>
                {clients.map((c) => { const cid = ((c as any)._id || c.id)?.toString(); return <SelectItem key={cid} value={cid}>{c.name}</SelectItem>; })}
              </SelectContent>
            </Select>
            {(statusFilter !== "all" || dateFilter !== "all" || frequencyFilter !== "all" || clientFilter !== "all") && (
              <button onClick={() => { setStatusFilter("all"); setDateFilter("all"); setFrequencyFilter("all"); setClientFilter("all"); }} className="text-xs text-blue-600 hover:text-blue-800 font-medium whitespace-nowrap">
                Clear filters
              </button>
            )}
          </div>
        </div>

        {/* Automation Cards Grid */}
        {filteredSchedules.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
            {filteredSchedules.map((schedule) => {
              const scheduleId = (schedule as any)._id || schedule.id;
              const overdue = isOverdue(schedule.dueDate) && schedule.status === "pending";
              const daysUntil = getDaysUntilDue(schedule.dueDate);
              const isToday = daysUntil === 0;
              const clientInfo = getClientInfo(schedule.clientId);
              const clientName = getClientName(schedule.clientId);
              const clientEmail = clientInfo?.email || "";
              const initial = clientName.charAt(0).toUpperCase();

              return (
                <div
                  key={scheduleId}
                  className={cn(
                    "bg-white rounded-xl border p-4 sm:p-5 transition-all hover:shadow-md group",
                    overdue ? "border-red-200 bg-red-50/30" :
                    schedule.status === "completed" ? "border-green-200 bg-green-50/20 opacity-75" :
                    "border-gray-200 hover:border-blue-200"
                  )}
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      {/* Avatar */}
                      <div className={cn(
                        "w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0",
                        overdue ? "bg-red-100 text-red-700" :
                        schedule.status === "completed" ? "bg-green-100 text-green-700" :
                        "bg-blue-100 text-blue-700"
                      )}>
                        {initial}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-gray-900 truncate">{schedule.title}</h3>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-xs text-gray-600 truncate">{clientName}</span>
                          {clientEmail && <span className="text-xs text-gray-400 truncate hidden sm:inline">• {clientEmail}</span>}
                        </div>
                      </div>
                    </div>
                    {/* Actions */}
                    <div className="flex items-center gap-0.5 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
                      {schedule.status === "pending" && (
                        <button onClick={() => handleCompleteClick(schedule)} className="p-1.5 text-green-600 rounded-lg hover:bg-green-50" title="Complete">
                          <CheckCircle2 size={15} />
                        </button>
                      )}
                      <button onClick={() => openEditModal(schedule)} className="p-1.5 text-gray-500 rounded-lg hover:bg-gray-100" title="Edit">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => handleDeleteClick(schedule)} className="p-1.5 text-gray-400 rounded-lg hover:bg-red-50 hover:text-red-600" title="Delete">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Description */}
                  {schedule.description && (
                    <p className="text-xs text-gray-500 mb-3 line-clamp-2">{schedule.description}</p>
                  )}

                  {/* Badges Row */}
                  <div className="flex flex-wrap items-center gap-1.5 mb-3">
                    {/* Status */}
                    <span className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold",
                      schedule.status === "completed" && "bg-green-100 text-green-700",
                      schedule.status === "pending" && !overdue && "bg-blue-100 text-blue-700",
                      schedule.status === "cancelled" && "bg-gray-100 text-gray-600",
                      overdue && "bg-red-100 text-red-700"
                    )}>
                      {overdue ? "Overdue" : schedule.status === "pending" ? "Active" : schedule.status}
                    </span>
                    {/* Frequency */}
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-50 text-purple-700">
                      <Repeat size={10} />
                      {schedule.frequency.charAt(0).toUpperCase() + schedule.frequency.slice(1)}
                    </span>
                    {/* Notification indicators */}
                    {schedule.notifyUser && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700">
                        <Bell size={10} /> You
                      </span>
                    )}
                    {schedule.notifyClient && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-cyan-50 text-cyan-700">
                        <Mail size={10} /> Client
                      </span>
                    )}
                  </div>

                  {/* Footer: Due Date & Amount */}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <div className="flex items-center gap-1.5">
                      <Clock size={13} className={cn(
                        overdue ? "text-red-500" : isToday ? "text-blue-500" : "text-gray-400"
                      )} />
                      <span className={cn(
                        "text-xs font-medium",
                        overdue ? "text-red-600" : isToday ? "text-blue-600" : "text-gray-600"
                      )}>
                        {overdue
                          ? `${Math.abs(daysUntil)}d overdue`
                          : isToday
                          ? "Due today"
                          : daysUntil === 1
                          ? "Due tomorrow"
                          : schedule.status === "completed"
                          ? new Date(schedule.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                          : `${daysUntil}d remaining`}
                      </span>
                      <span className="text-[10px] text-gray-400 hidden sm:inline">
                        {new Date(schedule.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                    {schedule.amount ? (
                      <span className="text-xs font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                        {schedule.amount.toLocaleString()} RWF
                      </span>
                    ) : null}
                  </div>

                  {/* Last notified */}
                  {(schedule as any).lastNotified && (
                    <div className="flex items-center gap-1.5 mt-2 text-[10px] text-green-600">
                      <Mail size={10} />
                      <span>Last sent: {new Date((schedule as any).lastNotified).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 sm:py-20 bg-white rounded-xl border border-dashed border-gray-200">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-50 flex items-center justify-center">
              <Mail size={28} className="text-blue-400" />
            </div>
            <p className="text-base font-semibold text-gray-700 mb-1">
              {searchQuery || statusFilter !== "all" || dateFilter !== "all" ? "No automations found" : "No automations yet"}
            </p>
            <p className="text-sm text-gray-500 mb-5 max-w-xs mx-auto">
              {searchQuery || statusFilter !== "all" || dateFilter !== "all"
                ? "Try adjusting your filters"
                : "Create your first email automation to start sending scheduled reminders"}
            </p>
            {!(searchQuery || statusFilter !== "all" || dateFilter !== "all") && (
              <Button onClick={openAddModal} className="bg-blue-600 text-white hover:bg-blue-700 gap-2">
                <Plus size={16} /> Create Automation
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={(open) => {
        setIsModalOpen(open);
        if (!open) {
          setCurrentStep(1); // Reset step when modal closes
        }
      }}>
        <DialogContent className="lg:bg-white bg-white/80 backdrop-blur-sm max-w-2xl w-[95vw] sm:w-full max-h-[90vh] sm:max-h-[85vh] overflow-y-auto mx-2 sm:mx-4">
          <DialogHeader className="border-b border-blue-200 pb-3 sm:pb-4">
            <DialogTitle className="text-lg sm:text-xl font-semibold text-blue-700">
              {editingSchedule ? "Edit Schedule" : "Create New Schedule"}
            </DialogTitle>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">
              {editingSchedule ? "Update schedule details and notification settings" : "Set up a payment reminder, worker payment schedule, or any recurring task"}
            </p>
            
            {/* Progress Indicator */}
            <div className="mt-3 sm:mt-4 flex items-center justify-between gap-1 sm:gap-2">
              {[1, 2, 3, 4].map((step) => (
                <div key={step} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div className={cn(
                      "w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-semibold",
                      currentStep >= step 
                        ? "bg-blue-600 text-white" 
                        : "bg-gray-200 text-gray-600"
                    )}>
                      {step}
                    </div>
                    <span className={cn(
                      "text-[10px] sm:text-xs mt-0.5 sm:mt-1 text-center",
                      currentStep >= step ? "text-blue-600 font-medium" : "text-gray-500"
                    )}>
                      {step === 1 && "Basic"}
                      {step === 2 && "Client"}
                      {step === 3 && "Freq"}
                      {step === 4 && "Notify"}
                    </span>
                  </div>
                  {step < 4 && (
                    <div className={cn(
                      "h-0.5 flex-1 mx-1 sm:mx-2",
                      currentStep > step ? "bg-blue-600" : "bg-gray-200"
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
              <div className="flex items-center gap-2 pb-2 border-b border-blue-200">
                <CalendarIcon size={16} className="sm:w-[18px] sm:h-[18px] text-blue-600" />
                <h3 className="text-sm sm:text-base font-semibold text-blue-700">Basic Information</h3>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-900">
                    Schedule Title <span className="text-red-600">*</span>
                  </Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Monthly Payment - Client X, Weekly Worker Payment"
                    className="lg:bg-white bg-white/80 backdrop-blur-sm border border-gray-300 text-gray-900 placeholder:text-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded h-10"
                  />
                  <p className="text-xs text-gray-500">A clear title helps you identify this schedule quickly</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-900">
                    Due Date & Time <span className="text-red-600">*</span>
                  </Label>
                  <Input
                    type="datetime-local"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="bg-white border border-gray-300 text-gray-900 focus:border-gray-500 rounded h-10"
                  />
                  <p className="text-xs text-gray-500">When this schedule is due</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-900">Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Add any additional details, notes, or context about this schedule..."
                  className="bg-white border border-gray-300 text-gray-900 placeholder:text-gray-500 focus:border-gray-500 rounded"
                  rows={3}
                />
                <p className="text-xs text-gray-500">Optional: Add context or important notes</p>
              </div>
            </div>
            )}

            {/* Step 2: Client & Amount Section */}
            {currentStep === 2 && (
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-blue-200">
                <User size={16} className="sm:w-[18px] sm:h-[18px] text-blue-600" />
                <h3 className="text-sm sm:text-base font-semibold text-blue-700">Client & Payment Details</h3>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-900">
                    Client Name <span className="text-red-600">*</span>
                  </Label>
                  <Input
                    value={formData.clientName}
                    onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                    placeholder="Enter client name"
                    className="lg:bg-white bg-white/80 backdrop-blur-sm border border-gray-300 text-gray-900 placeholder:text-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded h-10"
                  />
                  </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-900">
                    Email <span className="text-red-600">*</span>
                  </Label>
                  <Input
                    type="email"
                    value={formData.clientEmail}
                    onChange={(e) => setFormData({ ...formData, clientEmail: e.target.value })}
                    placeholder="client@example.com"
                    className="lg:bg-white bg-white/80 backdrop-blur-sm border border-gray-300 text-gray-900 placeholder:text-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded h-10"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-900">
                    Business Type <span className="text-red-600">*</span>
                  </Label>
                  <Input
                    value={formData.clientBusinessType}
                    onChange={(e) => setFormData({ ...formData, clientBusinessType: e.target.value })}
                    placeholder="e.g., Starlink Internet, Worker Payments"
                    className="lg:bg-white bg-white/80 backdrop-blur-sm border border-gray-300 text-gray-900 placeholder:text-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded h-10"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-900">Phone</Label>
                  <Input
                    type="tel"
                    value={formData.clientPhone}
                    onChange={(e) => setFormData({ ...formData, clientPhone: e.target.value })}
                    placeholder="+250 7xx xxx xxx"
                    className="lg:bg-white bg-white/80 backdrop-blur-sm border border-gray-300 text-gray-900 placeholder:text-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded h-10"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-900">Client Type</Label>
                  <Select
                    value={formData.clientType} 
                    onValueChange={(value: "debtor" | "worker" | "other") => setFormData({ ...formData, clientType: value })}
                  >
                    <SelectTrigger className="lg:bg-white bg-white/80 backdrop-blur-sm border border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="debtor">Debtor (owes money)</SelectItem>
                      <SelectItem value="worker">Worker (needs to be paid)</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-900">Amount (RWF)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="0"
                    className="lg:bg-white bg-white/80 backdrop-blur-sm border border-gray-300 text-gray-900 placeholder:text-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded h-10"
                  />
                  <p className="text-xs text-gray-500">Payment amount or reminder value (optional)</p>
                </div>
              </div>
            </div>
            )}

            {/* Step 3: Schedule Frequency Section */}
            {currentStep === 3 && (
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-blue-200">
                <Repeat size={16} className="sm:w-[18px] sm:h-[18px] text-blue-600" />
                <h3 className="text-sm sm:text-base font-semibold text-blue-700">Schedule Frequency</h3>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-900">Frequency</Label>
                  <Select value={formData.frequency} onValueChange={(value: any) => setFormData({ ...formData, frequency: value })}>
                    <SelectTrigger className="lg:bg-white bg-white/80 backdrop-blur-sm border border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="once">Once (One-time schedule)</SelectItem>
                      <SelectItem value="daily">Daily (Every day)</SelectItem>
                      <SelectItem value="weekly">Weekly (Every week)</SelectItem>
                      <SelectItem value="monthly">Monthly (Every month)</SelectItem>
                      <SelectItem value="yearly">Yearly (Every year)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500">
                    {formData.frequency === "once" && "This schedule will occur only once"}
                    {formData.frequency === "daily" && "This schedule will repeat every day"}
                    {formData.frequency === "weekly" && "This schedule will repeat every week"}
                    {formData.frequency === "monthly" && "This schedule will repeat every month"}
                    {formData.frequency === "yearly" && "This schedule will repeat every year"}
                  </p>
                </div>

                {formData.frequency !== "once" && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-900">Repeat Until</Label>
                    <Input
                      type="date"
                      value={formData.repeatUntil}
                      onChange={(e) => setFormData({ ...formData, repeatUntil: e.target.value })}
                      className="bg-white border border-gray-300 text-gray-900 focus:border-gray-500 rounded h-10"
                    />
                    <p className="text-xs text-gray-500">Stop repeating after this date (optional)</p>
                  </div>
                )}
                </div>
              </div>
            )}

            {/* Step 4: Notification Settings Section */}
            {currentStep === 4 && (
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-blue-200">
                <Bell size={16} className="sm:w-[18px] sm:h-[18px] text-blue-600" />
                <h3 className="text-sm sm:text-base font-semibold text-blue-700">Notification Settings</h3>
              </div>
              
              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-start space-x-2 sm:space-x-3 p-2.5 sm:p-3 bg-blue-50 border border-blue-200 rounded">
                  <Checkbox
                    id="notifyUser"
                    checked={formData.notifyUser}
                    onCheckedChange={(checked) => setFormData({ ...formData, notifyUser: checked === true })}
                    className="mt-0.5 border-blue-400 hover:border-blue-600 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 focus-visible:ring-blue-400"
                  />
                  <div className="flex-1">
                    <Label htmlFor="notifyUser" className="cursor-pointer font-medium text-gray-900 text-sm">
                      Notify me (user)
                    </Label>
                    <p className="text-xs text-gray-600 mt-0.5">You will receive email notifications for this schedule</p>
                  </div>
                </div>

                <div className="flex items-start space-x-2 sm:space-x-3 p-2.5 sm:p-3 bg-blue-50 border border-blue-200 rounded">
                  <Checkbox
                    id="notifyClient"
                    checked={formData.notifyClient}
                    onCheckedChange={(checked) => setFormData({ ...formData, notifyClient: checked === true })}
                    className="mt-0.5 border-blue-400 hover:border-blue-600 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 focus-visible:ring-blue-400"
                  />
                  <div className="flex-1">
                    <Label htmlFor="notifyClient" className="cursor-pointer font-medium text-gray-900 text-sm">
                      Notify client
                    </Label>
                    <p className="text-xs text-gray-600 mt-0.5">
                      {formData.clientId && formData.clientId !== "none" 
                        ? "Client will receive email notifications (requires client email)"
                        : "Select a client first to enable client notifications"}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-900">Advance Notification</Label>
                  <div className="flex items-center gap-3">
                    <Input
                      type="number"
                      min="0"
                      value={formData.advanceNotificationDays}
                      onChange={(e) => setFormData({ ...formData, advanceNotificationDays: e.target.value })}
                      placeholder="0"
                      className="bg-white border border-gray-300 text-gray-900 focus:border-gray-500 rounded h-10 w-24"
                    />
                    <span className="text-sm text-gray-700">days before due date</span>
                  </div>
                  <p className="text-xs text-gray-500">Send notifications this many days before the schedule is due</p>
                </div>

                {formData.notifyUser && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-900">Custom User Notification Message</Label>
                    <Textarea
                      value={formData.userNotificationMessage}
                      onChange={(e) => setFormData({ ...formData, userNotificationMessage: e.target.value })}
                      placeholder="Leave empty to use default message, or customize your notification..."
                      className="lg:bg-white bg-white/80 backdrop-blur-sm border border-gray-300 text-gray-900 placeholder:text-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded"
                      rows={3}
                    />
                    <p className="text-xs text-gray-500">Optional: Customize the message you'll receive</p>
                  </div>
                )}

                {formData.notifyClient && formData.clientId && formData.clientId !== "none" && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-900">Custom Client Notification Message</Label>
                    <Textarea
                      value={formData.clientNotificationMessage}
                      onChange={(e) => setFormData({ ...formData, clientNotificationMessage: e.target.value })}
                      placeholder="Leave empty to use default message, or customize the client notification..."
                      className="lg:bg-white bg-white/80 backdrop-blur-sm border border-gray-300 text-gray-900 placeholder:text-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded"
                      rows={3}
                    />
                    <p className="text-xs text-gray-500">Optional: Customize the message the client will receive</p>
                  </div>
                )}
              </div>
            </div>
            )}
          </div>
          
          <DialogFooter className="border-t border-blue-200 pt-4 gap-2">
            <Button 
              variant="outline" 
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
                  amount: "",
                  notifyUser: true,
                  notifyClient: false,
                  userNotificationMessage: "",
                  clientNotificationMessage: "",
                  advanceNotificationDays: "0",
                  repeatUntil: "",
                });
              }}
              className="border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-700 text-sm sm:text-base px-3 sm:px-4"
            >
              Cancel
            </Button>
            
            <div className="flex gap-2 flex-col sm:flex-row">
              {currentStep > 1 && (
                <Button 
                  variant="outline" 
                  onClick={prevStep}
                  className="border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-700 text-sm sm:text-base px-3 sm:px-4 order-2 sm:order-1"
                >
                  <ChevronLeft size={14} className="sm:w-4 sm:h-4 mr-1" />
                  Previous
                </Button>
              )}
              
              {currentStep < totalSteps ? (
                <Button 
                  onClick={nextStep} 
                  className="bg-blue-600 text-white hover:bg-blue-700 px-4 sm:px-6 text-sm sm:text-base order-1 sm:order-2 flex-1 sm:flex-initial"
                >
                  Next
                  <ChevronRight size={14} className="sm:w-4 sm:h-4 ml-1" />
                </Button>
              ) : (
            <Button 
              onClick={handleSave} 
                  className="bg-blue-600 text-white hover:bg-blue-700 px-4 sm:px-6 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base order-1 sm:order-2 flex-1 sm:flex-initial"
                  disabled={!formData.clientName.trim() || !formData.clientEmail.trim() || !formData.clientBusinessType.trim()}
            >
              {editingSchedule ? "Update Schedule" : "Create Schedule"}
            </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Client Modal (inline from schedules) */}
      <Dialog open={isClientModalOpen} onOpenChange={setIsClientModalOpen}>
        <DialogContent className="lg:bg-white bg-white/80 backdrop-blur-sm max-w-3xl max-h-[95vh] overflow-y-auto">
          <DialogHeader className="border-b border-blue-200 pb-4">
            <DialogTitle className="text-xl font-semibold text-blue-700">
              {editingClient ? "Edit Client" : "Create Client"}
            </DialogTitle>
            <p className="text-sm text-gray-600 mt-1">
              {editingClient ? "Update client information" : "Add a client now, then link schedules to them."}
            </p>
          </DialogHeader>

          <div className="py-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-900">
                  Client Name <span className="text-red-600">*</span>
                </Label>
                <Input
                  value={clientForm.name}
                  onChange={(e) => setClientForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Enter client name"
                  className="bg-white border border-gray-300 text-gray-900 placeholder:text-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded h-10"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-900">
                  Business Type / What They Do <span className="text-red-600">*</span>
                </Label>
                <Input
                  value={clientForm.businessType}
                  onChange={(e) => setClientForm((p) => ({ ...p, businessType: e.target.value }))}
                  placeholder="e.g., Starlink Internet, Worker Payments, Subscription"
                  className="bg-white border border-gray-300 text-gray-900 placeholder:text-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded h-10"
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
                  className="bg-white border border-gray-300 text-gray-900 placeholder:text-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded h-10"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-900">Phone</Label>
                <Input
                  type="tel"
                  value={clientForm.phone}
                  onChange={(e) => setClientForm((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="+250 7xx xxx xxx"
                  className="bg-white border border-gray-300 text-gray-900 placeholder:text-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded h-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-900">Client Type</Label>
              <Select
                value={clientForm.clientType}
                onValueChange={(value: any) => setClientForm((p) => ({ ...p, clientType: value }))}
              >
                <SelectTrigger className="bg-white border border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="debtor">Debtor (owes money)</SelectItem>
                  <SelectItem value="worker">Worker (needs to be paid)</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-900">Notes</Label>
              <Textarea
                value={clientForm.notes}
                onChange={(e) => setClientForm((p) => ({ ...p, notes: e.target.value }))}
                placeholder="Optional notes about this client..."
                className="bg-white border border-gray-300 text-gray-900 placeholder:text-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="border-t border-blue-200 pt-4 gap-2">
            <Button
              variant="outline"
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
              className="border-gray-300 text-gray-700 hover:bg-gray-50"
              disabled={isCreatingClient}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateClient}
              className="bg-blue-600 text-white hover:bg-blue-700 px-6"
              disabled={isCreatingClient}
            >
              {isCreatingClient 
                ? (editingClient ? "Updating..." : "Creating...") 
                : (editingClient ? "Update Client" : "Create Client")}
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
              Complete Schedule
            </AlertDialogTitle>
            <AlertDialogDescription>
              Mark <strong>{scheduleToComplete?.title}</strong> as completed?
              {scheduleToComplete?.frequency !== "once" && " A new schedule will be created for the next occurrence."}
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
                Send completion notification to client/user
              </Label>
            </div>
            
            {sendCompletionEmail && (
              <div className="space-y-2">
                <Label htmlFor="completion-message" className="text-sm font-medium">
                  Completion Message (Optional)
                </Label>
                <Textarea
                  id="completion-message"
                  value={completionMessage}
                  onChange={(e) => setCompletionMessage(e.target.value)}
                  placeholder="Add a message to notify the client/user about this completion..."
                  className="min-h-[100px]"
                  rows={4}
                />
                <p className="text-xs text-gray-500">
                  This message will be sent via email to the client and/or user if notifications are enabled.
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
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCompleteConfirm}
              className="bg-green-600 text-white hover:bg-green-700"
            >
              Mark Complete
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
              Delete Schedule
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{scheduleToDelete?.title}</strong>? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setScheduleToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Delete Schedule
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
              Delete Client
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{clientToDelete?.name}</strong>? 
              This action cannot be undone. If this client has schedules assigned, you must delete those first.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setClientToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteClientConfirm}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Delete Client
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
};

export default Schedules;
