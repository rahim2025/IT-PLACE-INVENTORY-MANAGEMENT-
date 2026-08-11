import mongoose from "mongoose";
import { SHOPS } from "../constants/shops.js";

export const EXPENSE_CATEGORIES = [
  "Rent",
  "Internet",
  "Electricity",
  "Transport",
  "Office Supplies",
  "Maintenance",
  "Miscellaneous",
];

const expenseSchema = new mongoose.Schema(
  {
    // Free text, not a fixed enum — the shop can add a new category any time
    // just by typing it on the Add expense form. EXPENSE_CATEGORIES above is
    // only a starting suggestion list, not an enforced set.
    category: { type: String, required: true, trim: true },
    // Optional — unlike Product/Sale, an expense isn't always tied to one
    // location (e.g. a business-wide software subscription). Left unset
    // means "company-wide".
    shop: { type: String, enum: SHOPS },
    amount: { type: Number, required: true, min: 0.01 },
    date: { type: Date, required: true, default: Date.now },
    description: { type: String, required: true, trim: true },
    employee: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

expenseSchema.index({ date: -1 });

export const Expense = mongoose.model("Expense", expenseSchema);
