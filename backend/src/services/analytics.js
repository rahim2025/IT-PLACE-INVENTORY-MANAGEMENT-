import { Purchase } from "../models/Purchase.js";
import { InventoryLog } from "../models/InventoryLog.js";
import { weightedAverage } from "../utils/weightedAverage.js";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function monthCutoffs(monthsBack, refDate) {
  const ref = new Date(refDate);
  const cutoffs = [];
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(ref.getFullYear(), ref.getMonth() - i, 1);
    const cutoff = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
    cutoffs.push({ label: MONTH_LABELS[d.getMonth()], cutoff });
  }
  return cutoffs;
}

export function bucketByMonth(entries, valueFn, monthsBack = 7, refDate = new Date()) {
  const cutoffs = monthCutoffs(monthsBack, refDate);
  return cutoffs.map(({ label, cutoff }, i) => {
    const prevCutoff = i === 0 ? new Date(0) : cutoffs[i - 1].cutoff;
    const value = entries
      .filter((e) => e.date > prevCutoff && e.date <= cutoff)
      .reduce((sum, e) => sum + valueFn(e), 0);
    return { label, value };
  });
}

// Reconstructs inventory value at each month-end cutoff from purchase and
// inventory-log history, the same way the current value is derived live.
export async function getInventoryValueTrend(monthsBack = 7, refDate = new Date()) {
  const cutoffs = monthCutoffs(monthsBack, refDate);
  const [purchases, logs] = await Promise.all([
    Purchase.find().select("product quantity unitPrice date").lean(),
    InventoryLog.find().select("product resultingStock date").sort({ date: 1 }).lean(),
  ]);

  const productIds = [...new Set([...purchases, ...logs].map((e) => String(e.product)))];

  return cutoffs.map(({ label, cutoff }) => {
    let value = 0;
    productIds.forEach((id) => {
      const purchasesToDate = purchases.filter((p) => String(p.product) === id && p.date <= cutoff);
      const logsToDate = logs.filter((l) => String(l.product) === id && l.date <= cutoff);
      const stockAtCutoff = logsToDate.length ? logsToDate[logsToDate.length - 1].resultingStock : 0;
      const avgAtCutoff = weightedAverage(purchasesToDate);
      value += stockAtCutoff * avgAtCutoff;
    });
    return { label, value: Math.round(value) };
  });
}
