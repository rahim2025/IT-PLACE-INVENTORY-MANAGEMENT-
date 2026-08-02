import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    brand: { type: mongoose.Schema.Types.ObjectId, ref: "Brand", required: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
    barcode: { type: String, trim: true, unique: true, sparse: true },
    description: { type: String, trim: true },
    // Free text so the shop can quote a range (e.g. "15000-16000") instead of one number.
    sellingPrice: { type: String, trim: true },
    // Derived fields — never set directly by client requests. Kept in sync by
    // the purchase/inventory-adjustment controllers so reads stay cheap.
    avgBuyingPrice: { type: Number, default: 0, min: 0 },
    currentStock: { type: Number, default: 0 },
    // Set whenever stock hits 0 — lets the next restock recompute its
    // weighted-average cost from just the new stocking cycle, instead of
    // blending in prices from before the product ran out. See
    // purchaseController.createPurchase.
    stockResetAt: { type: Date },
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier" },
    image: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// Out of stock means there's no batch left to hold an average cost for.
// Enforced here — not just at the call sites that reduce stock — so it
// can never drift, no matter which controller touches currentStock.
productSchema.pre("save", function resetAvgPriceWhenOutOfStock(next) {
  if (this.currentStock <= 0) {
    this.avgBuyingPrice = 0;
    this.stockResetAt = new Date();
  }
  next();
});

productSchema.index({ name: "text", barcode: "text" });

// Same product name is fine under a different brand — but not twice under the
// same one. Case-insensitive so "ThinkPad" and "thinkpad" still collide.
productSchema.index(
  { name: 1, brand: 1 },
  { unique: true, collation: { locale: "en", strength: 2 } }
);

export const Product = mongoose.model("Product", productSchema);
