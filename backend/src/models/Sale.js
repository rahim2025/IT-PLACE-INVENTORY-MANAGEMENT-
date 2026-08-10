import mongoose from "mongoose";

const saleItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const saleSchema = new mongoose.Schema(
  {
    items: { type: [saleItemSchema], required: true, validate: (v) => v.length > 0 },
    // A sale happens at one physical shop — every item in it must belong to
    // this shop (enforced in the controller). Stored on the sale itself
    // (not just derived from items.product.shop) so shop-wise reports stay
    // accurate even if a product's shop assignment changes later.
    shop: { type: String, enum: ["Shop 1", "Shop 2"], required: true },
    // Derived server-side from items — never trusted from the client.
    totalAmount: { type: Number, required: true, min: 0 },
    date: { type: Date, required: true, default: Date.now },
    notes: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

saleSchema.index({ date: -1 });

export const Sale = mongoose.model("Sale", saleSchema);
