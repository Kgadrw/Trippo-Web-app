/**
 * Format stock display for products
 * - Package products: Shows as "X packages" or "X packages + Y items" if partial package
 * - Non-package products: Shows as "X items" or "X units"
 */

interface Product {
  stock: number;
  isPackage?: boolean;
  packageQuantity?: number;
}

export function formatStockDisplay(product: Product, language: 'en' | 'rw' = 'en'): string {
  if (product.stock === 0) {
    return language === 'rw' ? 'Nta bicuruzwa bisigaye' : 'Sold Out';
  }

  // For package products
  if (product.isPackage && product.packageQuantity && product.packageQuantity > 0) {
    const fullPackages = Math.floor(product.stock / product.packageQuantity);
    const remainingItems = product.stock % product.packageQuantity;

    if (remainingItems === 0) {
      // Perfect packages only
      if (language === 'rw') {
        return `${fullPackages} ${fullPackages === 1 ? 'ipaki' : 'amapaki'}`;
      }
      return `${fullPackages} ${fullPackages === 1 ? 'package' : 'packages'}`;
    } else {
      // Partial package
      if (language === 'rw') {
        return `${fullPackages} ${fullPackages === 1 ? 'ipaki' : 'amapaki'} + ${remainingItems} ${remainingItems === 1 ? 'igicuruzwa' : 'ibicuruzwa'}`;
      }
      return `${fullPackages} ${fullPackages === 1 ? 'package' : 'packages'} + ${remainingItems} ${remainingItems === 1 ? 'item' : 'items'}`;
    }
  }

  // For non-package products
  if (language === 'rw') {
    return `${product.stock} ${product.stock === 1 ? 'igicuruzwa' : 'ibicuruzwa'}`;
  }
  return `${product.stock} ${product.stock === 1 ? 'item' : 'items'}`;
}

/**
 * Get stock breakdown for package products
 * Returns { fullPackages, remainingItems, totalItems }
 */
export function getStockBreakdown(product: Product): {
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
      totalItems: product.stock
    };
  }

  return {
    fullPackages: 0,
    remainingItems: product.stock,
    totalItems: product.stock
  };
}
