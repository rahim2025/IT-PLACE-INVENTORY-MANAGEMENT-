import asyncHandler from "express-async-handler";
import { Customer } from "../models/Customer.js";
import { CustomerDue } from "../models/CustomerDue.js";
import { logActivity } from "../utils/logActivity.js";

// Grouped by (customer, type) rather than just customer, since a due balance
// and a credit balance must never be summed together — a $100 due and a $100
// credit for the same person net to $0 owed either way, not $200 outstanding.
export const listCustomers = asyncHandler(async (req, res) => {
  const customers = await Customer.find().sort({ name: 1 });

  const grouped = await CustomerDue.aggregate([
    { $group: { _id: { customer: "$customer", type: "$type" }, sum: { $sum: "$remainingDue" }, count: { $sum: 1 } } },
  ]);

  const byCustomer = {};
  for (const g of grouped) {
    const key = String(g._id.customer);
    const entry = (byCustomer[key] ??= { due: 0, credit: 0, dueCount: 0 });
    if (g._id.type === "credit") entry.credit += g.sum;
    else entry.due += g.sum;
    entry.dueCount += g.count;
  }

  const rows = customers.map((c) => {
    const b = byCustomer[String(c._id)] ?? { due: 0, credit: 0, dueCount: 0 };
    return {
      ...c.toObject(),
      outstandingDue: b.due,
      outstandingCredit: b.credit,
      netOutstanding: b.due - b.credit,
      dueCount: b.dueCount,
    };
  });

  res.json({ success: true, data: rows });
});

export const createCustomer = asyncHandler(async (req, res) => {
  const customer = await Customer.create(req.body);
  await logActivity({ user: req.user, action: "Added customer", target: customer.name });
  res.status(201).json({ success: true, data: customer });
});
