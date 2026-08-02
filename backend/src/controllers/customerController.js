import asyncHandler from "express-async-handler";
import { Customer } from "../models/Customer.js";
import { CustomerDue } from "../models/CustomerDue.js";
import { logActivity } from "../utils/logActivity.js";

export const listCustomers = asyncHandler(async (req, res) => {
  const customers = await Customer.find().sort({ name: 1 });

  const outstanding = await CustomerDue.aggregate([
    { $group: { _id: "$customer", outstanding: { $sum: "$remainingDue" }, dueCount: { $sum: 1 } } },
  ]);
  const byCustomer = Object.fromEntries(outstanding.map((o) => [String(o._id), o]));

  const rows = customers.map((c) => ({
    ...c.toObject(),
    outstanding: byCustomer[String(c._id)]?.outstanding ?? 0,
    dueCount: byCustomer[String(c._id)]?.dueCount ?? 0,
  }));

  res.json({ success: true, data: rows });
});

export const createCustomer = asyncHandler(async (req, res) => {
  const customer = await Customer.create(req.body);
  await logActivity({ user: req.user, action: "Added customer", target: customer.name });
  res.status(201).json({ success: true, data: customer });
});
