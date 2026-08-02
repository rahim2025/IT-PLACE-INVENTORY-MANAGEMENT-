export function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "SAR",
    maximumFractionDigits: 2,
  }).format(value ?? 0);
}

export function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(value ?? 0);
}

export function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(d);
}

export function formatDateTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function formatSKU(id) {
  return `SKU-${String(id).padStart(5, "0")}`;
}

export function weightedAverage(entries) {
  const totalQty = entries.reduce((sum, e) => sum + e.quantity, 0);
  if (totalQty === 0) return 0;
  const totalCost = entries.reduce((sum, e) => sum + e.quantity * e.unitPrice, 0);
  return totalCost / totalQty;
}
