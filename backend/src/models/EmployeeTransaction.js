import mongoose from "mongoose";

const employeeTransactionSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
    type: { type: String, enum: ["Advance", "Other"], required: true },
    amount: { type: Number, required: true, min: 0.01 },
    date: { type: Date, required: true, default: Date.now },
    notes: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

employeeTransactionSchema.index({ employee: 1, date: -1 });

export const EmployeeTransaction = mongoose.model("EmployeeTransaction", employeeTransactionSchema);
