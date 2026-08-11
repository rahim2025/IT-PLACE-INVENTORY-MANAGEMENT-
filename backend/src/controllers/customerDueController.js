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
  const { customer, status, type, page = 1, limit = 15 } = req.query;

  const filter = {};
  if (customer) filter.customer = customer;
  if (status) filter.status = status;
  if (type) filter.type = type;

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
  const { customer, product, type, dueAmount, notes, date } = req.body;

  if (product) {
    const exists = await Product.exists({ _id: product });
    if (!exists) throw new ApiError(404, "Product not found.");
  }

  const due = await CustomerDue.create({
    customer,
    type: type || "due",
    product: product || undefined,
    dueAmount,
    date: date || Date.now(),
    notes,
    createdBy: req.user._id,
  });

  await logActivity({
    user: req.user,
    action: due.type === "credit" ? "Recorded shop credit" : "Added customer due",
    target: `${dueAmount.toFixed(2)}`,
  });

  const populated = await due.populate(POPULATE);
  res.status(201).json({ success: true, data: populated });
});

export const updateDue = asyncHandler(async (req, res) => {
  const { customer, product, type, dueAmount, notes, date } = req.body;

  const due = await CustomerDue.findById(req.params.id);
  if (!due) throw new ApiError(404, "Due record not found.");

  if (product) {
    const exists = await Product.exists({ _id: product });
    if (!exists) throw new ApiError(404, "Product not found.");
  }

  if (customer !== undefined) due.customer = customer;
  if (type !== undefined) due.type = type;
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

// Overpaying used to be a hard error. Now the payment settles this due up to
// its remaining balance, and any leftover automatically opens a *new*
// CustomerDue for the same customer with the opposite type — e.g. paying off
// a $300 due with $500 settles the due and opens a fresh $200 credit (the
// shop now owes the customer $200). History is never rewritten — the
// original due is closed as paid, the excess becomes its own record — so the
// audit trail (who paid what, when) stays intact either way.
export const createDuePayment = asyncHandler(async (req, res) => {
  const { due: dueId, amount, notes, date } = req.body;

  const due = await CustomerDue.findById(dueId);
  if (!due) throw new ApiError(404, "Due record not found.");

  const paymentDate = date || Date.now();
  const applied = Math.min(amount, due.remainingDue);
  const overflow = Math.round((amount - applied) * 100) / 100;

  const payment = await DuePayment.create({
    due: dueId,
    amount: applied,
    notes,
    date: paymentDate,
    createdBy: req.user._id,
  });

  due.paidAmount += applied;
  await due.save();

  let overflowDue = null;
  if (overflow > 0) {
    const flippedType = due.type === "credit" ? "due" : "credit";
    overflowDue = await CustomerDue.create({
      customer: due.customer,
      type: flippedType,
      dueAmount: overflow,
      date: paymentDate,
      notes: `Auto-created: overpayment of ${overflow.toFixed(2)} while settling a ${due.type === "credit" ? "credit" : "due"} record.`,
      createdBy: req.user._id,
    });
  }

  await logActivity({
    user: req.user,
    action: "Recorded due payment",
    target: overflow > 0 ? `${amount.toFixed(2)} (${overflow.toFixed(2)} carried forward)` : `${amount.toFixed(2)}`,
  });

  const populatedDue = await due.populate(POPULATE);
  const populatedOverflow = overflowDue ? await overflowDue.populate(POPULATE) : null;

  res.status(201).json({ success: true, data: { payment, due: populatedDue, overflowDue: populatedOverflow } });
});

// Supports either a single due (?due=) or every payment across all of one
// customer's due records (?customer=), so a customer's full payment history
// can be shown in one place instead of hunting through each due separately.
export const listDuePayments = asyncHandler(async (req, res) => {
  const { due, customer } = req.query;
  const filter = {};
  if (customer) {
    const dueIds = await CustomerDue.find({ customer }).distinct("_id");
    filter.due = { $in: dueIds };
  } else if (due) {
    filter.due = due;
  }

  const payments = await DuePayment.find(filter)
    .populate({ path: "due", select: "product", populate: { path: "product", select: "name" } })
    .sort({ date: -1, createdAt: -1 });
  res.json({ success: true, data: payments });
});
