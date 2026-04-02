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

function formatDateTimeShort(input?: string): string {
  const d = input ? new Date(input) : new Date();
  if (Number.isNaN(d.getTime())) return String(input || "");
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
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

function fitTextToWidth(doc: jsPDF, text: string, maxWidthMm: number) {
  const raw = (text || "").toString();
  if (!raw) return "";
  if (doc.getTextWidth(raw) <= maxWidthMm) return raw;
  // Truncate until it fits, keeping "..."
  let t = raw;
  const ellipsis = "...";
  while (t.length > 0) {
    const candidate = t.length <= 3 ? t : `${t.slice(0, Math.max(0, t.length - 1))}`;
    const withDots = `${candidate}${ellipsis}`;
    if (doc.getTextWidth(withDots) <= maxWidthMm) return withDots;
    t = candidate;
  }
  return ellipsis;
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

function drawDottedRow(
  doc: jsPDF,
  xLeft: number,
  xRight: number,
  y: number,
  label: string,
  value: string,
  opts?: { boldValue?: boolean; color?: number }
) {
  const color = opts?.color ?? 210;
  const padding = 0.6;

  doc.setFont("helvetica", "bold");
  doc.text(label, xLeft, y);
  const labelW = doc.getTextWidth(label);

  const valueMaxW = Math.max(10, xRight - (xLeft + labelW + 6));
  doc.setFont("helvetica", opts?.boldValue ? "bold" : "normal");
  const fittedValue = fitTextToWidth(doc, value, valueMaxW);
  const valueW = doc.getTextWidth(fittedValue);
  const valueX = xRight - valueW;
  doc.text(fittedValue, valueX, y);

  const dotsStart = xLeft + labelW + padding;
  const dotsEnd = valueX - padding;
  if (dotsEnd > dotsStart + 2) {
    drawDottedLine(doc, dotsStart, dotsEnd, y - 0.6, color);
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

    const when = formatDateTimeShort(sale.timestamp || sale.date);
    const amountStr = formatMoney(sale.revenue, currency);
    const paymentStr = canonicalPayment(sale.paymentMethod);

    const page = receiptDesignBackground(doc);
    step = 1;

    const cx = page.rx + page.rw / 2;
    const contentLeft = page.rx + 8;
    const contentRight = page.rx + page.rw - 8;
    const contentWidth = contentRight - contentLeft;
    let y = page.ry + 12;

    // RECEIPT header + small logo on same line (top)
    doc.setTextColor(0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    const receiptTitle = "RECEIPT";
    const logoDataUrl = opts.logoDataUrl || (await getTrippoLogoDataUrl());
    const logoSize = 6; // mm (small)
    const gap = 2; // mm
    const titleW = doc.getTextWidth(receiptTitle);
    const headerTotalW = (logoDataUrl ? logoSize + gap : 0) + titleW;
    const headerStartX = cx - headerTotalW / 2;
    if (logoDataUrl) {
      try {
        doc.addImage(logoDataUrl, "PNG", headerStartX, y - logoSize + 1.5, logoSize, logoSize);
      } catch {
        // ignore
      }
    }
    doc.text(receiptTitle, headerStartX + (logoDataUrl ? logoSize + gap : 0), y);
    step = 2;
    y += 5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    // No business name line under "RECEIPT"
    step = 3;

    drawDottedLine(doc, contentLeft, contentRight, y, 210);
    y += 5;
    step = 4;

    // Clean dotted-line table
    doc.setFontSize(9);
    drawDottedRow(doc, contentLeft, contentRight, y, "Service", sale.serviceName || sale.product || "Service");
    y += 5;
    drawDottedRow(doc, contentLeft, contentRight, y, "Worker", sale.workerName || "-");
    y += 5;
    drawDottedRow(doc, contentLeft, contentRight, y, "Payment", paymentStr);
    y += 6;
    doc.setFontSize(8.5);
    drawDottedRow(doc, contentLeft, contentRight, y, "Recorded", when, { color: 220 });
    y += 6;
    doc.setFontSize(10);
    drawDottedRow(doc, contentLeft, contentRight, y, "Total", amountStr, { boldValue: true });
    step = 5;

    // QR at bottom (below everything)
    if (qrEnabled) {
      const qrSize = 18; // mm (small, fits receipt)
      const qrX = cx - qrSize / 2;
      const qrY = page.ry + page.rh - qrSize - 8;
      try {
        const qrPayload = `${verificationBaseUrl}?ticket=${encodeURIComponent(String(ticketId))}`;
        const qrDataUrl = await generateQrDataUrl(qrPayload);
        doc.addImage(qrDataUrl, "PNG", qrX, qrY, qrSize, qrSize);
      } catch {
        doc.setDrawColor(180);
        doc.setLineWidth(0.3);
        doc.rect(qrX, qrY, qrSize, qrSize);
      }
    }
    step = 12;
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

