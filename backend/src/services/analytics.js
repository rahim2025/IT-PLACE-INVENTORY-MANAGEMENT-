import { Product } from "../models/Product.js";
import { InventoryLog } from "../models/InventoryLog.js";

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

// Reconstructs stock-on-hand at each month-end cutoff from inventory-log
// history, valued at each product's *current* wholesale price — wholesale
// price is a plain, manually-set field with no historical record, so past
// cutoffs can't reflect what it was priced at back then.
export async function getInventoryValueTrend(monthsBack = 7, refDate = new Date()) {
  const cutoffs = monthCutoffs(monthsBack, refDate);
  const [products, logs] = await Promise.all([
    Product.find().select("wholesalePrice").lean(),
    InventoryLog.find().select("product resultingStock date").sort({ date: 1 }).lean(),
  ]);

  const priceById = new Map(products.map((p) => [String(p._id), p.wholesalePrice || 0]));
  const productIds = [...new Set(logs.map((l) => String(l.product)))];

  return cutoffs.map(({ label, cutoff }) => {
    let value = 0;
    productIds.forEach((id) => {
      const logsToDate = logs.filter((l) => String(l.product) === id && l.date <= cutoff);
      const stockAtCutoff = logsToDate.length ? logsToDate[logsToDate.length - 1].resultingStock : 0;
      value += stockAtCutoff * (priceById.get(id) || 0);
    });
    return { label, value: Math.round(value) };
  });
}
