// entries: [{ quantity, unitPrice }] — the full purchase history for one product.
// Never overwrite a prior purchase's price; the average is recomputed from history instead.
export function weightedAverage(entries) {
  const totalQty = entries.reduce((sum, e) => sum + e.quantity, 0);
  if (totalQty === 0) return 0;
  const totalCost = entries.reduce((sum, e) => sum + e.quantity * e.unitPrice, 0);
  return totalCost / totalQty;
}
