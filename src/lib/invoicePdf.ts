import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export type InvoiceLineItem = {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
};

export type InvoicePdfData = {
  invoiceNumber: string;
  title: string;
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  lineItems: InvoiceLineItem[];
  amount: number;
  issueDate: string;
  dueDate: string;
  status?: string;
  note?: string;
  terms?: string;
};

export type StatementIncome = {
  title: string;
  amount: number;
  date: string;
};

export type StatementInvoice = InvoicePdfData & { status?: string };

function businessName() {
  return localStorage.getItem("profit-pilot-business-name") || "Trippo";
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function formatMoney(amount: number) {
  return `${Math.round(amount).toLocaleString()} Rwf`;
}

function addPdfHeader(doc: jsPDF, title: string, subtitle?: string) {
  const margin = 14;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(30, 41, 59);
  doc.text(businessName(), margin, 18);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(title, margin, 26);
  if (subtitle) {
    doc.text(subtitle, margin, 32);
  }
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, 36, doc.internal.pageSize.getWidth() - margin, 36);
}

export function downloadInvoicePdf(invoice: InvoicePdfData) {
  const doc = new jsPDF();
  const margin = 14;
  const pageWidth = doc.internal.pageSize.getWidth();

  addPdfHeader(doc, "INVOICE", invoice.invoiceNumber);

  let y = 44;
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.setFont("helvetica", "bold");
  doc.text("Bill To", margin, y);
  doc.setFont("helvetica", "normal");
  y += 6;
  doc.text(invoice.clientName || "Customer", margin, y);
  y += 5;
  if (invoice.clientEmail) {
    doc.text(invoice.clientEmail, margin, y);
    y += 5;
  }
  if (invoice.clientPhone) {
    doc.text(invoice.clientPhone, margin, y);
    y += 5;
  }

  doc.setFont("helvetica", "bold");
  doc.text("Invoice Details", pageWidth / 2, 44);
  doc.setFont("helvetica", "normal");
  doc.text(`Issue: ${formatDate(invoice.issueDate)}`, pageWidth / 2, 50);
  doc.text(`Due: ${formatDate(invoice.dueDate)}`, pageWidth / 2, 56);
  if (invoice.status) {
    doc.text(`Status: ${invoice.status.toUpperCase()}`, pageWidth / 2, 62);
  }

  y = Math.max(y, 68) + 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(invoice.title, margin, y);
  y += 8;

  const rows =
    invoice.lineItems?.length > 0
      ? invoice.lineItems.map((row) => [
          row.description,
          String(row.quantity),
          formatMoney(row.unitPrice),
          formatMoney(row.amount),
        ])
      : [["Services", "1", formatMoney(invoice.amount), formatMoney(invoice.amount)]];

  autoTable(doc, {
    startY: y,
    head: [["Description", "Qty", "Unit Price", "Amount"]],
    body: rows,
    theme: "grid",
    headStyles: { fillColor: [56, 189, 248], textColor: 255 },
    styles: { fontSize: 9, cellPadding: 3 },
    margin: { left: margin, right: margin },
  });

  const finalY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || y + 20;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(`Total: ${formatMoney(invoice.amount)}`, pageWidth - margin, finalY + 10, { align: "right" });

  if (invoice.note) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Note: ${invoice.note}`, margin, finalY + 20);
  }
  if (invoice.terms) {
    doc.setFontSize(9);
    doc.text(`Terms: ${invoice.terms}`, margin, finalY + 28);
  }

  doc.save(`${invoice.invoiceNumber}.pdf`);
}

export function downloadClientStatementPdf(
  clientName: string,
  invoices: StatementInvoice[],
  incomes: StatementIncome[],
  outstanding: number,
) {
  const doc = new jsPDF();
  const margin = 14;

  addPdfHeader(doc, "CUSTOMER STATEMENT", clientName);

  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text(`Outstanding balance: ${formatMoney(outstanding)}`, margin, 44);
  doc.text(`Generated: ${formatDate(new Date().toISOString())}`, margin, 50);

  autoTable(doc, {
    startY: 58,
    head: [["Invoice #", "Title", "Due", "Status", "Amount"]],
    body: invoices.map((inv) => [
      inv.invoiceNumber,
      inv.title,
      formatDate(inv.dueDate),
      (inv.status || "").toUpperCase(),
      formatMoney(inv.amount),
    ]),
    theme: "grid",
    headStyles: { fillColor: [56, 189, 248] },
    styles: { fontSize: 8 },
    margin: { left: margin, right: margin },
  });

  const midY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || 80;

  autoTable(doc, {
    startY: midY + 10,
    head: [["Payment", "Date", "Amount"]],
    body: incomes.map((row) => [row.title, formatDate(row.date), formatMoney(row.amount)]),
    theme: "grid",
    headStyles: { fillColor: [34, 197, 94] },
    styles: { fontSize: 8 },
    margin: { left: margin, right: margin },
  });

  doc.save(`Statement-${clientName.replace(/\s+/g, "_")}.pdf`);
}

type StatementBill = {
  title: string;
  amount: number;
  dueDate: string;
  status?: string;
};

export function downloadVendorStatementPdf(
  vendorName: string,
  bills: StatementBill[],
  expenses: StatementIncome[],
  outstanding: number,
) {
  const doc = new jsPDF();
  const margin = 14;

  addPdfHeader(doc, "VENDOR STATEMENT", vendorName);

  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text(`Outstanding balance: ${formatMoney(outstanding)}`, margin, 44);
  doc.text(`Generated: ${formatDate(new Date().toISOString())}`, margin, 50);

  autoTable(doc, {
    startY: 58,
    head: [["Bill", "Due", "Status", "Amount"]],
    body: bills.map((bill) => [
      bill.title,
      formatDate(bill.dueDate),
      (bill.status || "pending").toUpperCase(),
      formatMoney(bill.amount),
    ]),
    theme: "grid",
    headStyles: { fillColor: [249, 115, 22] },
    styles: { fontSize: 8 },
    margin: { left: margin, right: margin },
  });

  const midY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || 80;

  autoTable(doc, {
    startY: midY + 10,
    head: [["Payment", "Date", "Amount"]],
    body: expenses.map((row) => [row.title, formatDate(row.date), formatMoney(row.amount)]),
    theme: "grid",
    headStyles: { fillColor: [34, 197, 94] },
    styles: { fontSize: 8 },
    margin: { left: margin, right: margin },
  });

  doc.save(`Vendor-Statement-${vendorName.replace(/\s+/g, "_")}.pdf`);
}
