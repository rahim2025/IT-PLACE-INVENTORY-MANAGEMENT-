// Single source of truth for the shop/warehouse enum shared by Product,
// Sale, and (optionally) Expense — kept here instead of duplicated across
// every model/route file, since this list has already changed once.
export const SHOPS = ["Shop 1", "Shop 2", "Shop 3", "Shop 4", "Warehouse 1"];
