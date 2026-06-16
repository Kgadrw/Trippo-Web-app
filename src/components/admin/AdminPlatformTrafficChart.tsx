import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";
import { ADMIN_CARD_CLASS, ADMIN_TITLE_CLASS } from "@/components/admin/adminStyles";

export interface HourlyTrafficPoint {
  hour: number;
  count: number;
  errors?: number;
  success?: number;
  timestamp: string;
  label: string;
}

interface AdminPlatformTrafficChartProps {
  hourlyRequests?: HourlyTrafficPoint[];
  dailyRequests?: number;
  recentRequests?: number;
  avgResponseTime?: number;
}

function TrafficTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg bg-white px-3 py-2 text-xs">
      <p className="font-medium text-gray-900 mb-1">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} style={{ color: entry.color }}>
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  );
}

export function AdminPlatformTrafficChart({
  hourlyRequests = [],
  dailyRequests = 0,
  recentRequests = 0,
  avgResponseTime = 0,
}: AdminPlatformTrafficChartProps) {
  const hasData = hourlyRequests.some((point) => point.count > 0);
  const peakHour = hourlyRequests.reduce(
    (best, point) => (point.count > best.count ? point : best),
    hourlyRequests[0] ?? { count: 0, label: "—" },
  );

  return (
    <Card className={ADMIN_CARD_CLASS}>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className={cn("flex items-center gap-2", ADMIN_TITLE_CLASS)}>
              <TrendingUp className="h-5 w-5 text-blue-600" />
              Platform traffic
            </CardTitle>
            <CardDescription>API request volume over the last 24 hours</CardDescription>
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Last hour</p>
              <p className="font-medium tabular-nums">{recentRequests}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Last 24h</p>
              <p className="font-medium tabular-nums">{dailyRequests}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Peak hour</p>
              <p className="font-medium tabular-nums">
                {peakHour.count} <span className="text-muted-foreground font-normal">@ {peakHour.label}</span>
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Avg response</p>
              <p className="font-medium tabular-nums">{avgResponseTime}ms</p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hourlyRequests} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="trafficRequests" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="trafficErrors" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "#6b7280" }}
                  interval="preserveStartEnd"
                  tickLine={false}
                  axisLine={{ stroke: "#e5e7eb" }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#6b7280" }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<TrafficTooltip />} />
                <Legend
                  verticalAlign="top"
                  height={28}
                  iconType="circle"
                  formatter={(value) => <span className="text-xs text-muted-foreground">{value}</span>}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  name="Requests"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fill="url(#trafficRequests)"
                  activeDot={{ r: 4 }}
                />
                <Area
                  type="monotone"
                  dataKey="errors"
                  name="Errors"
                  stroke="#ef4444"
                  strokeWidth={2}
                  fill="url(#trafficErrors)"
                  activeDot={{ r: 4 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-72 flex flex-col items-center justify-center text-muted-foreground gap-2">
            <TrendingUp className="h-10 w-10 opacity-30" />
            <p className="text-sm">No platform traffic recorded in the last 24 hours</p>
            <p className="text-xs">Traffic appears here as users interact with the API</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
