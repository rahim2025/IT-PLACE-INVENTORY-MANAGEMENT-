import mongoose from "mongoose";

const customerDueSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true },
    // Optional — a due doesn't have to be tied to a specific catalog product.
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    // Typed directly by staff at due-creation time, not derived from line items.
    dueAmount: { type: Number, required: true, min: 0.01 },
    // Derived — kept in sync by the due-payment controller, never set directly by clients.
    paidAmount: { type: Number, default: 0, min: 0 },
    remainingDue: { type: Number, default: 0, min: 0 },
    // Only two states — partial payments still just show as "Due" until
    // the balance is fully cleared, to keep the status simple to scan.
    status: { type: String, enum: ["Due", "Paid"], default: "Due" },
    date: { type: Date, required: true, default: Date.now },
    notes: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

customerDueSchema.pre("validate", function syncDerivedFields(next) {
  this.remainingDue = Math.max(this.dueAmount - this.paidAmount, 0);
  this.status = this.remainingDue <= 0 ? "Paid" : "Due";
  next();
});

customerDueSchema.index({ customer: 1, date: -1 });

export const CustomerDue = mongoose.model("CustomerDue", customerDueSchema);
