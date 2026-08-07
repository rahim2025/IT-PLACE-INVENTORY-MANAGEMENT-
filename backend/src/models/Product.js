import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    brand: { type: mongoose.Schema.Types.ObjectId, ref: "Brand", required: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
    barcode: { type: String, trim: true, unique: true, sparse: true },
    description: { type: String, trim: true },
    // Free text so the shop can quote a range (e.g. "15000-16000") instead of one number.
    sellingPrice: { type: String, trim: true },
    // Optional, set directly by the owner/employee (not derived from purchase
    // history) — set once at product creation and freely editable afterward.
    wholesalePrice: { type: Number, min: 0 },
    // Derived — kept in sync by the purchase/inventory-adjustment controllers
    // so reads stay cheap.
    currentStock: { type: Number, default: 0 },
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier" },
    image: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

productSchema.index({ name: "text", barcode: "text" });

// Same product name is fine under a different brand — but not twice under the
// same one. Case-insensitive so "ThinkPad" and "thinkpad" still collide.
productSchema.index(
  { name: 1, brand: 1 },
  { unique: true, collation: { locale: "en", strength: 2 } }
);

export const Product = mongoose.model("Product", productSchema);
