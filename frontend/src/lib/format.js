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

// Local calendar date as "YYYY-MM-DD" — for <input type="date"> defaults and
// date-range math. NOT `date.toISOString().slice(0, 10)`: that reads the UTC
// date, which silently rolls back to "yesterday" for part of the day in any
// timezone ahead of UTC (e.g. right after local midnight in UTC+6, it's still
// "yesterday" in UTC) — exactly the kind of off-by-one that makes a sale
// entered moments ago disappear from "today"'s report.
export function toLocalDateInput(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
