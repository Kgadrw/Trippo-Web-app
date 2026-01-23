import { useMemo } from "react";
import { Calendar, AlertCircle, CheckCircle2, Clock, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface Schedule {
  id?: number;
  _id?: string;
  title: string;
  description?: string;
  clientId?: string | any;
  dueDate: string | Date;
  frequency: 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  amount?: number;
  status: 'pending' | 'completed' | 'cancelled';
  notifyUser: boolean;
  notifyClient: boolean;
}

interface ScheduleWidgetsProps {
  schedules: Schedule[];
  clients: any[];
  getClientName: (clientId?: string | any) => string;
}

export const UpcomingSchedulesWidget = ({ schedules, clients, getClientName }: ScheduleWidgetsProps) => {
  const navigate = useNavigate();
  
  const upcomingSchedules = useMemo(() => {
    const now = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(now.getDate() + 7);
    
    return schedules
      .filter((s) => {
        const dueDate = new Date(s.dueDate);
        return dueDate >= now && dueDate <= nextWeek && s.status === "pending";
      })
      .sort((a, b) => {
        const dateA = new Date(a.dueDate).getTime();
        const dateB = new Date(b.dueDate).getTime();
        return dateA - dateB;
      })
      .slice(0, 5);
  }, [schedules]);

  const getDaysUntil = (dueDate: string | Date) => {
    const due = new Date(dueDate);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    const diffTime = due.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  if (upcomingSchedules.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <Calendar size={16} className="text-blue-600" />
            Upcoming Schedules (Next 7 Days)
          </h3>
        </div>
        <p className="text-sm text-gray-500 text-center py-4">No upcoming schedules</p>
        <Button
          onClick={() => navigate("/schedules")}
          variant="outline"
          className="w-full border-gray-300 text-gray-700"
        >
          View All Schedules
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Calendar size={16} className="text-blue-600" />
          Upcoming Schedules (Next 7 Days)
        </h3>
        <Button
          onClick={() => navigate("/schedules")}
          variant="ghost"
          className="text-xs text-gray-600 h-auto p-1"
        >
          View All
        </Button>
      </div>
      <div className="space-y-2">
        {upcomingSchedules.map((schedule) => {
          const scheduleId = (schedule as any)._id || schedule.id;
          const daysUntil = getDaysUntil(schedule.dueDate);
          const isToday = daysUntil === 0;
          
          return (
            <div
              key={scheduleId}
              className={cn(
                "p-3 rounded border transition-colors hover:bg-gray-50 cursor-pointer",
                isToday ? "border-blue-300 bg-blue-50" : "border-gray-200"
              )}
              onClick={() => navigate("/schedules")}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-gray-900 truncate">
                      {schedule.title}
                    </span>
                    {isToday && (
                      <span className="px-1.5 py-0.5 text-xs font-semibold rounded bg-blue-100 text-blue-700 border border-blue-200">
                        Today
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-600">
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {new Date(schedule.dueDate).toLocaleDateString()}
                    </span>
                    {schedule.clientId && (
                      <span className="flex items-center gap-1">
                        <User size={12} />
                        {getClientName(schedule.clientId)}
                      </span>
                    )}
                    {schedule.amount && (
                      <span className="font-medium text-gray-900">
                        {schedule.amount.toLocaleString()} RWF
                      </span>
                    )}
                  </div>
                </div>
                <span className={cn(
                  "text-xs font-semibold px-2 py-1 rounded",
                  daysUntil === 0 && "bg-blue-100 text-blue-700",
                  daysUntil === 1 && "bg-yellow-100 text-yellow-700",
                  daysUntil > 1 && "bg-gray-100 text-gray-700"
                )}>
                  {daysUntil === 0 ? "Today" : daysUntil === 1 ? "Tomorrow" : `${daysUntil}d`}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const OverdueSchedulesWidget = ({ schedules, clients, getClientName }: ScheduleWidgetsProps) => {
  const navigate = useNavigate();
  
  const overdueSchedules = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    return schedules
      .filter((s) => {
        const dueDate = new Date(s.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate < now && s.status === "pending";
      })
      .sort((a, b) => {
        const dateA = new Date(a.dueDate).getTime();
        const dateB = new Date(b.dueDate).getTime();
        return dateA - dateB;
      })
      .slice(0, 5);
  }, [schedules]);

  const getDaysOverdue = (dueDate: string | Date) => {
    const due = new Date(dueDate);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    const diffTime = now.getTime() - due.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  if (overdueSchedules.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <AlertCircle size={16} className="text-red-600" />
            Overdue Schedules
          </h3>
        </div>
        <p className="text-sm text-gray-500 text-center py-4">No overdue schedules</p>
      </div>
    );
  }

  return (
    <div className="bg-white border-2 border-red-300 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-red-900 flex items-center gap-2">
          <AlertCircle size={16} className="text-red-600" />
          Overdue Schedules ({overdueSchedules.length})
        </h3>
        <Button
          onClick={() => navigate("/schedules")}
          variant="ghost"
          className="text-xs text-red-600 h-auto p-1"
        >
          View All
        </Button>
      </div>
      <div className="space-y-2">
        {overdueSchedules.map((schedule) => {
          const scheduleId = (schedule as any)._id || schedule.id;
          const daysOverdue = getDaysOverdue(schedule.dueDate);
          
          return (
            <div
              key={scheduleId}
              className="p-3 rounded border-2 border-red-200 bg-red-50 transition-colors hover:bg-red-100 cursor-pointer"
              onClick={() => navigate("/schedules")}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-red-900 truncate">
                      {schedule.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-red-700">
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {new Date(schedule.dueDate).toLocaleDateString()}
                    </span>
                    {schedule.clientId && (
                      <span className="flex items-center gap-1">
                        <User size={12} />
                        {getClientName(schedule.clientId)}
                      </span>
                    )}
                    {schedule.amount && (
                      <span className="font-medium">
                        {schedule.amount.toLocaleString()} RWF
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-xs font-semibold px-2 py-1 rounded bg-red-200 text-red-900">
                  {daysOverdue}d overdue
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const RecentClientsWidget = ({ clients }: { clients: any[] }) => {
  const navigate = useNavigate();
  
  const recentClients = useMemo(() => {
    return [...clients]
      .sort((a, b) => {
        const dateA = new Date((a as any).createdAt || 0).getTime();
        const dateB = new Date((b as any).createdAt || 0).getTime();
        return dateB - dateA;
      })
      .slice(0, 5);
  }, [clients]);

  if (recentClients.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <User size={16} className="text-gray-600" />
            Recent Clients
          </h3>
        </div>
        <p className="text-sm text-gray-500 text-center py-4">No clients yet</p>
        <Button
          onClick={() => navigate("/clients")}
          variant="outline"
          className="w-full border-gray-300 text-gray-700"
        >
          Add Client
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <User size={16} className="text-gray-600" />
          Recent Clients
        </h3>
        <Button
          onClick={() => navigate("/clients")}
          variant="ghost"
          className="text-xs text-gray-600 h-auto p-1"
        >
          View All
        </Button>
      </div>
      <div className="space-y-2">
        {recentClients.map((client) => {
          const clientId = (client as any)._id || client.id;
          return (
            <div
              key={clientId}
              className="p-3 rounded border border-gray-200 transition-colors hover:bg-gray-50 cursor-pointer"
              onClick={() => navigate("/clients")}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {client.name}
                  </div>
                  <div className="text-xs text-gray-600 truncate">
                    {client.businessType || "No business type"}
                  </div>
                </div>
                {client.email && (
                  <span className="text-xs text-gray-500 ml-2 truncate max-w-[120px]">
                    {client.email}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
