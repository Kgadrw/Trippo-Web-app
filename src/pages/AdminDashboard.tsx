import { useState, useEffect, useRef } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Users,
  Package,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  Activity,
  Trash2,
  Mail,
  Bell,
  CheckCircle,
  MoreHorizontal,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { adminApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { UptimeTimeline } from "@/components/admin/UptimeTimeline";
import { AdminPaymentsPanel } from "@/components/admin/AdminPaymentsPanel";
import { AdminHomepagePanel } from "@/components/admin/AdminHomepagePanel";
import { AdminSettingsPanel } from "@/components/admin/AdminSettingsPanel";
import { AdminPlatformHealthPanel } from "@/components/admin/AdminPlatformHealthPanel";
import { AdminPlatformTrafficChart } from "@/components/admin/AdminPlatformTrafficChart";
import { ADMIN_CARD_CLASS, ADMIN_INNER_SURFACE_CLASS, ADMIN_TITLE_CLASS } from "@/components/admin/adminStyles";
import { AddToHomeScreen } from "@/components/AddToHomeScreen";

interface SystemStats {
  totalUsers: number;
  totalProducts: number;
  totalSales: number;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  recentUsers: number;
  recentProducts: number;
  recentSales: number;
}

interface UserPaymentSummary {
  provider: string;
  lastStatus: string;
  lastAttemptAt: string;
  lastAmount: number;
  lastMsisdn?: string;
  successfulPayments: number;
  failedPayments: number;
  pendingPayments: number;
  totalPaidAmount: number;
}

interface UserSubscription {
  planName?: string;
  isOnTrial?: boolean;
  status?: string;
  nextDueDate?: string | null;
  lastPaidAt?: string | null;
  trialDaysLeft?: number;
  hasPlus?: boolean;
  requiresPayment?: boolean;
}

interface User {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  businessName?: string;
  createdAt: string;
  productCount: number;
  saleCount: number;
  totalRevenue: number;
  totalProfit: number;
  /** When false, account is disabled and should not be able to sign in. Omitted/true = active. */
  isActive?: boolean;
  paymentPlan?: {
    active?: boolean;
    amount?: number;
    currency?: string;
    intervalMonths?: number;
    startDate?: string;
    nextDueDate?: string;
    lastPaidAt?: string;
    status?: string;
  };
  subscription?: UserSubscription;
  paymentSummary?: UserPaymentSummary | null;
}

type UserPaymentFilter = "all" | "paid" | "failed" | "trial" | "none";

interface ActivityData {
  products: any[];
  sales: any[];
  users: any[];
}

interface UserUsage {
  userId: string;
  name: string;
  email: string | null;
  businessName: string | null;
  joinedDate: string;
  totalProducts: number;
  recentProducts: number;
  totalSales: number;
  recentSales: number;
  totalRevenue: number;
  totalProfit: number;
  lastProductDate: string | null;
  lastSaleDate: string | null;
  activityScore: number;
  avgSalesPerDay: number;
  isActive: boolean;
}

interface UsageSummary {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  totalProductsCreated: number;
  totalSalesMade: number;
  avgProductsPerUser: string;
  avgSalesPerUser: string;
}

interface SystemHealth {
  database: string;
  timestamp: string;
  uptime: number;
  serverStartTime?: string;
  memory: {
    used: number;
    total: number;
  };
  statusHistory?: Array<{
    status: 'up' | 'down';
    timestamp: string;
  }>;
  platform?: {
    status: 'healthy' | 'degraded' | 'critical';
    environment: string;
    nodeVersion: string;
    checks: Array<{
      id: string;
      label: string;
      status: 'ok' | 'warning' | 'error';
      detail: string;
    }>;
    payments: {
      failed24h: number;
      withSyncIssues: number;
      stuckPending: number;
    };
    api: {
      totalErrors24h: number;
      clientErrors24h: number;
      serverErrors24h: number;
      failingEndpoints: number;
      slowEndpoints: number;
    };
  };
}

interface ApiStats {
  totalRequests: number;
  recentRequests: number;
  dailyRequests: number;
  endpointStats: Array<{
    endpoint: string;
    count: number;
    avgResponseTime: number;
    errors: number;
  }>;
  hourlyRequests: Array<{
    hour: number;
    count: number;
    errors?: number;
    success?: number;
    timestamp: string;
    label: string;
  }>;
  statusCodeDistribution: Record<string, number>;
  avgResponseTime: number;
  errorSummary?: {
    totalErrors24h: number;
    clientErrors24h: number;
    serverErrors24h: number;
    failingEndpoints: number;
    slowEndpoints: number;
  };
  recentErrors?: Array<{
    id: string;
    method: string;
    path: string;
    endpoint: string;
    timestamp: string;
    statusCode: number;
    responseTime: number;
  }>;
  endpointHealth?: Array<{
    endpoint: string;
    count: number;
    avgResponseTime: number;
    errors: number;
    errorRate: number;
    isSlow: boolean;
    status: 'healthy' | 'degraded' | 'critical';
  }>;
  liveRequests: Array<{
    id: string;
    method: string;
    path: string;
    endpoint: string;
    timestamp: string;
    statusCode: number;
    responseTime: number;
  }>;
}

const AdminDashboard = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [activity, setActivity] = useState<ActivityData | null>(null);
  const [userUsage, setUserUsage] = useState<UserUsage[]>([]);
  const [usageSummary, setUsageSummary] = useState<UsageSummary | null>(null);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [apiStats, setApiStats] = useState<ApiStats | null>(null);
  const [healthRefreshing, setHealthRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "overview" | "users" | "activity" | "accounts" | "notifications" | "payments" | "homepage" | "settings"
  >("overview");
  const [togglingUserId, setTogglingUserId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [emailSubject, setEmailSubject] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isBulkEmailMode, setIsBulkEmailMode] = useState(false);

  const [notificationDialogOpen, setNotificationDialogOpen] = useState(false);
  const [notificationTitle, setNotificationTitle] = useState("");
  const [notificationBody, setNotificationBody] = useState("");
  const [notificationType, setNotificationType] = useState("general");
  const [isSendingNotification, setIsSendingNotification] = useState(false);
  const [isBulkNotificationMode, setIsBulkNotificationMode] = useState(false);

  const [notificationHistory, setNotificationHistory] = useState<any[]>([]);
  const [notificationHistoryLoading, setNotificationHistoryLoading] = useState(false);

  const [billingDialogOpen, setBillingDialogOpen] = useState(false);
  const [billingUser, setBillingUser] = useState<User | null>(null);
  const [billingAmount, setBillingAmount] = useState("10000");
  const [billingIntervalMonths, setBillingIntervalMonths] = useState("1");
  const [billingNextDueDate, setBillingNextDueDate] = useState("");
  const [billingStatus, setBillingStatus] = useState("active");
  const [billingActive, setBillingActive] = useState(true);
  const [isSavingBilling, setIsSavingBilling] = useState(false);
  const [userPaymentFilter, setUserPaymentFilter] = useState<UserPaymentFilter>("all");

  const openBilling = (u: User) => {
    setBillingUser(u);
    const plan = u.paymentPlan || {};
    setBillingAmount(String(plan.amount ?? 10000));
    setBillingIntervalMonths(String(plan.intervalMonths ?? 1));
    setBillingNextDueDate(plan.nextDueDate ? String(plan.nextDueDate).slice(0, 10) : "");
    setBillingStatus(String(plan.status ?? "active"));
    setBillingActive(plan.active ?? true);
    setBillingDialogOpen(true);
  };

  const saveBilling = async () => {
    if (!billingUser) return;
    setIsSavingBilling(true);
    try {
      await adminApi.updateUserPaymentPlan(billingUser._id, {
        active: billingActive,
        amount: Number(billingAmount),
        currency: "RWF",
        intervalMonths: Number(billingIntervalMonths),
        nextDueDate: billingNextDueDate ? new Date(billingNextDueDate + "T00:00:00").toISOString() : null,
        status: billingStatus,
      });
      toast({ title: "Saved", description: "Payment plan updated." });
      await loadDashboardData();
      setBillingDialogOpen(false);
    } catch (error: any) {
      toast({
        title: "Failed",
        description: error?.message || "Failed to update payment plan.",
        variant: "destructive",
      });
    } finally {
      setIsSavingBilling(false);
    }
  };

  const markPaid = async (u: User) => {
    try {
      await adminApi.markUserPaid(u._id);
      toast({ title: "Marked paid", description: `${u.name} marked as paid.` });
      await loadDashboardData();
    } catch (error: any) {
      toast({
        title: "Failed",
        description: error?.message || "Failed to mark as paid.",
        variant: "destructive",
      });
    }
  };

  const handleSetUserAccountActive = async (user: User, isActive: boolean) => {
    setTogglingUserId(user._id);
    try {
      await adminApi.setUserAccountStatus(user._id, isActive);
      setUsers((prev) => prev.map((u) => (u._id === user._id ? { ...u, isActive } : u)));
      toast({
        title: isActive ? "Account activated" : "Account deactivated",
        description: isActive
          ? `${user.name} can sign in again.`
          : `${user.name} cannot sign in until the account is activated again.`,
      });
    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error?.message || error?.response?.error || "Could not update account status.",
        variant: "destructive",
      });
    } finally {
      setTogglingUserId(null);
    }
  };

  const loadNotificationHistory = async () => {
    try {
      setNotificationHistoryLoading(true);
      const res = await adminApi.getNotificationHistory({ limit: 100, skip: 0, sentBy: "admin" });
      if (res.data && Array.isArray(res.data)) {
        setNotificationHistory(res.data);
      } else {
        setNotificationHistory([]);
      }
    } catch (error) {
      console.error("Error loading notification history:", error);
      setNotificationHistory([]);
    } finally {
      setNotificationHistoryLoading(false);
    }
  };

  const loadApiStats = async () => {
    try {
      const apiStatsRes = await adminApi.getApiStats();
      if (apiStatsRes.data) setApiStats(apiStatsRes.data);
    } catch (error) {
      console.error("Error loading API stats:", error);
    }
  };

  const loadHealthMonitoring = async () => {
    try {
      setHealthRefreshing(true);
      const [healthRes, apiStatsRes] = await Promise.all([
        adminApi.getSystemHealth(),
        adminApi.getApiStats(),
      ]);
      if (healthRes.data) setHealth(healthRes.data);
      if (apiStatsRes.data) setApiStats(apiStatsRes.data);
    } catch (error) {
      console.error("Error loading health monitoring:", error);
    } finally {
      setHealthRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
    // Refresh every 5 minutes (reduced frequency to avoid rate limits and unnecessary calls)
    const interval = setInterval(loadDashboardData, 5 * 60 * 1000);
    // Refresh API stats less frequently (every 2 minutes) to avoid rate limits
    const apiInterval = setInterval(() => {
      loadApiStats();
    }, 2 * 60 * 1000);
    return () => {
      clearInterval(interval);
      clearInterval(apiInterval);
    };
  }, []);

  useEffect(() => {
    if (activeTab === "notifications") {
      loadNotificationHistory();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== "overview") return;
    const interval = setInterval(loadHealthMonitoring, 30 * 1000);
    return () => clearInterval(interval);
  }, [activeTab]);

  // Track last load time to prevent excessive API calls
  const lastLoadTimeRef = useRef<number>(0);
  const MIN_LOAD_INTERVAL = 2 * 60 * 1000; // 2 minutes minimum between loads

  const loadDashboardData = async () => {
    const now = Date.now();
    const timeSinceLastLoad = now - lastLoadTimeRef.current;
    
    // Only load if enough time has passed
    if (timeSinceLastLoad < MIN_LOAD_INTERVAL && lastLoadTimeRef.current > 0) {
      console.log(`[AdminDashboard] Skipping load (only ${Math.round(timeSinceLastLoad / 1000)}s since last load)`);
      return;
    }
    
    try {
      setLoading(true);
      lastLoadTimeRef.current = now;
      
      // Load data in batches to avoid rate limiting
      const [statsRes, usersRes, activityRes, usageRes, healthRes] = await Promise.all([
        adminApi.getSystemStats(),
        adminApi.getAllUsers(),
        adminApi.getUserActivity(7),
        adminApi.getUserUsage(30),
        adminApi.getSystemHealth(),
      ]);

      if (statsRes.data) setStats(statsRes.data);
      if (usersRes.data) setUsers(usersRes.data);
      if (activityRes.data) setActivity(activityRes.data);
      if (usageRes.data) {
        setUserUsage(usageRes.data.users || []);
        setUsageSummary(usageRes.data.summary || null);
      }
      if (healthRes.data) setHealth(healthRes.data);
      
      // Load API stats separately to avoid rate limits
      try {
        const apiStatsRes = await adminApi.getApiStats();
      if (apiStatsRes.data) setApiStats(apiStatsRes.data);
      } catch (apiError) {
        // Silently fail for API stats - it's refreshed separately anyway
        console.error("Error loading API stats (non-critical):", apiError);
      }
    } catch (error: any) {
      console.error("Error loading admin dashboard:", error);
      // Only show toast for critical errors, not rate limit errors
      if (!error.message?.includes('Too many') && !error.message?.includes('429')) {
      toast({
        title: "Error",
        description: "Failed to load dashboard data. Please try again.",
        variant: "destructive",
      });
      }
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    // Format as Rwf (Rwandan Franc)
    // Rwf doesn't use decimal places, so format as whole number
    return `${amount.toLocaleString("en-US")} Rwf`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const matchesUserPaymentFilter = (user: User, filter: UserPaymentFilter) => {
    const summary = user.paymentSummary;
    const subscription = user.subscription;
    switch (filter) {
      case "paid":
        return (summary?.successfulPayments ?? 0) > 0;
      case "failed":
        return (summary?.failedPayments ?? 0) > 0;
      case "trial":
        return subscription?.isOnTrial === true;
      case "none":
        return (
          !summary ||
          (summary.successfulPayments === 0 &&
            summary.failedPayments === 0 &&
            summary.pendingPayments === 0)
        );
      default:
        return true;
    }
  };

  const filteredUsers = users.filter((user) => matchesUserPaymentFilter(user, userPaymentFilter));

  const paymentFilterCounts = {
    all: users.length,
    paid: users.filter((u) => matchesUserPaymentFilter(u, "paid")).length,
    failed: users.filter((u) => matchesUserPaymentFilter(u, "failed")).length,
    trial: users.filter((u) => matchesUserPaymentFilter(u, "trial")).length,
    none: users.filter((u) => matchesUserPaymentFilter(u, "none")).length,
  };

  const renderPlanBadge = (user: User) => {
    const sub = user.subscription;
    const status = sub?.status || user.paymentPlan?.status || "active";
    const styles: Record<string, string> = {
      trial: "bg-blue-100 text-blue-800",
      active: "bg-green-100 text-green-800",
      past_due: "bg-red-100 text-red-800",
      paused: "bg-gray-100 text-gray-800",
    };
    return (
      <div className="space-y-1">
        <span
          className={cn(
            "inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize",
            styles[status] || "bg-gray-100 text-gray-800"
          )}
        >
          {status.replace("_", " ")}
        </span>
        {sub?.isOnTrial && sub.trialDaysLeft !== undefined ? (
          <div className="text-xs text-muted-foreground">{sub.trialDaysLeft}d trial left</div>
        ) : null}
      </div>
    );
  };

  const renderPaymentApiBadges = (summary: UserPaymentSummary | null | undefined) => {
    if (
      !summary ||
      (summary.successfulPayments === 0 &&
        summary.failedPayments === 0 &&
        summary.pendingPayments === 0)
    ) {
      return <span className="text-xs text-muted-foreground">No API attempts</span>;
    }

    return (
      <div className="flex flex-wrap gap-1">
        {summary.successfulPayments > 0 ? (
          <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
            Paid ({summary.successfulPayments})
          </span>
        ) : null}
        {summary.failedPayments > 0 ? (
          <span className="inline-flex rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
            Failed ({summary.failedPayments})
          </span>
        ) : null}
        {summary.pendingPayments > 0 ? (
          <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
            Pending ({summary.pendingPayments})
          </span>
        ) : null}
      </div>
    );
  };

  const renderLastPaymentAttempt = (summary: UserPaymentSummary | null | undefined) => {
    if (!summary?.lastAttemptAt) {
      return <span className="text-xs text-muted-foreground">—</span>;
    }

    const statusStyles: Record<string, string> = {
      SUCCESSFUL: "bg-green-100 text-green-800",
      FAILED: "bg-red-100 text-red-800",
      PENDING: "bg-amber-100 text-amber-800",
    };

    return (
      <div className="space-y-1">
        <span
          className={cn(
            "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
            statusStyles[summary.lastStatus] || "bg-gray-100 text-gray-800"
          )}
        >
          {summary.lastStatus}
        </span>
        <div className="text-xs text-muted-foreground">{formatDate(summary.lastAttemptAt)}</div>
        {summary.lastAmount ? (
          <div className="text-xs text-muted-foreground">{formatCurrency(summary.lastAmount)}</div>
        ) : null}
        {summary.lastMsisdn ? (
          <div className="text-xs text-muted-foreground">{summary.lastMsisdn}</div>
        ) : null}
      </div>
    );
  };

  const renderUserActions = (user: User) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="User actions">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        {user.email ? (
          <DropdownMenuItem onClick={() => handleSendEmailClick(user)}>
            <Mail className="mr-2 h-4 w-4" />
            Send email
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem onClick={() => handleSendNotificationClick(user)}>
          <Bell className="mr-2 h-4 w-4" />
          Send notification
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => openBilling(user)}>
          <DollarSign className="mr-2 h-4 w-4" />
          Payment plan
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => markPaid(user)}>
          <CheckCircle className="mr-2 h-4 w-4" />
          Mark paid
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {user.isActive !== false ? (
          <DropdownMenuItem
            onClick={() => handleSetUserAccountActive(user, false)}
            disabled={togglingUserId === user._id}
          >
            Deactivate account
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem
            onClick={() => handleSetUserAccountActive(user, true)}
            disabled={togglingUserId === user._id}
          >
            Activate account
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-red-600 focus:text-red-600"
          onClick={() => handleDeleteClick(user)}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete user
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const handleDeleteClick = (user: User) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  const handleSendEmailClick = (user: User | null = null) => {
    if (user) {
      setSelectedUser(user);
      setIsBulkEmailMode(false);
      setSelectedUsers(new Set());
    } else {
      // Bulk email mode
      setSelectedUser(null);
      setIsBulkEmailMode(true);
    }
    setEmailSubject("");
    setEmailMessage("");
    setEmailDialogOpen(true);
  };

  const handleSendNotificationClick = (user: User | null = null) => {
    if (user) {
      setSelectedUser(user);
      setIsBulkNotificationMode(false);
      setSelectedUsers(new Set());
    } else {
      setSelectedUser(null);
      setIsBulkNotificationMode(true);
    }
    setNotificationTitle("");
    setNotificationBody("");
    setNotificationType("general");
    setNotificationDialogOpen(true);
  };

  const handleSendEmail = async () => {
    if (!emailSubject.trim() || !emailMessage.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in both subject and message fields.",
        variant: "destructive",
      });
      return;
    }

    setIsSendingEmail(true);
    try {
      if (isBulkEmailMode && selectedUsers.size > 0) {
        // Send bulk email
        const userIds = Array.from(selectedUsers);
        const response = await adminApi.sendBulkEmail(userIds, emailSubject, emailMessage);
        
        if (response.data) {
          const { successful, total } = response.data;
          toast({
            title: "Emails Sent",
            description: `Successfully sent ${successful} of ${total} emails.`,
          });
        }
      } else if (selectedUser) {
        // Send single email
        const response = await adminApi.sendEmailToUser(selectedUser._id, emailSubject, emailMessage);
        
        if (response.data) {
          toast({
            title: "Email Sent",
            description: `Email sent successfully to ${selectedUser.name}.`,
          });
        }
      }

      setEmailDialogOpen(false);
      setEmailSubject("");
      setEmailMessage("");
      setSelectedUser(null);
      setSelectedUsers(new Set());
      setIsBulkEmailMode(false);
    } catch (error: any) {
      toast({
        title: "Failed to Send Email",
        description: error?.message || "An error occurred while sending the email.",
        variant: "destructive",
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleSendNotification = async () => {
    if (!notificationTitle.trim() || !notificationBody.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in both title and message fields.",
        variant: "destructive",
      });
      return;
    }

    setIsSendingNotification(true);
    try {
      if (isBulkNotificationMode) {
        const userIds = Array.from(selectedUsers);
        await adminApi.sendBulkNotification({
          userIds: userIds.length > 0 ? userIds : undefined,
          sendToAll: userIds.length === 0,
          title: notificationTitle,
          body: notificationBody,
          type: notificationType,
        });

        toast({
          title: "Notification Sent",
          description: userIds.length > 0 ? `Sent to ${userIds.length} user(s).` : "Sent to all users.",
        });
      } else if (selectedUser) {
        await adminApi.sendNotificationToUser(selectedUser._id, {
          title: notificationTitle,
          body: notificationBody,
          type: notificationType,
        });

        toast({
          title: "Notification Sent",
          description: `Sent to ${selectedUser.name}.`,
        });
      }

      setNotificationDialogOpen(false);
      setNotificationTitle("");
      setNotificationBody("");
      setNotificationType("general");
      setSelectedUser(null);
      setSelectedUsers(new Set());
      setIsBulkNotificationMode(false);
    } catch (error: any) {
      toast({
        title: "Failed to Send Notification",
        description: error?.message || "An error occurred while sending the notification.",
        variant: "destructive",
      });
    } finally {
      setIsSendingNotification(false);
    }
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;

    const user = userToDelete;
    setDeleteDialogOpen(false);
    setUserToDelete(null);
    setUsers((prev) => prev.filter((u) => u._id !== user._id));

    try {
      await adminApi.deleteUser(user._id);
      void loadDashboardData();
      toast({
        title: "User Deleted",
        description: `User "${user.name}" and all their data have been deleted successfully.`,
      });
    } catch (error: any) {
      setUsers((prev) => [...prev, user]);
      console.error("Error deleting user:", error);
      toast({
        title: "Error",
        description: error.response?.error || error.message || "Failed to delete user. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading && !stats) {
    return (
      <AdminLayout 
        title="Admin Dashboard"
        activeSection={activeTab}
        onSectionChange={setActiveTab}
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <Skeleton className="h-96" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout 
      title="Admin Dashboard"
      activeSection={activeTab}
      onSectionChange={setActiveTab}
    >
      <div className="space-y-6">

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className={ADMIN_CARD_CLASS}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className={cn("text-sm", ADMIN_TITLE_CLASS)}>Total Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl">{stats?.totalUsers || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats?.recentUsers || 0} new in last 7 days
                  </p>
                </CardContent>
              </Card>

              <Card className={ADMIN_CARD_CLASS}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className={cn("text-sm", ADMIN_TITLE_CLASS)}>Total Products</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl">{stats?.totalProducts || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats?.recentProducts || 0} new in last 7 days
                  </p>
                </CardContent>
              </Card>

              <Card className={ADMIN_CARD_CLASS}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className={cn("text-sm", ADMIN_TITLE_CLASS)}>Total Sales</CardTitle>
                  <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl">{stats?.totalSales || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats?.recentSales || 0} in last 7 days
                  </p>
                </CardContent>
              </Card>

              <Card className={ADMIN_CARD_CLASS}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className={cn("text-sm", ADMIN_TITLE_CLASS)}>Total Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl">
                    {stats?.totalRevenue ? formatCurrency(stats.totalRevenue) : formatCurrency(0)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Profit: {stats?.totalProfit ? formatCurrency(stats.totalProfit) : formatCurrency(0)}
                  </p>
                </CardContent>
              </Card>
            </div>

            <AdminPlatformTrafficChart
              hourlyRequests={apiStats?.hourlyRequests}
              dailyRequests={apiStats?.dailyRequests}
              recentRequests={apiStats?.recentRequests}
              avgResponseTime={apiStats?.avgResponseTime}
            />

            <AdminPlatformHealthPanel
              health={health}
              apiStats={apiStats}
              onRefresh={loadHealthMonitoring}
              refreshing={healthRefreshing}
            />

            <div className="pt-2 space-y-4">
              <Card className={ADMIN_CARD_CLASS}>
                <CardHeader>
                  <CardTitle className={cn("flex items-center gap-2", ADMIN_TITLE_CLASS)}>
                    <Activity className="h-5 w-5" />
                    Uptime timeline
                  </CardTitle>
                  <CardDescription>System availability</CardDescription>
                </CardHeader>
                <CardContent>
                  {health && (
                    <UptimeTimeline
                      uptime={health.uptime}
                      serverStartTime={health.serverStartTime}
                      statusHistory={health.statusHistory}
                    />
                  )}
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-1 gap-4">
                <Card className={ADMIN_CARD_CLASS}>
                  <CardHeader>
                    <CardTitle className={cn("flex items-center gap-2", ADMIN_TITLE_CLASS)}>
                      <TrendingUp className="h-5 w-5" />
                      Endpoint distribution
                    </CardTitle>
                    <CardDescription>Most used API endpoints</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {apiStats?.endpointStats && apiStats.endpointStats.length > 0 ? (
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={apiStats.endpointStats.slice(0, 5)}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ endpoint, percent }) => {
                                const parts = typeof endpoint === "string" ? endpoint.split(" ") : [];
                                const path = parts.length > 1 ? parts[1] : endpoint || "Unknown";
                                return `${path}: ${(percent * 100).toFixed(0)}%`;
                              }}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="count"
                            >
                              {apiStats.endpointStats.slice(0, 5).map((_, index) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"][index % 5]}
                                />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="h-64 flex items-center justify-center text-muted-foreground">
                        No endpoint data available
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </>
        )}

        {/* Users Tab */}
        {activeTab === "users" && (
          <Card className={ADMIN_CARD_CLASS}>
            <CardHeader>
              <div className="flex flex-col gap-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className={ADMIN_TITLE_CLASS}>All Users</CardTitle>
                    <CardDescription>
                      Registered users, subscription status, and Paypack payment attempts
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => handleSendNotificationClick(null)} className="gap-2">
                      <Bell className="h-4 w-4" />
                      Notify users
                    </Button>
                    <Button variant="outline" onClick={() => handleSendEmailClick(null)} className="gap-2">
                      <Mail className="h-4 w-4" />
                      Bulk email
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      ["all", "All users"],
                      ["paid", "Paid via API"],
                      ["failed", "Failed attempts"],
                      ["trial", "On trial"],
                      ["none", "No API attempts"],
                    ] as const
                  ).map(([key, label]) => (
                    <Button
                      key={key}
                      size="sm"
                      variant={userPaymentFilter === key ? "default" : "outline"}
                      onClick={() => setUserPaymentFilter(key)}
                    >
                      {label} ({paymentFilterCounts[key]})
                    </Button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1200px]">
                  <thead>
                    <tr className="bg-muted/30">
                      <th className="text-left p-2 text-sm font-medium">Name</th>
                      <th className="text-left p-2 text-sm font-medium">Email</th>
                      <th className="text-left p-2 text-sm font-medium">Phone</th>
                      <th className="text-left p-2 text-sm font-medium">Business</th>
                      <th className="text-left p-2 text-sm font-medium">Plan</th>
                      <th className="text-left p-2 text-sm font-medium">API payments</th>
                      <th className="text-left p-2 text-sm font-medium">Last API attempt</th>
                      <th className="text-left p-2 text-sm font-medium">Total paid (API)</th>
                      <th className="text-left p-2 text-sm font-medium">Next due</th>
                      <th className="text-left p-2 text-sm font-medium">Joined</th>
                      <th className="text-left p-2 text-sm font-medium">Account</th>
                      <th className="text-right p-2 text-sm font-medium w-12">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={12} className="p-8 text-center text-sm text-muted-foreground">
                          No users match this filter.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((user) => (
                        <tr key={user._id} className="hover:bg-gray-50/80 align-top">
                          <td className="p-2 text-sm font-medium">{user.name}</td>
                          <td className="p-2 text-sm text-muted-foreground">{user.email || "—"}</td>
                          <td className="p-2 text-sm text-muted-foreground">{user.phone || "—"}</td>
                          <td className="p-2 text-sm text-muted-foreground">{user.businessName || "—"}</td>
                          <td className="p-2 text-sm">{renderPlanBadge(user)}</td>
                          <td className="p-2 text-sm">{renderPaymentApiBadges(user.paymentSummary)}</td>
                          <td className="p-2 text-sm">{renderLastPaymentAttempt(user.paymentSummary)}</td>
                          <td className="p-2 text-sm">
                            {user.paymentSummary?.totalPaidAmount
                              ? formatCurrency(user.paymentSummary.totalPaidAmount)
                              : "—"}
                          </td>
                          <td className="p-2 text-sm">
                            <div className="text-sm">
                              {user.subscription?.nextDueDate || user.paymentPlan?.nextDueDate
                                ? formatDate(
                                    (user.subscription?.nextDueDate ||
                                      user.paymentPlan?.nextDueDate) as string
                                  )
                                : "—"}
                            </div>
                            {user.subscription?.lastPaidAt || user.paymentPlan?.lastPaidAt ? (
                              <div className="text-xs text-muted-foreground">
                                Last paid:{" "}
                                {formatDate(
                                  (user.subscription?.lastPaidAt ||
                                    user.paymentPlan?.lastPaidAt) as string
                                )}
                              </div>
                            ) : null}
                          </td>
                          <td className="p-2 text-sm text-muted-foreground">
                            {formatDate(user.createdAt)}
                          </td>
                          <td className="p-2">
                            <span
                              className={cn(
                                "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                                user.isActive !== false
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              )}
                            >
                              {user.isActive !== false ? "Active" : "Disabled"}
                            </span>
                          </td>
                          <td className="p-2 text-right">{renderUserActions(user)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Activity Tab */}
        {activeTab === "activity" && (
          <div className="space-y-4">
            {/* Usage Summary */}
            {usageSummary && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className={ADMIN_CARD_CLASS}>
                  <CardHeader className="pb-2">
                    <CardTitle className={cn("text-sm", ADMIN_TITLE_CLASS)}>Total Users</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl">{usageSummary.totalUsers}</div>
                    <p className="text-xs text-muted-foreground">
                      {usageSummary.activeUsers} active, {usageSummary.inactiveUsers} inactive
                    </p>
                  </CardContent>
                </Card>
                <Card className={ADMIN_CARD_CLASS}>
                  <CardHeader className="pb-2">
                    <CardTitle className={cn("text-sm", ADMIN_TITLE_CLASS)}>Total Products</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl">{usageSummary.totalProductsCreated}</div>
                    <p className="text-xs text-muted-foreground">
                      Avg: {usageSummary.avgProductsPerUser} per user
                    </p>
                  </CardContent>
                </Card>
                <Card className={ADMIN_CARD_CLASS}>
                  <CardHeader className="pb-2">
                    <CardTitle className={cn("text-sm", ADMIN_TITLE_CLASS)}>Total Sales</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl">{usageSummary.totalSalesMade}</div>
                    <p className="text-xs text-muted-foreground">
                      Avg: {usageSummary.avgSalesPerUser} per user
                    </p>
                  </CardContent>
                </Card>
                <Card className={ADMIN_CARD_CLASS}>
                  <CardHeader className="pb-2">
                    <CardTitle className={cn("text-sm", ADMIN_TITLE_CLASS)}>Active Users</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl text-green-600">{usageSummary.activeUsers}</div>
                    <p className="text-xs text-muted-foreground">
                      {usageSummary.totalUsers > 0 
                        ? Math.round((usageSummary.activeUsers / usageSummary.totalUsers) * 100) 
                        : 0}% of total users
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* User Usage Statistics */}
            <Card className={ADMIN_CARD_CLASS}>
              <CardHeader>
                <CardTitle className={ADMIN_TITLE_CLASS}>User System Usage (Last 30 Days)</CardTitle>
                <CardDescription>How users are utilizing the system</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-muted/20">
                        <th className="text-left p-2 text-sm">User</th>
                        <th className="text-left p-2 text-sm">Activity Score</th>
                        <th className="text-left p-2 text-sm">Products</th>
                        <th className="text-left p-2 text-sm">Sales</th>
                        <th className="text-left p-2 text-sm">Avg Sales/Day</th>
                        <th className="text-left p-2 text-sm">Revenue</th>
                        <th className="text-left p-2 text-sm">Last Product</th>
                        <th className="text-left p-2 text-sm">Last Sale</th>
                        <th className="text-left p-2 text-sm">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {userUsage.length > 0 ? (
                        userUsage.map((usage) => (
                          <tr key={usage.userId} className="hover:bg-gray-50/80">
                            <td className="p-2">
                              <div>
                                <p className="text-sm">{usage.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {usage.businessName || usage.email || "No business"}
                                </p>
                              </div>
                            </td>
                            <td className="p-2">
                              <div className="flex items-center gap-2">
                                <div className="w-16 bg-gray-200 rounded-full h-2">
                                  <div
                                    className={cn(
                                      "h-2 rounded-full",
                                      usage.activityScore > 10
                                        ? "bg-green-500"
                                        : usage.activityScore > 5
                                        ? "bg-yellow-500"
                                        : usage.activityScore > 0
                                        ? "bg-orange-500"
                                        : "bg-gray-300"
                                    )}
                                    style={{
                                      width: `${Math.min(100, (usage.activityScore / 50) * 100)}%`,
                                    }}
                                  />
                                </div>
                                <span className="text-sm">{usage.activityScore}</span>
                              </div>
                            </td>
                            <td className="p-2 text-sm">
                              <div>
                                <span>{usage.totalProducts}</span>
                                {usage.recentProducts > 0 && (
                                  <span className="text-xs text-green-600 ml-1">
                                    (+{usage.recentProducts})
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-2 text-sm">
                              <div>
                                <span>{usage.totalSales}</span>
                                {usage.recentSales > 0 && (
                                  <span className="text-xs text-green-600 ml-1">
                                    (+{usage.recentSales})
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-2 text-sm">{usage.avgSalesPerDay.toFixed(2)}</td>
                            <td className="p-2 text-sm">{formatCurrency(usage.totalRevenue)}</td>
                            <td className="p-2 text-sm text-muted-foreground">
                              {usage.lastProductDate ? formatDate(usage.lastProductDate) : "Never"}
                            </td>
                            <td className="p-2 text-sm text-muted-foreground">
                              {usage.lastSaleDate ? formatDate(usage.lastSaleDate) : "Never"}
                            </td>
                            <td className="p-2">
                              <span
                                className={cn(
                                  "px-2 py-1 rounded-full text-xs",
                                  usage.isActive
                                    ? "bg-green-100 text-green-700"
                                    : "bg-gray-100 text-gray-600"
                                )}
                              >
                                {usage.isActive ? "Active" : "Inactive"}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={9} className="p-4 text-center text-sm text-muted-foreground">
                            No user usage data available
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className={ADMIN_CARD_CLASS}>
                <CardHeader>
                  <CardTitle className={ADMIN_TITLE_CLASS}>Recent Product Creations</CardTitle>
                  <CardDescription>Products created in the last 7 days</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {activity?.products && activity.products.length > 0 ? (
                      activity.products.slice(0, 10).map((product: any, index: number) => (
                        <div key={index} className="flex justify-between items-center p-2 hover:bg-gray-50 rounded">
                          <div>
                            <p className="text-sm">{product.name}</p>
                            <p className="text-xs text-muted-foreground">
                              By: {product.userId?.name || "Unknown"}
                            </p>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(product.createdAt)}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No recent product creations</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className={ADMIN_CARD_CLASS}>
                <CardHeader>
                  <CardTitle className={ADMIN_TITLE_CLASS}>Recent Sales</CardTitle>
                  <CardDescription>Sales made in the last 7 days</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {activity?.sales && activity.sales.length > 0 ? (
                      activity.sales.slice(0, 10).map((sale: any, index: number) => (
                        <div key={index} className="flex justify-between items-center p-2 hover:bg-gray-50 rounded">
                          <div>
                            <p className="text-sm">{sale.product}</p>
                            <p className="text-xs text-muted-foreground">
                              Qty: {sale.quantity} • By: {sale.userId?.name || "Unknown"}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm">{formatCurrency(sale.revenue)}</p>
                            <p className="text-xs text-green-600">Profit: {formatCurrency(sale.profit)}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No recent sales</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Accounts — activate / deactivate sign-in (replaces former Schedules admin page) */}
        {activeTab === "accounts" && (
          <Card className={ADMIN_CARD_CLASS}>
            <CardHeader>
              <CardTitle className={ADMIN_TITLE_CLASS}>User accounts</CardTitle>
              <CardDescription>
                Turn sign-in on or off per user. Disabled accounts cannot log in until you activate them again.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-muted/20">
                      <th className="text-left p-2 text-sm">Name</th>
                      <th className="text-left p-2 text-sm">Email</th>
                      <th className="text-left p-2 text-sm">Business</th>
                      <th className="text-left p-2 text-sm">Access</th>
                      <th className="text-right p-2 text-sm">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user._id} className="hover:bg-gray-50/80">
                        <td className="p-2 text-sm font-medium">{user.name}</td>
                        <td className="p-2 text-sm text-muted-foreground">{user.email || "—"}</td>
                        <td className="p-2 text-sm text-muted-foreground">{user.businessName || "—"}</td>
                        <td className="p-2">
                          <span
                            className={cn(
                              "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                              user.isActive !== false
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            )}
                          >
                            {user.isActive !== false ? "Active" : "Disabled"}
                          </span>
                        </td>
                        <td className="p-2 text-right">
                          {user.isActive !== false ? (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={togglingUserId === user._id}
                              onClick={() => handleSetUserAccountActive(user, false)}
                            >
                              {togglingUserId === user._id ? "…" : "Deactivate"}
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              disabled={togglingUserId === user._id}
                              onClick={() => handleSetUserAccountActive(user, true)}
                            >
                              {togglingUserId === user._id ? "…" : "Activate"}
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Notifications Tab */}
        {activeTab === "notifications" && (
          <Card className={ADMIN_CARD_CLASS}>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className={ADMIN_TITLE_CLASS}>Notification History</CardTitle>
                  <CardDescription>History of notifications sent by admin</CardDescription>
                </div>
                <Button variant="outline" onClick={loadNotificationHistory} disabled={notificationHistoryLoading}>
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {notificationHistoryLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : notificationHistory.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-muted/20">
                        <th className="text-left p-2 text-sm">When</th>
                        <th className="text-left p-2 text-sm">To</th>
                        <th className="text-left p-2 text-sm">Type</th>
                        <th className="text-left p-2 text-sm">Title</th>
                        <th className="text-left p-2 text-sm">Message</th>
                        <th className="text-left p-2 text-sm">Read</th>
                      </tr>
                    </thead>
                    <tbody>
                      {notificationHistory.map((n: any) => (
                        <tr key={n._id} className="hover:bg-gray-50/80">
                          <td className="p-2 text-sm text-muted-foreground whitespace-nowrap">
                            {new Date(n.createdAt || Date.now()).toLocaleString()}
                          </td>
                          <td className="p-2 text-sm">
                            <div className="font-medium">{n.userId?.name || "User"}</div>
                            <div className="text-xs text-muted-foreground">
                              {n.userId?.email || n.userId?._id || n.userId || "—"}
                            </div>
                          </td>
                          <td className="p-2 text-sm">{n.type || "general"}</td>
                          <td className="p-2 text-sm font-medium">{n.title}</td>
                          <td className="p-2 text-sm text-muted-foreground max-w-[360px]">
                            <div className="line-clamp-2">{n.body}</div>
                          </td>
                          <td className="p-2 text-sm">
                            {n.read ? (
                              <span className="text-green-700">Yes</span>
                            ) : (
                              <span className="text-orange-700">No</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No admin notifications found yet.</p>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === "payments" && <AdminPaymentsPanel />}

        {activeTab === "homepage" && <AdminHomepagePanel />}

        {activeTab === "settings" && <AdminSettingsPanel />}

        {/* Refresh Button */}
        {activeTab !== "payments" && activeTab !== "homepage" && activeTab !== "settings" && (
        <div className="flex justify-end">
          <Button onClick={loadDashboardData} variant="outline">
            Refresh Data
          </Button>
        </div>
        )}

        {/* Delete User Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete User?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete <strong>{userToDelete?.name}</strong>? 
                This action will permanently delete:
              </AlertDialogDescription>
              <div className="mt-2">
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>The user account</li>
                  <li>All products ({userToDelete?.productCount || 0})</li>
                  <li>All sales ({userToDelete?.saleCount || 0})</li>
                  <li>All associated data</li>
                </ul>
                <span className="text-red-600 font-semibold mt-2 block text-sm">This action cannot be undone.</span>
              </div>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700"
              >
                {isDeleting ? "Deleting..." : "Delete User"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Email Dialog */}
        <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {isBulkEmailMode ? "Send Bulk Email" : `Send Email to ${selectedUser?.name || "User"}`}
              </DialogTitle>
              <DialogDescription>
                {isBulkEmailMode 
                  ? "Select users and compose your email message. The email will be personalized for each recipient."
                  : `Send a personalized email to ${selectedUser?.email || "this user"}.`
                }
              </DialogDescription>
            </DialogHeader>

            {isBulkEmailMode && (
              <div className="space-y-4">
                <div>
                  <Label>Select Users ({selectedUsers.size} selected)</Label>
                  <div className={cn("mt-2 max-h-60 overflow-y-auto p-2 space-y-2", ADMIN_INNER_SURFACE_CLASS)}>
                    {users.filter(u => u.email).map((user) => (
                      <div key={user._id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`user-${user._id}`}
                          checked={selectedUsers.has(user._id)}
                          onCheckedChange={() => toggleUserSelection(user._id)}
                        />
                        <label
                          htmlFor={`user-${user._id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                        >
                          {user.name} ({user.email})
                        </label>
                      </div>
                    ))}
                  </div>
                  {users.filter(u => u.email).length === 0 && (
                    <p className="text-sm text-muted-foreground mt-2">
                      No users with email addresses found.
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <Label htmlFor="email-subject">Subject *</Label>
                <Input
                  id="email-subject"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="Email subject"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="email-message">Message *</Label>
                <Textarea
                  id="email-message"
                  value={emailMessage}
                  onChange={(e) => setEmailMessage(e.target.value)}
                  placeholder="Enter your email message here. Use {name} to personalize (e.g., Hello {name}, ...)"
                  className="mt-1 min-h-[200px]"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Tip: Use {"{name}"} in your message to personalize it for each recipient.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="cancel"
                onClick={() => {
                  setEmailDialogOpen(false);
                  setEmailSubject("");
                  setEmailMessage("");
                  setSelectedUser(null);
                  setSelectedUsers(new Set());
                  setIsBulkEmailMode(false);
                }}
                disabled={isSendingEmail}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSendEmail}
                disabled={isSendingEmail || (isBulkEmailMode && selectedUsers.size === 0) || !emailSubject.trim() || !emailMessage.trim()}
              >
                {isSendingEmail ? "Sending..." : "Send Email"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Notification Dialog */}
        <Dialog open={notificationDialogOpen} onOpenChange={setNotificationDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {isBulkNotificationMode ? "Send Notification" : `Send Notification to ${selectedUser?.name || "User"}`}
              </DialogTitle>
              <DialogDescription>
                {isBulkNotificationMode
                  ? "Select users and send an in-app notification. Leave selection empty to notify all users."
                  : "Send an in-app notification to this user."
                }
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {isBulkNotificationMode && (
                <div className="space-y-2">
                  <Label>Select Users ({selectedUsers.size} selected)</Label>
                  <div className={cn("mt-2 max-h-60 overflow-y-auto p-2 space-y-2", ADMIN_INNER_SURFACE_CLASS)}>
                    {users.map((user) => (
                      <div key={user._id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`notify-user-${user._id}`}
                          checked={selectedUsers.has(user._id)}
                          onCheckedChange={() => toggleUserSelection(user._id)}
                        />
                        <label
                          htmlFor={`notify-user-${user._id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                        >
                          {user.name}{user.email ? ` (${user.email})` : ""}
                        </label>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Tip: leave selection empty to notify all users.
                  </p>
                </div>
              )}

              <div>
                <Label htmlFor="notification-type">Type</Label>
                <Input
                  id="notification-type"
                  value={notificationType}
                  onChange={(e) => setNotificationType(e.target.value)}
                  placeholder="general / low_stock / schedule ..."
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="notification-title">Title *</Label>
                <Input
                  id="notification-title"
                  value={notificationTitle}
                  onChange={(e) => setNotificationTitle(e.target.value)}
                  placeholder="Notification title"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="notification-body">Message *</Label>
                <Textarea
                  id="notification-body"
                  value={notificationBody}
                  onChange={(e) => setNotificationBody(e.target.value)}
                  placeholder="Write the notification message..."
                  className="mt-1 min-h-[200px]"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="cancel"
                onClick={() => {
                  setNotificationDialogOpen(false);
                  setNotificationTitle("");
                  setNotificationBody("");
                  setNotificationType("general");
                  setSelectedUser(null);
                  setSelectedUsers(new Set());
                  setIsBulkNotificationMode(false);
                }}
                disabled={isSendingNotification}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSendNotification}
                disabled={isSendingNotification || !notificationTitle.trim() || !notificationBody.trim()}
                className="gap-2"
              >
                <Bell className="h-4 w-4" />
                {isSendingNotification ? "Sending..." : "Send Notification"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Billing Dialog */}
        <Dialog open={billingDialogOpen} onOpenChange={setBillingDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Monthly Payment Plan</DialogTitle>
              <DialogDescription>
                Set the monthly payment structure for {billingUser?.name || "user"}.
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Active</Label>
                <Select value={billingActive ? "true" : "false"} onValueChange={(v) => setBillingActive(v === "true")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Active</SelectItem>
                    <SelectItem value="false">Paused</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={billingStatus} onValueChange={setBillingStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="past_due">Past due</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Amount (Rwf)</Label>
                <Input value={billingAmount} onChange={(e) => setBillingAmount(e.target.value.replace(/[^\d]/g, ""))} />
              </div>

              <div className="space-y-2">
                <Label>Interval (months)</Label>
                <Input value={billingIntervalMonths} onChange={(e) => setBillingIntervalMonths(e.target.value.replace(/[^\d]/g, ""))} />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label>Next due date</Label>
                <Input type="date" value={billingNextDueDate} onChange={(e) => setBillingNextDueDate(e.target.value)} />
                <p className="text-xs text-muted-foreground">
                  This controls when reminders will be sent.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="cancel" onClick={() => setBillingDialogOpen(false)} disabled={isSavingBilling}>
                Cancel
              </Button>
              <Button onClick={saveBilling} disabled={isSavingBilling || !billingUser}>
                {isSavingBilling ? "Saving..." : "Save Plan"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <AddToHomeScreen />
    </AdminLayout>
  );
};

export default AdminDashboard;
