// Single source of truth for the shop/warehouse list, mirroring
// backend/src/constants/shops.js — kept in one place since this list has
// already changed once and every page that filters/tags by shop reads it
// from here instead of hardcoding its own <option> list.
export const SHOPS = ["Shop 1", "Shop 2", "Shop 3", "Shop 4", "Warehouse 1"];

// AssetTag only ships 5 tones, which happens to match the 5 locations
// exactly — each shop gets a distinct, stable color across every page.
export const SHOP_TONE = {
  "Shop 1": "neutral",
  "Shop 2": "rose",
  "Shop 3": "solder",
  "Shop 4": "trace",
  "Warehouse 1": "fault",
};
