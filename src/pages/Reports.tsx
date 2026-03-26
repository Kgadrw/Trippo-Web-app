import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Banknote, Download, Package, TrendingUp, Trophy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { playInfoBeep, initAudio } from "@/lib/sound";
import { useApi } from "@/hooks/useApi";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "@/hooks/useTranslation";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface Product {
  id?: number;
  _id?: string;
  name: string;
  category: string;
  costPrice: number;
  sellingPrice: number;
  stock: number;
}

interface Sale {
  id?: number;
  _id?: string;
  product: string;
  quantity: number;
  revenue: number;
  cost: number;
  profit: number;
  date: string;
  saleType?: "product" | "service";
  workerName?: string;
  serviceName?: string;
}

interface Expense {
  id?: number;
  _id?: string;
  title: string;
  amount: number;
  date: string;
  category?: string;
}

const Reports = () => {
  const { t, language } = useTranslation();
  const isRw = language === "rw";
  const isFr = language === "fr";
  const { toast } = useToast();
  const {
    isLoading: productsLoading,
  } = useApi<Product>({
    endpoint: "products",
    defaultValue: [],
    onError: (error: any) => {
      // Don't show errors for connection issues (offline mode)
      if (error?.response?.silent || error?.response?.connectionError) {
        console.log("Offline mode: using local data");
        return;
      }
      console.error("Error loading products:", error);
      toast({
        title: "Error",
        description: "Failed to load products. Please try again.",
        variant: "destructive",
      });
    },
  });
  const {
    items: sales,
    isLoading: salesLoading,
  } = useApi<Sale>({
    endpoint: "sales",
    defaultValue: [],
    onError: (error: any) => {
      // Don't show errors for connection issues (offline mode)
      if (error?.response?.silent || error?.response?.connectionError) {
        console.log("Offline mode: using local data");
        return;
      }
      console.error("Error loading sales:", error);
      toast({
        title: "Error",
        description: "Failed to load sales. Please try again.",
        variant: "destructive",
      });
    },
  });
  const { items: expenses } = useApi<Expense>({
    endpoint: "expenses",
    defaultValue: [],
  });

  const getTodayDate = () => new Date().toISOString().split("T")[0];
  const getYearStartDate = () => {
    const date = new Date();
    date.setMonth(0);
    date.setDate(1);
    return date.toISOString().split("T")[0];
  };

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reportType, setReportType] = useState("weekly");

  const getSaleTimeMs = (sale: Sale) => {
    const d = new Date((sale as any).timestamp || sale.date);
    const ms = d.getTime();
    return Number.isNaN(ms) ? null : ms;
  };

  type PeriodKey =
    | { type: "daily"; key: string; label: string; sortKey: string }
    | { type: "weekly"; key: string; label: string; sortKey: string }
    | { type: "monthly"; key: string; label: string; sortKey: string };

  const getPeriodKey = (when: Date, type: string): PeriodKey | null => {
    const d = new Date(when);
    const ms = d.getTime();
    if (Number.isNaN(ms)) return null;

    if (type === "daily") {
      const key = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      return { type: "daily", key, label, sortKey: key };
    }

    if (type === "weekly") {
      // Week starts on Sunday to match existing chart logic
      const weekStart = new Date(d);
      weekStart.setHours(0, 0, 0, 0);
      weekStart.setDate(d.getDate() - d.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      const key = weekStart.toISOString().slice(0, 10);
      const label = `${weekStart.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })} - ${weekEnd.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
      return { type: "weekly", key, label, sortKey: key };
    }

    if (type === "monthly") {
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const monthLabel = d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
      return { type: "monthly", key: monthKey, label: monthLabel, sortKey: monthKey };
    }

    return null;
  };


  // Filter sales by date range
  const filteredSales = useMemo(() => {
    if (!startDate && !endDate) {
      // If no date filters, show all sales
      return sales;
    }
    
    return sales.filter(sale => {
      const saleDate = new Date(sale.date);
      saleDate.setHours(0, 0, 0, 0); // Normalize to start of day
      
      const start = startDate ? new Date(startDate) : null;
      if (start) {
        start.setHours(0, 0, 0, 0);
      }
      
      const end = endDate ? new Date(endDate) : null;
      if (end) {
        end.setHours(23, 59, 59, 999); // Set to end of day
      }
      
      if (start && end) {
      return saleDate >= start && saleDate <= end;
      } else if (start) {
        return saleDate >= start;
      } else if (end) {
        return saleDate <= end;
      }
      return true;
    });
  }, [sales, startDate, endDate]);

  const filteredExpenses = useMemo(() => {
    if (!startDate && !endDate) return expenses;
    return expenses.filter((expense) => {
      const expenseDate = new Date(expense.date);
      expenseDate.setHours(0, 0, 0, 0);
      const start = startDate ? new Date(startDate) : null;
      if (start) start.setHours(0, 0, 0, 0);
      const end = endDate ? new Date(endDate) : null;
      if (end) end.setHours(23, 59, 59, 999);
      if (start && end) return expenseDate >= start && expenseDate <= end;
      if (start) return expenseDate >= start;
      if (end) return expenseDate <= end;
      return true;
    });
  }, [expenses, startDate, endDate]);

  // Aggregate sales data by product
  const salesByProduct = useMemo(() => {
    const aggregated: Record<string, { product: string; quantity: number; revenue: number; profit: number; cost: number }> = {};
    
    filteredSales.forEach(sale => {
      if (!aggregated[sale.product]) {
        aggregated[sale.product] = {
          product: sale.product,
          quantity: 0,
          revenue: 0,
          profit: 0,
          cost: 0,
        };
      }
      aggregated[sale.product].quantity += sale.quantity;
      aggregated[sale.product].revenue += sale.revenue;
      aggregated[sale.product].profit += sale.profit;
      aggregated[sale.product].cost += sale.cost;
    });

    return Object.values(aggregated).sort((a, b) => b.revenue - a.revenue);
  }, [filteredSales]);

  // Prepare sales over time data based on report type
  const salesOverTimeData = useMemo(() => {
    const timeMap: Record<string, { date: string; revenue: number; profit: number; quantity: number; label: string; monthDay: string }> = {};
    
    if (reportType === "daily") {
      // Daily: Show all days in the selected date range
      if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const currentDate = new Date(start);
      
      // Initialize all days in the range with zero values
      while (currentDate <= end) {
        const dateKey = currentDate.toISOString().split("T")[0];
        const date = new Date(currentDate);
        const month = date.toLocaleDateString('en-US', { month: 'short' });
        const day = date.getDate();
        
        timeMap[dateKey] = {
          date: dateKey,
          revenue: 0,
          profit: 0,
          quantity: 0,
          label: `${month} ${day}`,
          monthDay: `${String(date.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        };
        currentDate.setDate(currentDate.getDate() + 1);
        }
      }
      
      // Add sales data to the corresponding days
      filteredSales.forEach(sale => {
        const saleDate = sale.date;
        if (timeMap[saleDate]) {
          timeMap[saleDate].revenue += sale.revenue;
          timeMap[saleDate].profit += sale.profit;
          timeMap[saleDate].quantity += sale.quantity;
        } else if (!startDate && !endDate) {
          // If no date filter, create entries for all sales dates
          const date = new Date(saleDate);
          const month = date.toLocaleDateString('en-US', { month: 'short' });
          const day = date.getDate();
          
          if (!timeMap[saleDate]) {
            timeMap[saleDate] = {
              date: saleDate,
              revenue: 0,
              profit: 0,
              quantity: 0,
              label: `${month} ${day}`,
              monthDay: `${String(date.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
            };
          }
          timeMap[saleDate].revenue += sale.revenue;
          timeMap[saleDate].profit += sale.profit;
          timeMap[saleDate].quantity += sale.quantity;
        }
      });
    } else if (reportType === "weekly") {
      // Weekly: Aggregate by weeks
      filteredSales.forEach(sale => {
        const date = new Date(sale.date);
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay()); // Start of week (Sunday)
        const weekKey = weekStart.toISOString().split("T")[0];
        
        if (!timeMap[weekKey]) {
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 6);
          timeMap[weekKey] = {
            date: weekKey,
            revenue: 0,
            profit: 0,
            quantity: 0,
            label: `Week of ${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
            monthDay: `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
          };
        }
        timeMap[weekKey].revenue += sale.revenue;
        timeMap[weekKey].profit += sale.profit;
        timeMap[weekKey].quantity += sale.quantity;
      });
    } else if (reportType === "monthly") {
      // Monthly: Aggregate by months
      filteredSales.forEach(sale => {
        const date = new Date(sale.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!timeMap[monthKey]) {
          const monthName = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
          timeMap[monthKey] = {
            date: monthKey,
            revenue: 0,
            profit: 0,
            quantity: 0,
            label: monthName,
            monthDay: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          };
        }
        timeMap[monthKey].revenue += sale.revenue;
        timeMap[monthKey].profit += sale.profit;
        timeMap[monthKey].quantity += sale.quantity;
      });
      
      // For monthly, also generate empty months in the range for completeness
      if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const currentDate = new Date(start.getFullYear(), start.getMonth(), 1);
      
      while (currentDate <= end) {
        const monthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
        if (!timeMap[monthKey]) {
          const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
          timeMap[monthKey] = {
            date: monthKey,
            revenue: 0,
            profit: 0,
            quantity: 0,
            label: monthName,
            monthDay: currentDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          };
        }
        currentDate.setMonth(currentDate.getMonth() + 1);
        }
      }
    }

    // Convert to array and sort
    return Object.values(timeMap)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredSales, reportType, startDate, endDate]);

  const totalRevenue = salesByProduct.reduce((sum, item) => sum + item.revenue, 0);
  const totalCost = salesByProduct.reduce((sum, item) => sum + item.cost, 0);
  const grossProfit = salesByProduct.reduce((sum, item) => sum + item.profit, 0);
  const totalExpenses = filteredExpenses.reduce((sum, item) => sum + (item.amount || 0), 0);
  const totalProfit = grossProfit - totalExpenses;
  const totalQuantity = salesByProduct.reduce((sum, item) => sum + item.quantity, 0);
  const bestSelling = salesByProduct.length > 0 
    ? salesByProduct.reduce((best, item) => item.quantity > best.quantity ? item : best)
    : { product: "N/A", quantity: 0 };

  const salesByBarber = useMemo(() => {
    const map: Record<string, { barber: string; services: number; revenue: number }> = {};
    filteredSales
      .filter((s) => s.saleType === "service" || !!s.workerName)
      .forEach((sale) => {
        const barber = sale.workerName || "Unassigned";
        if (!map[barber]) {
          map[barber] = { barber, services: 0, revenue: 0 };
        }
        map[barber].services += sale.quantity || 1;
        map[barber].revenue += sale.revenue || 0;
      });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue);
  }, [filteredSales]);

  const salesExpensesByPeriod = useMemo(() => {
    const map = new Map<
      string,
      {
        key: string;
        label: string;
        sortKey: string;
        salesRevenue: number;
        salesCost: number;
        salesProfit: number;
        expenses: number;
      }
    >();

    const type = reportType;

    for (const s of filteredSales) {
      const ms = getSaleTimeMs(s);
      if (ms === null) continue;
      const pk = getPeriodKey(new Date(ms), type);
      if (!pk) continue;
      const row = map.get(pk.key) || {
        key: pk.key,
        label: pk.label,
        sortKey: pk.sortKey,
        salesRevenue: 0,
        salesCost: 0,
        salesProfit: 0,
        expenses: 0,
      };
      row.salesRevenue += s.revenue || 0;
      row.salesCost += s.cost || 0;
      row.salesProfit += s.profit || 0;
      map.set(pk.key, row);
    }

    for (const e of filteredExpenses) {
      const d = new Date(e.date);
      const ms = d.getTime();
      if (Number.isNaN(ms)) continue;
      const pk = getPeriodKey(d, type);
      if (!pk) continue;
      const row = map.get(pk.key) || {
        key: pk.key,
        label: pk.label,
        sortKey: pk.sortKey,
        salesRevenue: 0,
        salesCost: 0,
        salesProfit: 0,
        expenses: 0,
      };
      row.expenses += e.amount || 0;
      map.set(pk.key, row);
    }

    return Array.from(map.values()).sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  }, [filteredSales, filteredExpenses, reportType]);

  const barberServiceBreakdown = useMemo(() => {
    const barberMap = new Map<
      string,
      {
        barber: string;
        servicesCount: number;
        revenue: number;
        serviceCounts: Map<string, number>;
      }
    >();

    for (const s of filteredSales) {
      if (!(s.saleType === "service" || s.workerName)) continue;
      const barber = (s.workerName || "Unassigned").toString();
      const service =
        (s.serviceName || s.product || "Service").toString().trim() || "Service";
      const qty = s.quantity || 1;

      const row =
        barberMap.get(barber) ||
        {
          barber,
          servicesCount: 0,
          revenue: 0,
          serviceCounts: new Map<string, number>(),
        };

      row.servicesCount += qty;
      row.revenue += s.revenue || 0;
      row.serviceCounts.set(service, (row.serviceCounts.get(service) || 0) + qty);
      barberMap.set(barber, row);
    }

    const rows = Array.from(barberMap.values()).map((r) => {
      let topCount = 0;
      for (const c of r.serviceCounts.values()) topCount = Math.max(topCount, c);
      const topServices = Array.from(r.serviceCounts.entries())
        .filter(([, c]) => c === topCount)
        .map(([name]) => name)
        .slice(0, 3);
      return {
        barber: r.barber,
        services: r.servicesCount,
        revenue: r.revenue,
        topServices,
        topCount,
      };
    });

    rows.sort((a, b) => b.revenue - a.revenue);
    return rows;
  }, [filteredSales]);

  const handleExport = (format: string) => {
    playInfoBeep();
    
    if (format === "pdf") {
      exportToPDF();
    } else if (format === "excel") {
      exportToExcel();
    }
    
    toast({
      title: isRw ? "Kohereza byatangiye" : "Export Started",
      description: isRw
        ? `Raporo iri koherezwa nka ${format.toUpperCase()}...`
        : `Exporting report as ${format.toUpperCase()}...`,
    });
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const margin = 14;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // Add header with logo and report info on same line
    addHeader(doc, pageWidth, margin, reportType, startDate, endDate);
    
    // Start content after header
    let yPosition = 30;

    // Header already added above

    // Summary Section - Display as columns/headers
    doc.setFontSize(14);
    doc.setFont("helvetica", "normal");
    doc.text("Summary", margin, yPosition);
    yPosition += 8;

    // Summary as columns (headers with values below)
    const summaryHeaders = [
      'Total Revenue',
      'Total Cost', 
      'Total Profit',
      'Quantity Sold',
      'Best-Selling',
      'Best Qty',
      'Profit Margin'
    ];
    
    const summaryValues = [
      `rwf ${totalRevenue.toLocaleString()}`,
      `rwf ${totalCost.toLocaleString()}`,
      `rwf ${totalProfit.toLocaleString()}`,
      totalQuantity.toString(),
      bestSelling.product.length > 15 ? bestSelling.product.substring(0, 15) + '...' : bestSelling.product,
      `${bestSelling.quantity}`,
      totalRevenue > 0 ? `${((totalProfit / totalRevenue) * 100).toFixed(1)}%` : '0.0%'
    ];

    autoTable(doc, {
      startY: yPosition,
      head: [summaryHeaders],
      body: [summaryValues],
      theme: 'striped',
      headStyles: { fillColor: [107, 114, 128], textColor: 255, fontStyle: 'normal', fontSize: 9 }, // Gray-500
      styles: { fontSize: 9, textColor: [31, 41, 55], halign: 'center' }, // Gray-800, centered
      margin: { left: margin, right: margin },
      columnStyles: {
        0: { cellWidth: 'auto', halign: 'center' },
        1: { cellWidth: 'auto', halign: 'center' },
        2: { cellWidth: 'auto', halign: 'center' },
        3: { cellWidth: 'auto', halign: 'center' },
        4: { cellWidth: 'auto', halign: 'center' },
        5: { cellWidth: 'auto', halign: 'center' },
        6: { cellWidth: 'auto', halign: 'center' },
      },
      didDrawPage: (data: any) => {
        // Add header and footer on each page
        addHeader(doc, pageWidth, margin, reportType, startDate, endDate);
        addFooter(doc, pageWidth, pageHeight, margin);
      },
    });
    yPosition = (doc as any).lastAutoTable.finalY + 12;

    // Sales by Product Table
    if (salesByProduct.length > 0) {
      doc.setFontSize(14);
      doc.setFont("helvetica", "normal");
      doc.text("Sales by Product", margin, yPosition);
      yPosition += 8;

      const tableData = salesByProduct.map(item => {
        const profitMargin = item.revenue > 0 ? ((item.profit / item.revenue) * 100).toFixed(1) : '0.0';
        return [
          item.product,
          item.quantity.toString(),
          `rwf ${item.revenue.toLocaleString()}`,
          `rwf ${item.cost.toLocaleString()}`,
          `rwf ${item.profit.toLocaleString()}`,
          `${profitMargin}%`
        ];
      });

      autoTable(doc, {
        startY: yPosition,
        head: [['Product', 'Quantity', 'Revenue', 'Cost', 'Profit', 'Profit Margin']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [107, 114, 128], textColor: 255, fontStyle: 'normal' }, // Gray-500
        alternateRowStyles: { fillColor: [249, 250, 251] }, // Gray-50
        styles: { fontSize: 9, textColor: [31, 41, 55] }, // Gray-800
        margin: { left: margin, right: margin },
        didDrawPage: (data: any) => {
          // Add header and footer on each page
          addHeader(doc, pageWidth, margin, reportType, startDate, endDate);
          addFooter(doc, pageWidth, pageHeight, margin);
        },
      });
      yPosition = (doc as any).lastAutoTable.finalY + 10;
    }

    // Sales Over Time Table
    if (salesOverTimeData.length > 0) {
      // Check if we need a new page
      if (yPosition > 250) {
        doc.addPage();
        addHeader(doc, pageWidth, margin, reportType, startDate, endDate);
        yPosition = 30; // Start after header
      }

      doc.setFontSize(14);
      doc.setFont("helvetica", "normal");
      doc.text(`Sales Over Time (${reportType.charAt(0).toUpperCase() + reportType.slice(1)})`, margin, yPosition);
      yPosition += 8;

      const timeTableData = salesOverTimeData
        .filter(item => item.revenue > 0 || item.profit > 0) // Only show periods with sales
        .slice(0, 50) // Limit to 50 rows to avoid PDF being too large
        .map(item => {
          const dateLabel = reportType === "daily" 
            ? new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            : reportType === "weekly"
            ? item.monthDay
            : item.monthDay;
          return [
            dateLabel,
            `rwf ${item.revenue.toLocaleString()}`,
            `rwf ${item.profit.toLocaleString()}`,
            item.quantity.toString()
          ];
        });

      if (timeTableData.length > 0) {
        autoTable(doc, {
          startY: yPosition,
          head: [['Period', 'Revenue', 'Profit', 'Quantity']],
          body: timeTableData,
          theme: 'striped',
          headStyles: { fillColor: [107, 114, 128], textColor: 255, fontStyle: 'normal' }, // Gray-500
          alternateRowStyles: { fillColor: [249, 250, 251] }, // Gray-50
          styles: { fontSize: 9, textColor: [31, 41, 55] }, // Gray-800
          margin: { left: margin, right: margin },
          didDrawPage: (data: any) => {
            // Add header and footer on each page
            addHeader(doc, pageWidth, margin, reportType, startDate, endDate);
            addFooter(doc, pageWidth, pageHeight, margin);
          },
        });
      }
    }

    // Add footer to the last page
    const totalPages = doc.internal.pages.length - 1;
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      addFooter(doc, pageWidth, pageHeight, margin, i, totalPages);
    }

    // Save the PDF
    const fileName = `Sales_Report_${reportType}_${startDate}_to_${endDate}.pdf`;
    doc.save(fileName);
  };

  // Helper function to add header to each page (logo and report info on same line)
  const addHeader = (doc: jsPDF, pageWidth: number, margin: number, reportType?: string, startDate?: string, endDate?: string) => {
    // Try to add logo image
    let logoX = margin;
    let logoHeight = 6;
    let logoY = 12; // Vertical center alignment
    
    try {
      // Get logo from DOM if available (for synchronous access)
      const logoElement = document.querySelector('img[src="/logo.png"]') as HTMLImageElement;
      if (logoElement && logoElement.complete) {
        // Create canvas to convert image to base64
        const canvas = document.createElement('canvas');
        canvas.width = logoElement.naturalWidth || 32;
        canvas.height = logoElement.naturalHeight || 32;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(logoElement, 0, 0);
          const imgData = canvas.toDataURL('image/png');
          // Add logo image (6mm height, vertically centered)
          doc.addImage(imgData, 'PNG', margin, logoY, logoHeight, logoHeight);
          logoX = margin + logoHeight + 2; // 2mm spacing between logo and text
        }
      }
    } catch (error) {
      // Logo failed, continue with text only
    }
    
    // Add "trippo" text next to logo (vertically aligned)
    doc.setTextColor(55, 65, 81); // Gray-700 text
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    // Calculate text Y position to align with logo center (logoY + logoHeight/2 - textHeight/2)
    const textY = logoY + logoHeight / 2 + 2; // +2 for slight adjustment
    doc.text("trippo", logoX, textY);
    
    // Add report info on the same line (right side)
    if (reportType && startDate && endDate) {
      const reportTypeText = `Report Type: ${reportType.charAt(0).toUpperCase() + reportType.slice(1)}`;
      const dateRangeText = `Date Range: ${startDate} to ${endDate}`;
      const generatedText = `Generated: ${new Date().toLocaleString()}`;
      const separator = "  •  ";
      const fullInfoText = `${reportTypeText}${separator}${dateRangeText}${separator}${generatedText}`;
      
      doc.setFontSize(8);
      doc.setTextColor(107, 114, 128); // Gray-500
      // Calculate text width and position it on the right, aligned with logo/text line
      const textWidth = doc.getTextWidth(fullInfoText);
      const infoX = pageWidth - margin - textWidth;
      doc.text(fullInfoText, infoX, textY); // Use same Y position as "trippo" text
    }
    
    // Draw a subtle line separator
    doc.setDrawColor(229, 231, 235); // Gray-200
    doc.line(margin, 20, pageWidth - margin, 20);
    
    // Reset text color for body
    doc.setTextColor(0, 0, 0); // Black text
  };

  // Helper function to add footer to each page
  const addFooter = (doc: jsPDF, pageWidth: number, pageHeight: number, margin: number, currentPage?: number, totalPages?: number) => {
    const footerY = pageHeight - 15;
    
    // Draw a line separator
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);
    
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100); // Gray text
    
    // Left side - Generated by Trippo
    doc.text("Generated by Trippo", margin, footerY);
    
    // Right side - Page number and date
    const rightText = currentPage && totalPages 
      ? `Page ${currentPage} of ${totalPages} | ${new Date().toLocaleDateString()}`
      : new Date().toLocaleDateString();
    doc.text(rightText, pageWidth - margin, footerY, { align: 'right' });
    
    // Reset text color
    doc.setTextColor(0, 0, 0);
  };

  const exportToExcel = () => {
    const workbook = XLSX.utils.book_new();

    // Summary Sheet
    const summaryData = [
      ['Report Summary'],
      [''],
      ['Report Type', reportType.charAt(0).toUpperCase() + reportType.slice(1)],
      ['Start Date', startDate],
      ['End Date', endDate],
      ['Generated', new Date().toLocaleString()],
      [''],
      ['Total Revenue', `rwf ${totalRevenue.toLocaleString()}`],
      ['Total Cost', `rwf ${totalCost.toLocaleString()}`],
      ['Total Profit', `rwf ${totalProfit.toLocaleString()}`],
      ['Total Quantity Sold', totalQuantity],
      ['Best-Selling Product', bestSelling.product],
      ['Best-Selling Quantity', bestSelling.quantity],
    ];
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

    // Sales by Product Sheet
    if (salesByProduct.length > 0) {
      const productHeaders = ['Product', 'Quantity Sold', 'Revenue', 'Cost', 'Profit', 'Profit Margin %'];
      const productData = salesByProduct.map(item => {
        const profitMargin = item.revenue > 0 ? ((item.profit / item.revenue) * 100).toFixed(1) : '0.0';
        return [
          item.product,
          item.quantity,
          item.revenue,
          item.cost,
          item.profit,
          parseFloat(profitMargin)
        ];
      });
      const productSheet = XLSX.utils.aoa_to_sheet([productHeaders, ...productData]);
      XLSX.utils.book_append_sheet(workbook, productSheet, 'Sales by Product');
    }

    // Sales Over Time Sheet
    if (salesOverTimeData.length > 0) {
      const timeHeaders = ['Period', 'Date', 'Revenue', 'Profit', 'Quantity'];
      const timeData = salesOverTimeData.map(item => {
        const dateLabel = reportType === "daily" 
          ? new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          : reportType === "weekly"
          ? item.monthDay
          : item.monthDay;
        return [
          dateLabel,
          item.date,
          item.revenue,
          item.profit,
          item.quantity
        ];
      });
      const timeSheet = XLSX.utils.aoa_to_sheet([timeHeaders, ...timeData]);
      XLSX.utils.book_append_sheet(workbook, timeSheet, `Sales Over Time (${reportType})`);
    }

    // Save the Excel file
    const fileName = `Sales_Report_${reportType}_${startDate}_to_${endDate}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };


  const ReportsSkeleton = () => (
    <AppLayout title={t("reports")}>
      <div className="mx-auto max-w-5xl space-y-6 pb-8">
        <div className="rounded-lg border border-border bg-white p-5">
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-10 w-10 shrink-0 rounded-lg" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-7 w-24" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-border bg-white p-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-10 w-full rounded-md" />
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-border bg-white p-4">
          <Skeleton className="mb-4 h-4 w-48" />
          <Skeleton className="h-80 w-full rounded" />
        </div>
      </div>
    </AppLayout>
  );

  if (productsLoading || salesLoading) {
    return <ReportsSkeleton />;
  }

  const reportTypeLabel =
    reportType === "daily"
      ? isRw
        ? "Buri munsi"
        : isFr
        ? "Quotidien"
        : "Daily"
      : reportType === "weekly"
      ? isRw
        ? "Buri cyumweru"
        : isFr
        ? "Hebdomadaire"
        : "Weekly"
      : isRw
      ? "Buri kwezi"
      : isFr
      ? "Mensuel"
      : "Monthly";
  const topBarber = salesByBarber[0];

  return (
    <AppLayout title={t("reports")}>
      <div className="mx-auto max-w-5xl space-y-8 pb-8">
        {/* Summary */}
        <div className="rounded-lg border border-border bg-white px-4 py-5 sm:px-6">
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            <div className="flex min-w-0 gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                <Banknote className="h-5 w-5" aria-hidden />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{t("totalRevenue")}</p>
                <p className="mt-1 text-lg font-medium tabular-nums text-foreground">{totalRevenue.toLocaleString()}</p>
              </div>
            </div>
            <div className="flex min-w-0 gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <Package className="h-5 w-5" aria-hidden />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">
                  {isRw ? "Agaciro" : isFr ? "Coût total" : "Total Cost"}
                </p>
                <p className="mt-1 text-lg font-medium tabular-nums text-foreground">{totalCost.toLocaleString()}</p>
              </div>
            </div>
            <div className="flex min-w-0 gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                <TrendingUp className="h-5 w-5" aria-hidden />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{isRw ? "Inyungu isigaye" : "Net Profit"}</p>
                <p className="mt-1 text-lg font-medium tabular-nums text-foreground">{totalProfit.toLocaleString()}</p>
              </div>
            </div>
            <div className="flex min-w-0 gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
                <Trophy className="h-5 w-5" aria-hidden />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{isRw ? "Amafaranga yakoreshejwe" : "Total Expenses"}</p>
                <p className="mt-1 truncate text-lg font-medium text-foreground">
                  {totalExpenses.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="rounded-lg border border-border bg-white p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="grid flex-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-normal text-muted-foreground">{t("startDate")}</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-9 border-border bg-background"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-normal text-muted-foreground">{t("endDate")}</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-9 border-border bg-background"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
                <Label className="text-xs font-normal text-muted-foreground">
                  {isRw ? "Igihe" : isFr ? "Période" : "Period"}
                </Label>
                <ToggleGroup
                  type="single"
                  value={reportType}
                  onValueChange={(v) => v && setReportType(v)}
                  className="grid grid-cols-3 gap-1.5 w-full"
                  variant="outline"
                  size="sm"
                >
                  <ToggleGroupItem value="daily" className="h-9 text-xs">
                    {isRw ? "Umunsi" : isFr ? "Jour" : "Day"}
                  </ToggleGroupItem>
                  <ToggleGroupItem value="weekly" className="h-9 text-xs">
                    {isRw ? "Icyumweru" : isFr ? "Semaine" : "Week"}
                  </ToggleGroupItem>
                  <ToggleGroupItem value="monthly" className="h-9 text-xs">
                    {isRw ? "Ukwezi" : isFr ? "Mois" : "Month"}
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => handleExport("pdf")}>
                <Download className="h-3.5 w-3.5" />
                {t("exportPdf")}
              </Button>
              <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => handleExport("excel")}>
                <Download className="h-3.5 w-3.5" />
                {t("exportExcel")}
              </Button>
            </div>
          </div>
        </div>

        {/* Sales & Expenses table (by day/week/month) */}
        <div className="rounded-lg border border-border bg-white p-4 sm:p-5">
          <h3 className="mb-1 text-sm font-medium text-foreground">
            {isRw ? "Incamake y'amafaranga" : isFr ? "Ventes & dépenses" : "Sales & Expenses"}
          </h3>
          <p className="mb-3 text-xs text-muted-foreground">
            {isRw
              ? "Ibyinjijwe, ibyakoreshejwe, n'inyungu ku gihe wahisemo"
              : isFr
              ? "Revenus, dépenses et bénéfice net par période"
              : "Revenue, expenses, and net profit by period"}
          </p>

          {salesExpensesByPeriod.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead className="bg-gray-100 border-b border-gray-200">
                  <tr>
                    <th className="text-left text-xs font-semibold text-gray-700 py-3 px-3">
                      {isRw ? "Igihe" : isFr ? "Période" : "Period"}
                    </th>
                    <th className="text-left text-xs font-semibold text-gray-700 py-3 px-3">
                      {t("revenue")}
                    </th>
                    <th className="text-left text-xs font-semibold text-gray-700 py-3 px-3">
                      {isRw ? "Ibikiguzi" : isFr ? "Dépenses" : "Expenses"}
                    </th>
                    <th className="text-left text-xs font-semibold text-gray-700 py-3 px-3">
                      {isRw ? "Inyungu" : isFr ? "Bénéfice net" : "Net"}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {salesExpensesByPeriod.map((row) => {
                    const net = (row.salesProfit || 0) - (row.expenses || 0);
                    return (
                      <tr key={row.key} className="border-b border-gray-200">
                        <td className="py-3 px-3 text-sm text-gray-900 whitespace-nowrap">
                          {row.label}
                        </td>
                        <td className="py-3 px-3 text-sm text-gray-700 whitespace-nowrap">
                          {row.salesRevenue.toLocaleString()} rwf
                        </td>
                        <td className="py-3 px-3 text-sm text-gray-700 whitespace-nowrap">
                          {row.expenses.toLocaleString()} rwf
                        </td>
                        <td
                          className={cn(
                            "py-3 px-3 text-sm font-semibold whitespace-nowrap",
                            net >= 0 ? "text-emerald-700" : "text-red-700"
                          )}
                        >
                          {net >= 0 ? "+" : ""}
                          {net.toLocaleString()} rwf
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {isRw
                ? "Nta makuru aboneka muri iki gihe."
                : isFr
                ? "Aucune donnée pour cette période."
                : "No data for the selected period."}
            </p>
          )}
        </div>

        {/* Single overview chart: revenue, profit (Rwf) + quantity (units) */}
        <div className="rounded-lg border border-border bg-white p-4 sm:p-5">
          <h3 className="mb-1 text-sm font-medium text-foreground">
            {isRw ? "Incamake y'ubucuruzi" : isFr ? "Aperçu des ventes" : "Sales overview"}
          </h3>
          <p className="mb-4 text-xs text-muted-foreground">
            {t("revenue")}, {t("profit")}, {t("quantity")} · {reportTypeLabel}
          </p>
          {salesOverTimeData.length > 0 ? (
            <div className="w-full overflow-x-auto">
              <ResponsiveContainer width="100%" minWidth={300} height={380}>
                <ComposedChart
                  data={salesOverTimeData}
                  margin={{ top: 8, right: 12, left: 4, bottom: reportType === "daily" ? 72 : 56 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="monthDay"
                    tick={{ fontSize: reportType === "daily" ? 9 : 11, fill: "#6b7280" }}
                    angle={-45}
                    textAnchor="end"
                    height={reportType === "daily" ? 100 : 80}
                    interval={
                      reportType === "daily"
                        ? Math.max(0, Math.floor(salesOverTimeData.length / 12) - 1)
                        : 0
                    }
                    tickFormatter={(value) => {
                      if (reportType === "daily") {
                        const item = salesOverTimeData.find((d) => d.monthDay === value);
                        if (item) {
                          const date = new Date(item.date);
                          return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                        }
                      }
                      return value;
                    }}
                  />
                  <YAxis
                    yAxisId="left"
                    tick={{ fontSize: 11, fill: "#6b7280" }}
                    tickFormatter={(value) => {
                      if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
                      if (value >= 1_000) return `${(value / 1_000).toFixed(0)}k`;
                      return `${value}`;
                    }}
                    label={{
                      value: "Rwf",
                      angle: -90,
                      position: "insideLeft",
                      style: { fill: "#9ca3af", fontSize: 11 },
                    }}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 11, fill: "#6b7280" }}
                    label={{
                      value: t("quantity"),
                      angle: 90,
                      position: "insideRight",
                      style: { fill: "#9ca3af", fontSize: 11 },
                    }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      border: "1px solid #e5e7eb",
                      borderRadius: "6px",
                      padding: "10px",
                      boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
                    }}
                    labelStyle={{ color: "#374151", fontWeight: 600, marginBottom: "4px" }}
                    labelFormatter={(value) => {
                      const item = salesOverTimeData.find((d) => d.monthDay === value);
                      if (!item) return value;
                      if (reportType === "daily") {
                        const date = new Date(item.date);
                        return date.toLocaleDateString("en-US", {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        });
                      }
                      return item.label;
                    }}
                    formatter={(value: number, name: string) => {
                      if (name === "revenue") return [`rwf ${value.toLocaleString()}`, t("revenue")];
                      if (name === "profit") return [`rwf ${value.toLocaleString()}`, t("profit")];
                      if (name === "quantity") return [value.toLocaleString(), t("quantity")];
                      return [value, name];
                    }}
                  />
                  <Legend wrapperStyle={{ paddingTop: "16px" }} />
                  <Bar
                    yAxisId="left"
                    dataKey="revenue"
                    fill="#3b82f6"
                    name={t("revenue")}
                    radius={[2, 2, 0, 0]}
                    maxBarSize={48}
                  />
                  <Bar
                    yAxisId="left"
                    dataKey="profit"
                    fill="#10b981"
                    name={t("profit")}
                    radius={[2, 2, 0, 0]}
                    maxBarSize={48}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="quantity"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "#f59e0b" }}
                    name={t("quantity")}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
              {isRw ? "Nta makuru y'ubucuruzi aboneka" : isFr ? "Aucune donnée de ventes disponible" : "No sales data available"}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-border bg-white p-4 sm:p-5">
            <h3 className="mb-1 text-sm font-medium text-foreground">
              {isRw ? "Raporo ya serivisi" : isFr ? "Performance des services" : "Service performance"}
            </h3>
            <p className="mb-3 text-xs text-muted-foreground">
              {isRw
                ? "Serivisi zagurishijwe cyane ukurikije amafaranga yinjiye"
                : isFr
                ? "Services les plus populaires selon le chiffre d'affaires"
                : "Top services ranked by revenue"}
            </p>
            {salesByProduct.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead className="bg-gray-100 border-b border-gray-200">
                    <tr>
                      <th className="text-left text-xs font-semibold text-gray-700 py-3 px-3">
                        {isRw ? "Serivisi" : isFr ? "Service" : "Service"}
                      </th>
                      <th className="text-left text-xs font-semibold text-gray-700 py-3 px-3">{t("quantity")}</th>
                      <th className="text-left text-xs font-semibold text-gray-700 py-3 px-3">{t("revenue")}</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {salesByProduct.slice(0, 10).map((row) => (
                      <tr key={row.product} className="border-b border-gray-200">
                        <td className="py-3 px-3 text-sm text-gray-900">{row.product}</td>
                        <td className="py-3 px-3 text-sm text-gray-700">{row.quantity}</td>
                        <td className="py-3 px-3 text-sm text-gray-700">{row.revenue.toLocaleString()} rwf</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {isRw
                  ? "Nta makuru ya serivisi aboneka."
                  : isFr
                  ? "Aucun enregistrement de service trouvé."
                  : "No service records found."}
              </p>
            )}
          </div>

          <div className="rounded-lg border border-border bg-white p-4 sm:p-5">
            <h3 className="mb-1 text-sm font-medium text-foreground">
              {isRw
                ? "Imikorere y'Umwogoshi"
                : isFr
                ? "Performance des coiffeurs"
                : "Barber performance"}
            </h3>
            <p className="mb-3 text-xs text-muted-foreground">
              {topBarber
                ? isRw
                  ? `Uyoboye ni ${topBarber.barber} na rwf ${topBarber.revenue.toLocaleString()}`
                  : isFr
                  ? `Meilleur coiffeur : ${topBarber.barber} avec ${topBarber.revenue.toLocaleString()} rwf`
                  : `Top performer: ${topBarber.barber} with rwf ${topBarber.revenue.toLocaleString()}`
                : isRw
                ? "Nta makuru y'abogoshi muri iki gihe."
                : isFr
                ? "Aucun enregistrement de coiffeur pour cette période."
                : "No barber records for this period."}
            </p>
            {barberServiceBreakdown.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead className="bg-gray-100 border-b border-gray-200">
                    <tr>
                      <th className="text-left text-xs font-semibold text-gray-700 py-3 px-3">
                        {isRw ? "Umwogoshi" : isFr ? "Coiffeur" : "Barber"}
                      </th>
                      <th className="text-left text-xs font-semibold text-gray-700 py-3 px-3">
                        {isRw ? "Serivisi" : isFr ? "Services" : "Services"}
                      </th>
                      <th className="text-left text-xs font-semibold text-gray-700 py-3 px-3">
                        {isRw ? "Serivisi zakunzwe" : isFr ? "Services les plus servis" : "Top services"}
                      </th>
                      <th className="text-left text-xs font-semibold text-gray-700 py-3 px-3">{t("revenue")}</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {barberServiceBreakdown.map((row) => (
                      <tr key={row.barber} className="border-b border-gray-200">
                        <td className="py-3 px-3 text-sm text-gray-900">{row.barber}</td>
                        <td className="py-3 px-3 text-sm text-gray-700">{row.services}</td>
                        <td className="py-3 px-3 text-sm text-gray-700">
                          {row.topServices.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {row.topServices.map((s) => (
                                <span
                                  key={s}
                                  className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] text-blue-700"
                                >
                                  {s}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-sm text-gray-700">{row.revenue.toLocaleString()} rwf</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {isRw
                  ? "Nta makuru y'Umwogoshi aboneka muri iki gihe."
                  : isFr
                  ? "Aucun enregistrement de services de coiffeur pour la période sélectionnée."
                  : "No barber service records found for the selected period."}
              </p>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Reports;
