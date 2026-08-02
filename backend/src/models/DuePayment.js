import mongoose from "mongoose";

const duePaymentSchema = new mongoose.Schema(
  {
    due: { type: mongoose.Schema.Types.ObjectId, ref: "CustomerDue", required: true },
    amount: { type: Number, required: true, min: 0.01 },
    date: { type: Date, required: true, default: Date.now },
    notes: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

duePaymentSchema.index({ due: 1, date: -1 });

export const DuePayment = mongoose.model("DuePayment", duePaymentSchema);
