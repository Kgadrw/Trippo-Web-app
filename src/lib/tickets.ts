import jsPDF from "jspdf";
import QRCode from "qrcode";

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
  verificationBaseUrl?: string;
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

let trippoLogoDataUrlPromise: Promise<string> | null = null;

function truncateText(text: string, maxLen: number) {
  const t = (text || "").toString();
  if (t.length <= maxLen) return t;
  return `${t.slice(0, Math.max(0, maxLen - 3))}...`;
}

function hashString(input: string) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function drawDottedLine(doc: jsPDF, x1: number, x2: number, y: number, color = 210) {
  doc.setDrawColor(color);
  const step = 1.1; // mm
  const dot = 0.35; // mm
  for (let x = x1; x <= x2; x += step) {
    doc.line(x, y, Math.min(x + dot, x2), y);
  }
}

function drawBarcodeLike(doc: jsPDF, x: number, y: number, w: number, h: number, value: string) {
  // Decorative "barcode" look (not a strict encoding). QR is the verification.
  const modules = 64;
  const moduleW = w / modules;
  let seed = hashString(value || "trippo");
  doc.setDrawColor(0);
  for (let i = 0; i < modules; i++) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const r = seed / 0xffffffff;
    if (r > 0.54) {
      const thickness = r > 0.78 ? 1.2 : 0.7;
      doc.setLineWidth(thickness);
      doc.line(x + i * moduleW, y, x + i * moduleW, y + h);
    }
  }
  doc.setLineWidth(0.2);
}

async function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Failed to read blob as data URL"));
    reader.readAsDataURL(blob);
  });
}

async function getTrippoLogoDataUrl() {
  if (!trippoLogoDataUrlPromise) {
    trippoLogoDataUrlPromise = (async () => {
      const res = await fetch("/logo.png", { cache: "force-cache" });
      const blob = await res.blob();
      return blobToDataUrl(blob);
    })();
  }
  return trippoLogoDataUrlPromise;
}

function receiptDesignBackground(doc: jsPDF) {
  const pageW = 80;
  const pageH = 120;
  // Light blue background around the receipt (like the sample UI).
  doc.setFillColor(147, 197, 253); // #93c5fd
  doc.rect(0, 0, pageW, pageH, "F");

  // White rounded receipt container.
  const rx = 4;
  const ry = 4;
  const rw = 72;
  const rh = 112;
  doc.setDrawColor(29, 78, 216); // #1d4ed8
  doc.setLineWidth(0.8);
  const roundedRect = (doc as any).roundedRect as undefined | ((x: number, y: number, w: number, h: number, rx: number, ry: number, style?: string) => void);
  doc.setFillColor(255, 255, 255);
  if (roundedRect) {
    roundedRect(rx, ry, rw, rh, 3.5, 3.5, "F");
    roundedRect(rx, ry, rw, rh, 3.5, 3.5);
  } else {
    doc.rect(rx, ry, rw, rh, "F");
    doc.rect(rx, ry, rw, rh);
  }
  doc.setLineWidth(0.2);

  return { rx, ry, rw, rh };
}

async function generateQrDataUrl(payload: string) {
  return QRCode.toDataURL(payload, {
    errorCorrectionLevel: "H",
    margin: 1,
    width: 240,
  });
}

async function drawReceipt(doc: jsPDF, sale: TicketSale, opts: TicketOptions & { qrDataUrl?: string; logoDataUrl?: string }) {
  const businessName =
    opts.businessName || localStorage.getItem("profit-pilot-business-name") || "Trippo";
  const currency = opts.currency || "RWF";
  const verificationBaseUrl = opts.verificationBaseUrl || "https://trippo.rw/verify";

  const ticketId = safeId(sale);
  const serviceLabel = truncateText(sale.serviceName || sale.product || "Service", 24);
  const barberLabel = truncateText(sale.workerName || "-", 20);

  const when = formatDateTime(sale.timestamp || sale.date);
  const amountStr = formatMoney(sale.revenue, currency);
  const paymentStr = canonicalPayment(sale.paymentMethod);

  const page = receiptDesignBackground(doc);

  const cx = page.rx + page.rw / 2;
  let y = page.ry + 12;

  // RECEIPT header
  doc.setTextColor(0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("RECEIPT", cx, y, { align: "center" } as any);
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.text("****", cx, y, { align: "center" } as any);
  y += 4;

  // Dotted separators (UI like sample)
  drawDottedLine(doc, page.rx + 8, page.rx + page.rw - 8, y, 205);
  y += 6;

  // Business name (small)
  doc.setFontSize(10);
  doc.text(truncateText(String(businessName), 24), cx, y, { align: "center" } as any);
  y += 5;

  drawDottedLine(doc, page.rx + 8, page.rx + page.rw - 8, y, 220);
  y += 5;

  // Details
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(`Service:`, page.rx + 8, y);
  doc.setFont("helvetica", "normal");
  doc.text(serviceLabel, page.rx + 34, y);
  y += 5;

  doc.setFont("helvetica", "bold");
  doc.text(`Barber:`, page.rx + 8, y);
  doc.setFont("helvetica", "normal");
  doc.text(barberLabel, page.rx + 34, y);
  y += 5;

  doc.setFont("helvetica", "bold");
  doc.text(`Payment:`, page.rx + 8, y);
  doc.setFont("helvetica", "normal");
  doc.text(paymentStr, page.rx + 34, y);
  y += 5;

  doc.setFont("helvetica", "bold");
  doc.text(`Recorded:`, page.rx + 8, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text(truncateText(when, 24), page.rx + 38, y);
  doc.setFontSize(10);
  y += 6;

  // Ticket ID line
  drawDottedLine(doc, page.rx + 8, page.rx + page.rw - 8, y, 210);
  y += 4;

  doc.setFont("helvetica", "bold");
  doc.text(`Ticket:`, page.rx + 8, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(truncateText(String(ticketId.slice(-10)), 14), page.rx + 38, y);
  doc.setFontSize(10);
  y += 8;

  // QR (verification)
  const qrSize = 22; // mm
  const qrX = cx - qrSize / 2;
  const qrY = page.ry + page.rh - 82; // tuned for 80x120

  const qrDataUrl =
    opts.qrDataUrl ||
    (await generateQrDataUrl(`${verificationBaseUrl}?ticket=${encodeURIComponent(String(ticketId))}`));
  const logoDataUrl = opts.logoDataUrl || (await getTrippoLogoDataUrl());

  doc.addImage(qrDataUrl, "PNG", qrX, qrY, qrSize, qrSize);
  // Trippo logo overlay inside QR only
  const logoSize = 7.5;
  doc.addImage(
    logoDataUrl,
    "PNG",
    cx - logoSize / 2,
    qrY + qrSize / 2 - logoSize / 2,
    logoSize,
    logoSize
  );

  // Total
  const totalY = page.ry + page.rh - 52;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Total:", page.rx + 10, totalY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(amountStr, page.rx + page.rw - 10, totalY, { align: "right" } as any);

  // Decorative barcode area
  const barcodeY = page.ry + page.rh - 30;
  const barcodeH = 16;
  drawBarcodeLike(doc, page.rx + 10, barcodeY, page.rw - 20, barcodeH, String(ticketId));

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(40);
  doc.text(String(ticketId.slice(-10)), page.rx + 8, barcodeY + barcodeH + 4);
  doc.setTextColor(0);
}

export async function buildSaleTicketPdf(sale: TicketSale, opts: TicketOptions = {}): Promise<jsPDF> {
  const doc = new jsPDF({ unit: "mm", format: [80, 120] });
  await drawReceipt(doc, sale, opts);
  return doc;
}

export async function buildDailyTicketsPdf(sales: TicketSale[], opts: TicketOptions = {}): Promise<jsPDF> {
  const items = [...sales].sort((a, b) => {
    const at = new Date(a.timestamp || a.date).getTime();
    const bt = new Date(b.timestamp || b.date).getTime();
    return at - bt;
  });
  if (items.length === 0) {
    // Empty doc
    return new jsPDF();
  }

  const doc = new jsPDF({ unit: "mm", format: [80, 120] });
  // Preload logo and generate QR sequentially for predictable order.
  const logoDataUrl = await getTrippoLogoDataUrl();
  const currency = opts.currency || "RWF";
  void currency;

  for (let i = 0; i < items.length; i++) {
    if (i > 0) doc.addPage([80, 120], "portrait");
    const sale = items[i];
    // Generate QR + receipt on each page
    await drawReceipt(doc, sale, {
      ...opts,
      logoDataUrl,
    });
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

