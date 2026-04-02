import { useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface Sale {
  date: string | Date;
  revenue: number;
}

interface SalesTrendChartProps {
  sales?: Sale[];
  className?: string;
}

export function SalesTrendChart({ sales = [], className }: SalesTrendChartProps) {
  // Calculate last 7 days sales data
  const chartData = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(today);
      date.setDate(date.getDate() - (6 - i));
      return date;
    });

    return last7Days.map((date, index) => {
      const dateStr = date.toISOString().split('T')[0];
      const daySales = sales.filter((sale) => {
        const saleDate = typeof sale.date === 'string' 
          ? sale.date.split('T')[0] 
          : new Date(sale.date).toISOString().split('T')[0];
        return saleDate === dateStr;
      });
      
      const totalRevenue = daySales.reduce((sum, sale) => sum + sale.revenue, 0);
      
      return {
        day: days[date.getDay()],
        sales: totalRevenue,
      };
    });
  }, [sales]);
  return (
    <div className={cn("kpi-card bg-white rounded-none border border-gray-200 shadow-sm", className)}>
      <h3 className="section-title text-gray-600">Sales Trend (Last 7 Days)</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" strokeOpacity={0.5} vertical={false} />
            <XAxis
              dataKey="day"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#475569", fontSize: 12, fontWeight: 500 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#475569", fontSize: 12, fontWeight: 500 }}
              tickFormatter={(value) => `rwf ${(value / 1000).toFixed(1)}k`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#ffffff",
                border: "1px solid #cbd5e1",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
              }}
              labelStyle={{ color: "#475569", fontWeight: 600 }}
              itemStyle={{ color: "#5b8fc7", fontWeight: 600 }}
              formatter={(value: number) => [`rwf ${value.toLocaleString()}`, "Sales"]}
            />
            <Bar
              dataKey="sales"
              fill="#5b8fc7"
              radius={[6, 6, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
