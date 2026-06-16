/** MongoDB ObjectId (24 hex chars). */
export function isMongoServerId(id: unknown): boolean {
  return typeof id === "string" && /^[a-f0-9]{24}$/i.test(id);
}

/** Prefer server _id for API calls; fall back to id string when needed. */
export function getSaleProductId(product: {
  _id?: string;
  id?: string | number;
}): string | undefined {
  const candidates = [(product as { _id?: string })._id, product.id];
  for (const raw of candidates) {
    if (raw == null || raw === "") continue;
    const id = String(raw);
    if (isMongoServerId(id)) return id;
  }
  const fallback = (product as { _id?: string })._id ?? product.id;
  return fallback != null && fallback !== "" ? String(fallback) : undefined;
}
