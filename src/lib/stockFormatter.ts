/**
 * Format stock display for products
 * - Package products: Shows as "X packages" or "X packages + Y items" if partial package
 * - Non-package products: Shows as "X items" or "X units"
 */

export interface StockProduct {
  stock: number;
  isPackage?: boolean;
  packageQuantity?: number;
}

export function formatStockDisplay(product: StockProduct): string {
  if (product.stock === 0) {
    return "Sold Out";
  }

  if (product.isPackage && product.packageQuantity && product.packageQuantity > 0) {
    const fullPackages = Math.floor(product.stock / product.packageQuantity);
    const remainingItems = product.stock % product.packageQuantity;

    if (remainingItems === 0) {
      return `${fullPackages} ${fullPackages === 1 ? "package" : "packages"}`;
    }
    return `${fullPackages} ${fullPackages === 1 ? "package" : "packages"} + ${remainingItems} ${remainingItems === 1 ? "item" : "items"}`;
  }

  return `${product.stock} ${product.stock === 1 ? "item" : "items"}`;
}

/**
 * Get stock breakdown for package products
 * Returns { fullPackages, remainingItems, totalItems }
 */
export function getStockBreakdown(product: StockProduct): {
  fullPackages: number;
  remainingItems: number;
  totalItems: number;
} {
  if (product.isPackage && product.packageQuantity && product.packageQuantity > 0) {
    const fullPackages = Math.floor(product.stock / product.packageQuantity);
    const remainingItems = product.stock % product.packageQuantity;
    return {
      fullPackages,
      remainingItems,
      totalItems: product.stock,
    };
  }

  return {
    fullPackages: 0,
    remainingItems: product.stock,
    totalItems: product.stock,
  };
}
