import asyncHandler from "express-async-handler";
import { Broker } from "../models/Broker.js";
import { BrokerTransaction } from "../models/BrokerTransaction.js";
import { ApiError } from "../utils/ApiError.js";
import { logActivity } from "../utils/logActivity.js";

async function getBalanceParts(brokerId) {
  const totals = await BrokerTransaction.aggregate([
    { $match: { broker: brokerId } },
    { $group: { _id: "$type", amount: { $sum: "$amount" } } },
  ]);
  const credited = totals.find((t) => t._id === "Credit")?.amount ?? 0;
  const paid = totals.find((t) => t._id === "Payment")?.amount ?? 0;
  return { credited, paid, balance: credited - paid };
}

export const listBrokers = asyncHandler(async (req, res) => {
  const brokers = await Broker.find().sort({ name: 1 });

  const totals = await BrokerTransaction.aggregate([
    { $group: { _id: { broker: "$broker", type: "$type" }, amount: { $sum: "$amount" } } },
  ]);

  const totalsByBroker = new Map();
  for (const t of totals) {
    const key = String(t._id.broker);
    if (!totalsByBroker.has(key)) totalsByBroker.set(key, { credited: 0, paid: 0 });
    const entry = totalsByBroker.get(key);
    if (t._id.type === "Credit") entry.credited = t.amount;
    else entry.paid = t.amount;
  }

  const rows = brokers.map((b) => {
    const t = totalsByBroker.get(String(b._id)) ?? { credited: 0, paid: 0 };
    return { ...b.toObject(), totalCredited: t.credited, totalPaid: t.paid, balance: t.credited - t.paid };
  });

  res.json({ success: true, data: rows });
});

export const createBroker = asyncHandler(async (req, res) => {
  const broker = await Broker.create(req.body);
  await logActivity({ user: req.user, action: "Added broker", target: broker.name });
  res.status(201).json({ success: true, data: broker });
});

export const updateBroker = asyncHandler(async (req, res) => {
  const { name, phone, notes } = req.body;

  const broker = await Broker.findById(req.params.id);
  if (!broker) throw new ApiError(404, "Broker not found.");

  if (name !== undefined) broker.name = name;
  if (phone !== undefined) broker.phone = phone || undefined;
  if (notes !== undefined) broker.notes = notes || undefined;

  await broker.save();
  await logActivity({ user: req.user, action: "Updated broker", target: broker.name });
  res.json({ success: true, data: broker });
});

// Deleting is never blocked, even with transaction history or an owed
// balance — any transactions tied to this broker are removed along with
// them so nothing is left pointing at a broker who no longer exists.
export const deleteBroker = asyncHandler(async (req, res) => {
  const broker = await Broker.findById(req.params.id);
  if (!broker) throw new ApiError(404, "Broker not found.");

  await BrokerTransaction.deleteMany({ broker: broker._id });
  await broker.deleteOne();
  await logActivity({ user: req.user, action: "Deleted broker", target: broker.name });
  res.json({ success: true, message: "Broker deleted." });
});

export const listBrokerTransactions = asyncHandler(async (req, res) => {
  const { broker, page = 1, limit = 15 } = req.query;
  const filter = {};
  if (broker) filter.broker = broker;

  const pageNum = Math.max(Number(page) || 1, 1);
  const limitNum = Math.min(Math.max(Number(limit) || 15, 1), 100);

  const [items, total] = await Promise.all([
    BrokerTransaction.find(filter)
      .populate({ path: "broker", select: "name" })
      .sort({ date: -1, createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    BrokerTransaction.countDocuments(filter),
  ]);

  res.json({ success: true, data: items, meta: { total, page: pageNum, pages: Math.ceil(total / limitNum) || 1 } });
});

// Credit adds to what the shop owes the broker; Payment reduces it. A
// Payment can never exceed the broker's current balance — computed fresh
// from the full transaction history each time, never stored as a mutable
// field that could drift from it.
export const createBrokerTransaction = asyncHandler(async (req, res) => {
  const { broker: brokerId, type, amount, notes, date } = req.body;

  const broker = await Broker.findById(brokerId);
  if (!broker) throw new ApiError(404, "Broker not found.");

  if (type === "Payment") {
    const { balance } = await getBalanceParts(broker._id);
    if (amount > balance) {
      throw new ApiError(400, `Amount exceeds the current balance of ${balance.toFixed(2)}.`);
    }
  }

  const transaction = await BrokerTransaction.create({
    broker: brokerId,
    type,
    amount,
    notes,
    date: date || Date.now(),
    createdBy: req.user._id,
  });

  await logActivity({
    user: req.user,
    action: type === "Credit" ? "Added broker commission" : "Paid broker",
    target: `${broker.name} — ${amount}`,
  });

  const populated = await transaction.populate({ path: "broker", select: "name" });
  res.status(201).json({ success: true, data: populated });
});
