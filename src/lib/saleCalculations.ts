/** localStorage: "1" = show low-stock hints on product sale forms, "0" = off */
export const LOW_STOCK_SALE_WARN_STORAGE_KEY = "trippo-warn-low-stock-on-product-sale";

export function readLowStockSaleWarningPref(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(LOW_STOCK_SALE_WARN_STORAGE_KEY) !== "0";
  } catch {
    return true;
  }
}

export function writeLowStockSaleWarningPref(enabled: boolean): void {
  try {
    localStorage.setItem(LOW_STOCK_SALE_WARN_STORAGE_KEY, enabled ? "1" : "0");
  } catch {
    /* ignore */
  }
}

export type ProductSaleSlice = {
  costPrice?: number;
  sellingPrice: number;
  stock: number;
  isPackage?: boolean;
  packageQuantity?: number;
  priceType?: "perQuantity" | "perPackage";
  costPriceType?: "perQuantity" | "perPackage";
};

export type ComputeProductSaleOptions = {
  /** When true, skips stock checks (for live preview while typing). */
  skipStockCheck?: boolean;
};

export type ComputeProductSaleResult =
  | {
      ok: true;
      qty: number;
      stockReduction: number;
      revenue: number;
      cost: number;
      profit: number;
    }
  | { ok: false; code: "invalid_quantity" | "invalid_price" | "insufficient_stock" };

function costBasis(product: ProductSaleSlice): number {
  return Number(product.costPrice ?? 0);
}

/**
 * Revenue, cost, and profit for one product line (matches package / price-type rules used on Index & Sales).
 */
export function computeProductSaleMetrics(
  product: ProductSaleSlice,
  input: {
    quantityStr: string;
    sellingPriceStr: string;
    packageSaleMode: "quantity" | "wholePackage";
  },
  options?: ComputeProductSaleOptions
): ComputeProductSaleResult {
  const skipStock = options?.skipStockCheck ?? false;
  const cp = costBasis(product);
  const spStr = input.sellingPriceStr.trim();
  const sp = parseFloat(spStr);
  if (!spStr || isNaN(sp) || sp < 0) {
    return { ok: false, code: "invalid_price" };
  }

  if (product.isPackage && product.packageQuantity && input.packageSaleMode === "wholePackage") {
    const pq = product.packageQuantity;
    const qty = pq;
    const stockReduction = pq;
    if (!skipStock && (product.stock <= 0 || product.stock < pq)) {
      return { ok: false, code: "insufficient_stock" };
    }
    let revenue: number;
    if (product.priceType === "perPackage") {
      revenue = sp;
    } else {
      revenue = sp * pq;
    }
    let cost: number;
    if (product.costPriceType === "perPackage") {
      cost = cp;
    } else {
      cost = cp * pq;
    }
    return { ok: true, qty, stockReduction, revenue, cost, profit: revenue - cost };
  }

  const qty = parseInt(input.quantityStr.trim(), 10);
  if (isNaN(qty) || qty <= 0) {
    return { ok: false, code: "invalid_quantity" };
  }
  if (!skipStock && (product.stock <= 0 || qty > product.stock)) {
    return { ok: false, code: "insufficient_stock" };
  }

  if (product.isPackage && product.packageQuantity) {
    const pq = product.packageQuantity;
    const stockReduction = qty;
    let revenue: number;
    if (product.priceType === "perPackage") {
      const pricePerItem = sp / pq;
      revenue = pricePerItem * qty;
    } else {
      revenue = sp * qty;
    }
    let cost: number;
    if (product.costPriceType === "perPackage") {
      const costPerItem = cp / pq;
      cost = costPerItem * qty;
    } else {
      cost = cp * qty;
    }
    return { ok: true, qty, stockReduction, revenue, cost, profit: revenue - cost };
  }

  const revenue = qty * sp;
  const cost = qty * cp;
  return { ok: true, qty, stockReduction: qty, revenue, cost, profit: revenue - cost };
}

export type LowStockSaleHint =
  | { kind: "none" }
  | { kind: "at_or_below_min"; min: number; stock: number }
  | { kind: "sale_will_drop_below_min"; min: number; afterStock: number };

export function getLowStockSaleHintState(
  product: { stock: number; minStock?: number },
  stockReduction: number
): LowStockSaleHint {
  const min = product.minStock;
  if (min == null || min <= 0) return { kind: "none" };
  if (product.stock <= min) return { kind: "at_or_below_min", min, stock: product.stock };
  const after = product.stock - stockReduction;
  if (stockReduction > 0 && after <= min && after >= 0) {
    return { kind: "sale_will_drop_below_min", min, afterStock: after };
  }
  return { kind: "none" };
}
