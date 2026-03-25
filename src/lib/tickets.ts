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
  qrEnabled?: boolean;
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

let trippoLogoDataUrlPromise: Promise<string | null> | null = null;

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
      try {
        const res = await fetch("/logo.png", { cache: "force-cache" });
        if (!res.ok) return null;
        const blob = await res.blob();
        return blobToDataUrl(blob);
      } catch {
        return null;
      }
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

  // White receipt container.
  // NOTE: Avoid jsPDF `roundedRect()` here. In some jsPDF builds/environments it can throw:
  // "undefined is not an object (evaluating 'this.lines')".
  const rx = 4;
  const ry = 4;
  const rw = 72;
  const rh = 112;
  doc.setDrawColor(29, 78, 216); // #1d4ed8
  doc.setFillColor(255, 255, 255);
  doc.setLineWidth(0.8);
  doc.rect(rx, ry, rw, rh, "F");
  doc.rect(rx, ry, rw, rh);
  doc.setLineWidth(0.2);

  return { rx, ry, rw, rh };
}

async function generateQrDataUrl(payload: string) {
  return QRCode.toDataURL(payload, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 240,
  });
}

async function drawReceipt(doc: jsPDF, sale: TicketSale, opts: TicketOptions & { qrDataUrl?: string; logoDataUrl?: string }) {
  let step = 0;
  try {
    const businessName =
      opts.businessName || localStorage.getItem("profit-pilot-business-name") || "Trippo";
    const currency = opts.currency || "RWF";
    const qrEnabled = opts.qrEnabled !== false;
    const verificationBaseUrl = opts.verificationBaseUrl || "https://trippo.rw/verify";

    const ticketId = safeId(sale);
    const serviceLabel = truncateText(sale.serviceName || sale.product || "Service", 24);
    const barberLabel = truncateText(sale.workerName || "-", 20);

    const when = formatDateTime(sale.timestamp || sale.date);
    const amountStr = formatMoney(sale.revenue, currency);
    const paymentStr = canonicalPayment(sale.paymentMethod);

    const page = receiptDesignBackground(doc);
    step = 1;

    const cx = page.rx + page.rw / 2;
    let y = page.ry + 12;

    // RECEIPT header
    doc.setTextColor(0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    const receiptTitle = "RECEIPT";
    doc.text(receiptTitle, cx - doc.getTextWidth(receiptTitle) / 2, y);
    step = 2;
    y += 6;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    const receiptStars = "****";
    doc.text(receiptStars, cx - doc.getTextWidth(receiptStars) / 2, y);
    step = 3;
    y += 4;

    // Optional logo (from `public/logo.png` -> served as `/logo.png`)
    const logoDataUrl = opts.logoDataUrl || (await getTrippoLogoDataUrl());
    if (logoDataUrl) {
      try {
        const logoSize = 10; // mm
        doc.addImage(
          logoDataUrl,
          "PNG",
          cx - logoSize / 2,
          y + 1,
          logoSize,
          logoSize
        );
        y += logoSize + 2;
      } catch {
        // ignore logo render errors
      }
    }
    step = 4;

    // Dotted separators (UI like sample)
    drawDottedLine(doc, page.rx + 8, page.rx + page.rw - 8, y, 205);
    step = 5;
    y += 6;

    // Business name (small)
    doc.setFontSize(10);
    const businessNameText = truncateText(String(businessName), 24);
    doc.text(businessNameText, cx - doc.getTextWidth(businessNameText) / 2, y);
    step = 6;
    y += 5;

    drawDottedLine(doc, page.rx + 8, page.rx + page.rw - 8, y, 220);
    step = 7;
    y += 5;

    // Details
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(`Service:`, page.rx + 8, y);
    doc.setFont("helvetica", "normal");
    doc.text(serviceLabel, page.rx + 34, y);
    step = 8;
    y += 5;

    doc.setFont("helvetica", "bold");
    doc.text(`Barber:`, page.rx + 8, y);
    doc.setFont("helvetica", "normal");
    doc.text(barberLabel, page.rx + 34, y);
    step = 9;
    y += 5;

    doc.setFont("helvetica", "bold");
    doc.text(`Payment:`, page.rx + 8, y);
    doc.setFont("helvetica", "normal");
    doc.text(paymentStr, page.rx + 34, y);
    step = 10;
    y += 5;

    doc.setFont("helvetica", "bold");
    doc.text(`Recorded:`, page.rx + 8, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.text(truncateText(when, 24), page.rx + 38, y);
    doc.setFontSize(10);
    step = 11;
    y += 6;

    // Ticket ID line
    drawDottedLine(doc, page.rx + 8, page.rx + page.rw - 8, y, 210);
    step = 12;
    y += 4;

    doc.setFont("helvetica", "bold");
    doc.text(`Ticket:`, page.rx + 8, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(truncateText(String(ticketId.slice(-10)), 14), page.rx + 38, y);
    doc.setFontSize(10);
    step = 13;
    y += 8;

    // QR (verification) — guarded so it never breaks printing/downloading
    if (qrEnabled) {
      const qrSize = 22; // mm
      const qrX = cx - qrSize / 2;
      const qrY = page.ry + page.rh - 82;
      try {
        const qrPayload = `${verificationBaseUrl}?ticket=${encodeURIComponent(String(ticketId))}`;
        const qrDataUrl = await generateQrDataUrl(qrPayload);
        doc.addImage(qrDataUrl, "PNG", qrX, qrY, qrSize, qrSize);
      } catch {
        // Fallback: still render a placeholder box
        doc.setDrawColor(180);
        doc.setLineWidth(0.3);
        doc.rect(qrX, qrY, qrSize, qrSize);
      }
    }
    step = 14;

    // Total
    const totalY = page.ry + page.rh - 52;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Total:", page.rx + 10, totalY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    const amountX = page.rx + page.rw - 10 - doc.getTextWidth(amountStr);
    doc.text(amountStr, amountX, totalY);
    step = 15;

    // Decorative barcode area
    const barcodeY = page.ry + page.rh - 30;
    const barcodeH = 16;
    drawBarcodeLike(doc, page.rx + 10, barcodeY, page.rw - 20, barcodeH, String(ticketId));
    step = 16;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(40);
    doc.text(String(ticketId.slice(-10)), page.rx + 8, barcodeY + barcodeH + 4);
    doc.setTextColor(0);
    step = 17;
  } catch (e: any) {
    const msg = e?.message || String(e);
    throw new Error(`Ticket receipt render failed at step ${step}: ${msg}`);
  }
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
  // Most reliable across browsers/PWA: ask jsPDF to open a new window/tab with the PDF,
  // and enable autoprint inside it.
  try {
    (doc as any).autoPrint?.();
  } catch {
    // ignore
  }
  try {
    (doc as any).output?.("dataurlnewwindow");
    return;
  } catch {
    // ignore
  }

  // Fallback: blob URL open
  const url = doc.output("bloburl");
  window.open(url, "_blank", "noopener,noreferrer");
}

