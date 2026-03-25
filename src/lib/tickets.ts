import jsPDF from "jspdf";

export type TicketSale = {
  id?: string | number;
  _id?: string;
  serviceName?: string;
  product: string;
  revenue: number;
  quantity: number;
  paymentMethod?: string;
  workerName?: string;
  workerId?: string;
  date: string;
  timestamp?: string;
};

type TicketOptions = {
  businessName?: string;
  currency?: string;
};

function safeId(sale: TicketSale): string {
  const raw = (sale._id || sale.id || "").toString();
  if (!raw) return `ticket-${Date.now()}`;
  return raw;
}

function formatDateTime(input?: string): string {
  if (!input) return new Date().toLocaleString();
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return String(input);
  return d.toLocaleString();
}

function formatMoney(amount: number, currency: string) {
  const n = Number(amount || 0);
  return `${n.toLocaleString()} ${currency}`;
}

function canonicalPayment(method?: string): string {
  const m = (method || "cash").toLowerCase();
  if (m === "momo") return "MoMo";
  if (m === "airtel") return "Airtel Money";
  if (m === "card") return "Card";
  if (m === "transfer") return "Bank Transfer";
  return "Cash";
}

export function buildSaleTicketPdf(sale: TicketSale, opts: TicketOptions = {}) {
  const businessName =
    opts.businessName ||
    localStorage.getItem("profit-pilot-business-name") ||
    "Trippo";
  const currency = opts.currency || "RWF";
  const ticketId = safeId(sale);

  // Receipt printer-ish size: 80mm wide, ~120mm height
  const doc = new jsPDF({ unit: "mm", format: [80, 120] });
  const left = 6;
  let y = 8;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(String(businessName), left, y);

  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Service Ticket", left, y);

  y += 5;
  doc.setDrawColor(180);
  doc.line(left, y, 80 - left, y);

  y += 6;
  doc.setFontSize(9);
  doc.text(`Ticket: ${ticketId.slice(-8)}`, left, y);

  y += 5;
  const serviceLabel = sale.serviceName || sale.product || "Service";
  doc.setFont("helvetica", "bold");
  doc.text(serviceLabel, left, y);

  y += 5;
  doc.setFont("helvetica", "normal");
  doc.text(`Barber: ${sale.workerName || "-"}`, left, y);

  y += 5;
  doc.text(`Qty: ${sale.quantity ?? 1}`, left, y);

  y += 5;
  doc.text(`Amount: ${formatMoney(sale.revenue, currency)}`, left, y);

  y += 5;
  doc.text(`Payment: ${canonicalPayment(sale.paymentMethod)}`, left, y);

  y += 6;
  doc.setDrawColor(220);
  doc.line(left, y, 80 - left, y);

  y += 6;
  const when = formatDateTime(sale.timestamp || sale.date);
  doc.setFontSize(8);
  doc.text(`Recorded: ${when}`, left, y);

  y += 5;
  doc.setTextColor(90);
  doc.text("Thank you", left, y);
  doc.setTextColor(0);

  return doc;
}

export function buildDailyTicketsPdf(sales: TicketSale[], opts: TicketOptions = {}) {
  const items = [...sales].sort((a, b) => {
    const at = new Date(a.timestamp || a.date).getTime();
    const bt = new Date(b.timestamp || b.date).getTime();
    return at - bt;
  });
  if (items.length === 0) {
    // Empty doc
    return new jsPDF();
  }

  let doc = buildSaleTicketPdf(items[0], opts);
  for (let i = 1; i < items.length; i++) {
    doc.addPage([80, 120], "portrait");
    const pageDoc = buildSaleTicketPdf(items[i], opts);
    // Copy content by re-rendering: easiest is to recreate on same doc.
    // jsPDF doesn't support merging docs directly; so we redraw on current doc instead.
    // We'll redraw by calling buildSaleTicketPdf-style drawing in-place.
    // To keep this file simple, we regenerate pages by duplicating drawing logic:
    const sale = items[i];
    const businessName =
      opts.businessName ||
      localStorage.getItem("profit-pilot-business-name") ||
      "Trippo";
    const currency = opts.currency || "RWF";
    const ticketId = safeId(sale);
    const left = 6;
    let y = 8;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(String(businessName), left, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("Service Ticket", left, y);
    y += 5;
    doc.setDrawColor(180);
    doc.line(left, y, 80 - left, y);
    y += 6;
    doc.setFontSize(9);
    doc.text(`Ticket: ${ticketId.slice(-8)}`, left, y);
    y += 5;
    const serviceLabel = sale.serviceName || sale.product || "Service";
    doc.setFont("helvetica", "bold");
    doc.text(serviceLabel, left, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.text(`Barber: ${sale.workerName || "-"}`, left, y);
    y += 5;
    doc.text(`Qty: ${sale.quantity ?? 1}`, left, y);
    y += 5;
    doc.text(`Amount: ${formatMoney(sale.revenue, currency)}`, left, y);
    y += 5;
    doc.text(`Payment: ${canonicalPayment(sale.paymentMethod)}`, left, y);
    y += 6;
    doc.setDrawColor(220);
    doc.line(left, y, 80 - left, y);
    y += 6;
    const when = formatDateTime(sale.timestamp || sale.date);
    doc.setFontSize(8);
    doc.text(`Recorded: ${when}`, left, y);
    y += 5;
    doc.setTextColor(90);
    doc.text("Thank you", left, y);
    doc.setTextColor(0);

    void pageDoc; // avoid unused variable warnings in some setups
  }

  return doc;
}

export function downloadPdf(doc: jsPDF, filename: string) {
  doc.save(filename);
}

export function printPdf(doc: jsPDF) {
  try {
    (doc as any).autoPrint?.();
  } catch {
    // ignore
  }
  const url = doc.output("bloburl");
  window.open(url, "_blank", "noopener,noreferrer");
}

