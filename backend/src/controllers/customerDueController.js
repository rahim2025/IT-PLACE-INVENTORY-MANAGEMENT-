import asyncHandler from "express-async-handler";
import { CustomerDue } from "../models/CustomerDue.js";
import { DuePayment } from "../models/DuePayment.js";
import { Product } from "../models/Product.js";
import { ApiError } from "../utils/ApiError.js";
import { logActivity } from "../utils/logActivity.js";

const POPULATE = [
  { path: "customer", select: "name email" },
  { path: "product", select: "name" },
];

export const listDues = asyncHandler(async (req, res) => {
  const { customer, status, page = 1, limit = 15 } = req.query;

  const filter = {};
  if (customer) filter.customer = customer;
  if (status) filter.status = status;

  const pageNum = Math.max(Number(page) || 1, 1);
  const limitNum = Math.min(Math.max(Number(limit) || 15, 1), 100);

  const [items, total] = await Promise.all([
    CustomerDue.find(filter)
      .populate(POPULATE)
      .sort({ date: -1, createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    CustomerDue.countDocuments(filter),
  ]);

  res.json({ success: true, data: items, meta: { total, page: pageNum, pages: Math.ceil(total / limitNum) || 1 } });
});

// dueAmount is entered directly by staff — not derived from a cart of line
// items — since a due doesn't have to be tied to a specific product at all.
export const createDue = asyncHandler(async (req, res) => {
  const { customer, product, dueAmount, notes, date } = req.body;

  if (product) {
    const exists = await Product.exists({ _id: product });
    if (!exists) throw new ApiError(404, "Product not found.");
  }

  const due = await CustomerDue.create({
    customer,
    product: product || undefined,
    dueAmount,
    date: date || Date.now(),
    notes,
    createdBy: req.user._id,
  });

  await logActivity({ user: req.user, action: "Added customer due", target: `${dueAmount.toFixed(2)}` });

  const populated = await due.populate(POPULATE);
  res.status(201).json({ success: true, data: populated });
});

export const updateDue = asyncHandler(async (req, res) => {
  const { customer, product, dueAmount, notes, date } = req.body;

  const due = await CustomerDue.findById(req.params.id);
  if (!due) throw new ApiError(404, "Due record not found.");

  if (product) {
    const exists = await Product.exists({ _id: product });
    if (!exists) throw new ApiError(404, "Product not found.");
  }

  if (customer !== undefined) due.customer = customer;
  if (product !== undefined) due.product = product || undefined;
  if (dueAmount !== undefined) due.dueAmount = dueAmount;
  if (notes !== undefined) due.notes = notes;
  if (date !== undefined) due.date = date;

  await due.save();
  await logActivity({ user: req.user, action: "Updated customer due", target: `${due.dueAmount.toFixed(2)}` });

  const populated = await due.populate(POPULATE);
  res.json({ success: true, data: populated });
});

// Deleting is never blocked, even if payments are already recorded — any
// payments tied to this due are removed along with it so nothing is left
// pointing at a due record that no longer exists.
export const deleteDue = asyncHandler(async (req, res) => {
  const due = await CustomerDue.findById(req.params.id);
  if (!due) throw new ApiError(404, "Due record not found.");

  await DuePayment.deleteMany({ due: due._id });
  await due.deleteOne();
  await logActivity({ user: req.user, action: "Deleted customer due", target: `${due.dueAmount.toFixed(2)}` });
  res.json({ success: true, message: "Due record deleted." });
});

export const createDuePayment = asyncHandler(async (req, res) => {
  const { due: dueId, amount, notes, date } = req.body;

  const due = await CustomerDue.findById(dueId);
  if (!due) throw new ApiError(404, "Due record not found.");

  if (amount > due.remainingDue) {
    throw new ApiError(400, `Amount exceeds the remaining balance of ${due.remainingDue.toFixed(2)}.`);
  }

  const payment = await DuePayment.create({ due: dueId, amount, notes, date: date || Date.now(), createdBy: req.user._id });

  due.paidAmount += amount;
  await due.save();

  await logActivity({ user: req.user, action: "Recorded due payment", target: `${amount.toFixed(2)}` });

  res.status(201).json({ success: true, data: { payment, due } });
});

export const listDuePayments = asyncHandler(async (req, res) => {
  const { due } = req.query;
  const filter = {};
  if (due) filter.due = due;
  const payments = await DuePayment.find(filter).sort({ date: -1, createdAt: -1 });
  res.json({ success: true, data: payments });
});
