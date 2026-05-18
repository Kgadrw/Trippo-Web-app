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
  Server,
  Database,
  Clock,
  Radio,
  BarChart3,
  Trash2,
  Mail,
  Bell,
  CheckCircle,
  MoreHorizontal,
} from "lucide-react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { adminApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { UptimeTimeline } from "@/components/admin/UptimeTimeline";
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
}

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
    timestamp: string;
  }>;
  statusCodeDistribution: Record<string, number>;
  avgResponseTime: number;
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
  const [activeTab, setActiveTab] = useState<
    "overview" | "users" | "activity" | "accounts" | "notifications"
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
  const [billingAmount, setBillingAmount] = useState("5800");
  const [billingIntervalMonths, setBillingIntervalMonths] = useState("1");
  const [billingNextDueDate, setBillingNextDueDate] = useState("");
  const [billingStatus, setBillingStatus] = useState("active");
  const [billingActive, setBillingActive] = useState(true);
  const [isSavingBilling, setIsSavingBilling] = useState(false);

  const openBilling = (u: User) => {
    setBillingUser(u);
    const plan = u.paymentPlan || {};
    setBillingAmount(String(plan.amount ?? 5800));
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
    // Format as RWF (Rwandan Franc)
    // RWF doesn't use decimal places, so format as whole number
    return `${amount.toLocaleString("en-US")} RWF`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

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

    setIsDeleting(true);
    try {
      await adminApi.deleteUser(userToDelete._id);
      
      // Remove user from local state
      setUsers(prev => prev.filter(u => u._id !== userToDelete._id));
      
      // Reload dashboard data to update stats
      await loadDashboardData();
      
      toast({
        title: "User Deleted",
        description: `User "${userToDelete.name}" and all their data have been deleted successfully.`,
      });
      
      setDeleteDialogOpen(false);
      setUserToDelete(null);
    } catch (error: any) {
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
              <Card className="lg:bg-white bg-white/80 backdrop-blur-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-normal">Total Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl">{stats?.totalUsers || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats?.recentUsers || 0} new in last 7 days
                  </p>
                </CardContent>
              </Card>

              <Card className="lg:bg-white bg-white/80 backdrop-blur-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-normal">Total Products</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl">{stats?.totalProducts || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats?.recentProducts || 0} new in last 7 days
                  </p>
                </CardContent>
              </Card>

              <Card className="lg:bg-white bg-white/80 backdrop-blur-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-normal">Total Sales</CardTitle>
                  <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl">{stats?.totalSales || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats?.recentSales || 0} in last 7 days
                  </p>
                </CardContent>
              </Card>

              <Card className="lg:bg-white bg-white/80 backdrop-blur-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-normal">Total Revenue</CardTitle>
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

            {/* Summary Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="lg:bg-white bg-white/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="font-normal">System Summary</CardTitle>
                  <CardDescription>Overall system statistics</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total Users</span>
                    <span>{stats?.totalUsers || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total Products</span>
                    <span>{stats?.totalProducts || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total Sales</span>
                    <span>{stats?.totalSales || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total Revenue</span>
                    <span>
                      {stats?.totalRevenue ? formatCurrency(stats.totalRevenue) : formatCurrency(0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total Profit</span>
                    <span className="text-green-600">
                      {stats?.totalProfit ? formatCurrency(stats.totalProfit) : formatCurrency(0)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card className="lg:bg-white bg-white/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="font-normal">Recent Activity (7 Days)</CardTitle>
                  <CardDescription>New items in the last week</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">New Users</span>
                    <span>{stats?.recentUsers || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">New Products</span>
                    <span>{stats?.recentProducts || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">New Sales</span>
                    <span>{stats?.recentSales || 0}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="pt-6 border-t border-border/60 space-y-4">
              <h2 className="text-base font-semibold tracking-tight px-1">System health</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="lg:bg-white bg-white/80 backdrop-blur-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-normal flex items-center gap-2">
                      <Server className="h-4 w-4" />
                      System status
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "h-2 w-2 rounded-full",
                          health?.database === "connected" ? "bg-green-500" : "bg-red-500"
                        )}
                      />
                      <span className="text-sm capitalize">{health?.database || "Unknown"}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Uptime: {health ? formatUptime(health.uptime) : "N/A"}
                    </p>
                  </CardContent>
                </Card>

                <Card className="lg:bg-white bg-white/80 backdrop-blur-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-normal flex items-center gap-2">
                      <Radio className="h-4 w-4" />
                      API requests
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl">{apiStats?.recentRequests || 0}</div>
                    <p className="text-xs text-muted-foreground">
                      Last hour • {apiStats?.dailyRequests || 0} today
                    </p>
                  </CardContent>
                </Card>

                <Card className="lg:bg-white bg-white/80 backdrop-blur-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-normal flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Avg response
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl">{apiStats?.avgResponseTime || 0}ms</div>
                    <p className="text-xs text-muted-foreground">
                      {apiStats?.totalRequests || 0} total requests
                    </p>
                  </CardContent>
                </Card>

                <Card className="lg:bg-white bg-white/80 backdrop-blur-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-normal flex items-center gap-2">
                      <Database className="h-4 w-4" />
                      Memory
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl">{health?.memory.used || 0} MB</div>
                    <p className="text-xs text-muted-foreground">
                      {health ? Math.round((health.memory.used / health.memory.total) * 100) : 0}% used
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card className="lg:bg-white bg-white/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="font-normal flex items-center gap-2">
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

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card className="lg:bg-white bg-white/80 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="font-normal flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      API requests (24h)
                    </CardTitle>
                    <CardDescription>Hourly request distribution</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {apiStats?.hourlyRequests && apiStats.hourlyRequests.length > 0 ? (
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={apiStats.hourlyRequests}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis
                              dataKey="label"
                              tick={{ fontSize: 11 }}
                              angle={-45}
                              textAnchor="end"
                              height={60}
                            />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip />
                            <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="h-64 flex items-center justify-center text-muted-foreground">
                        No API request data available
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="lg:bg-white bg-white/80 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="font-normal flex items-center gap-2">
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
          <Card className="bg-white">
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="font-normal">All Users</CardTitle>
                  <CardDescription>Complete list of registered users and their activity</CardDescription>
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
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2 text-sm">Name</th>
                      <th className="text-left p-2 text-sm">Email</th>
                      <th className="text-left p-2 text-sm">Phone</th>
                      <th className="text-left p-2 text-sm">Business</th>
                      <th className="text-left p-2 text-sm">Products</th>
                      <th className="text-left p-2 text-sm">Sales</th>
                      <th className="text-left p-2 text-sm">Revenue</th>
                      <th className="text-left p-2 text-sm">Profit</th>
                      <th className="text-left p-2 text-sm">Joined</th>
                      <th className="text-left p-2 text-sm">Next Pay</th>
                      <th className="text-left p-2 text-sm">Account</th>
                      <th className="text-right p-2 text-sm w-12">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user._id} className="border-b hover:bg-gray-50">
                        <td className="p-2 text-sm">{user.name}</td>
                        <td className="p-2 text-sm text-muted-foreground">{user.email || "-"}</td>
                        <td className="p-2 text-sm text-muted-foreground">{user.phone || "-"}</td>
                        <td className="p-2 text-sm text-muted-foreground">
                          {user.businessName || "-"}
                        </td>
                        <td className="p-2 text-sm">{user.productCount}</td>
                        <td className="p-2 text-sm">{user.saleCount}</td>
                        <td className="p-2 text-sm">{formatCurrency(user.totalRevenue)}</td>
                        <td className="p-2 text-sm text-green-600">
                          {formatCurrency(user.totalProfit)}
                        </td>
                        <td className="p-2 text-sm text-muted-foreground">
                          {formatDate(user.createdAt)}
                        </td>
                        <td className="p-2 text-sm">
                          <div className="text-sm font-medium">
                            {user.paymentPlan?.nextDueDate ? formatDate(user.paymentPlan.nextDueDate) : "—"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {user.paymentPlan?.status || "active"}
                          </div>
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
                        <td className="p-2 text-right">
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
                        </td>
                      </tr>
                    ))}
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
                <Card className="lg:bg-white bg-white/80 backdrop-blur-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-normal">Total Users</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl">{usageSummary.totalUsers}</div>
                    <p className="text-xs text-muted-foreground">
                      {usageSummary.activeUsers} active, {usageSummary.inactiveUsers} inactive
                    </p>
                  </CardContent>
                </Card>
                <Card className="lg:bg-white bg-white/80 backdrop-blur-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-normal">Total Products</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl">{usageSummary.totalProductsCreated}</div>
                    <p className="text-xs text-muted-foreground">
                      Avg: {usageSummary.avgProductsPerUser} per user
                    </p>
                  </CardContent>
                </Card>
                <Card className="lg:bg-white bg-white/80 backdrop-blur-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-normal">Total Sales</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl">{usageSummary.totalSalesMade}</div>
                    <p className="text-xs text-muted-foreground">
                      Avg: {usageSummary.avgSalesPerUser} per user
                    </p>
                  </CardContent>
                </Card>
                <Card className="lg:bg-white bg-white/80 backdrop-blur-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-normal">Active Users</CardTitle>
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
            <Card className="bg-white">
              <CardHeader>
                <CardTitle className="font-normal">User System Usage (Last 30 Days)</CardTitle>
                <CardDescription>How users are utilizing the system</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
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
                          <tr key={usage.userId} className="border-b hover:bg-gray-50">
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
              <Card className="lg:bg-white bg-white/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="font-normal">Recent Product Creations</CardTitle>
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

              <Card className="lg:bg-white bg-white/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="font-normal">Recent Sales</CardTitle>
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
          <Card className="bg-white">
            <CardHeader>
              <CardTitle className="font-normal">User accounts</CardTitle>
              <CardDescription>
                Turn sign-in on or off per user. Disabled accounts cannot log in until you activate them again.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2 text-sm">Name</th>
                      <th className="text-left p-2 text-sm">Email</th>
                      <th className="text-left p-2 text-sm">Business</th>
                      <th className="text-left p-2 text-sm">Access</th>
                      <th className="text-right p-2 text-sm">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user._id} className="border-b hover:bg-gray-50">
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
          <Card className="lg:bg-white bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="font-normal">Notification History</CardTitle>
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
                      <tr className="border-b">
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
                        <tr key={n._id} className="border-b hover:bg-gray-50">
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

        {/* Refresh Button */}
        <div className="flex justify-end">
          <Button onClick={loadDashboardData} variant="outline">
            Refresh Data
          </Button>
        </div>

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
                  <div className="mt-2 max-h-60 overflow-y-auto border rounded-md p-2 space-y-2">
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
                variant="outline"
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
                  <div className="mt-2 max-h-60 overflow-y-auto border rounded-md p-2 space-y-2">
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
                variant="outline"
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
                <Label>Amount (RWF)</Label>
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
              <Button variant="outline" onClick={() => setBillingDialogOpen(false)} disabled={isSavingBilling}>
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
