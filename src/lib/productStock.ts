/** Instant in-memory stock patch — no API round-trip. */
export function patchProductStock(productId: string, delta: number): void {
  if (!productId || !delta) return;
  window.dispatchEvent(
    new CustomEvent("product-stock-updated", {
      detail: { productId: productId.toString(), delta },
    }),
  );
}

export function setProductStock(productId: string, newStock: number): void {
  if (!productId) return;
  window.dispatchEvent(
    new CustomEvent("product-stock-updated", {
      detail: { productId: productId.toString(), newStock },
    }),
  );
}
