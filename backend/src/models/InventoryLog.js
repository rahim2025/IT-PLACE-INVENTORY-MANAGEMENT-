import mongoose from "mongoose";

const inventoryLogSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    type: { type: String, enum: ["Purchase", "Manual Adjustment", "Sale"], required: true },
    quantityChange: { type: Number, required: true },
    resultingStock: { type: Number, required: true },
    reason: { type: String, trim: true },
    // Points at the Purchase or Sale doc this movement came from, depending on
    // type — not populated anywhere today, so a single loose ref is enough.
    reference: { type: mongoose.Schema.Types.ObjectId },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    date: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true }
);

inventoryLogSchema.index({ product: 1, date: -1 });

export const InventoryLog = mongoose.model("InventoryLog", inventoryLogSchema);
