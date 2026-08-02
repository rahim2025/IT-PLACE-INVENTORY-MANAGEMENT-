import asyncHandler from "express-async-handler";
import { Sale } from "../models/Sale.js";
import { Product } from "../models/Product.js";
import { InventoryLog } from "../models/InventoryLog.js";
import { ApiError } from "../utils/ApiError.js";
import { logActivity } from "../utils/logActivity.js";

// Brand is populated too so per-brand reporting (e.g. commission owed to a
// specific brand) can be computed from the same sales list — no separate
// endpoint needed.
const POPULATE = [
  {
    path: "items.product",
    select: "name brand",
    populate: { path: "brand", select: "name" },
  },
];

export const listSales = asyncHandler(async (req, res) => {
  const { from, to, page = 1, limit = 15 } = req.query;

  const filter = {};
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = new Date(from);
    if (to) filter.date.$lte = new Date(to);
  }

  const pageNum = Math.max(Number(page) || 1, 1);
  const limitNum = Math.min(Math.max(Number(limit) || 15, 1), 100);

  const [items, total] = await Promise.all([
    Sale.find(filter)
      .populate(POPULATE)
      .sort({ date: -1, createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    Sale.countDocuments(filter),
  ]);

  res.json({ success: true, data: items, meta: { total, page: pageNum, pages: Math.ceil(total / limitNum) || 1 } });
});

// Sale entry point. Reduces stock for every line item and leaves an
// InventoryLog entry behind for each — the same audit trail every other
// stock movement (purchases, adjustments) already follows.
export const createSale = asyncHandler(async (req, res) => {
  const { items, date, notes } = req.body;

  const productIds = items.map((i) => i.product);
  const products = await Product.find({ _id: { $in: productIds } });
  const productById = new Map(products.map((p) => [String(p._id), p]));

  if (products.length !== new Set(productIds.map(String)).size) {
    throw new ApiError(400, "One or more products in this sale could not be found.");
  }

  for (const item of items) {
    const product = productById.get(String(item.product));
    if (product.currentStock < item.quantity) {
      throw new ApiError(400, `Not enough stock for "${product.name}". Only ${product.currentStock} available.`);
    }
  }

  const totalAmount = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const saleDate = date || Date.now();

  const sale = await Sale.create({ items, totalAmount, date: saleDate, notes, createdBy: req.user._id });

  for (const item of items) {
    const product = productById.get(String(item.product));
    product.currentStock -= item.quantity;
    await product.save();

    await InventoryLog.create({
      product: product._id,
      type: "Sale",
      quantityChange: -item.quantity,
      resultingStock: product.currentStock,
      reference: sale._id,
      user: req.user._id,
      date: saleDate,
    });
  }

  await logActivity({ user: req.user, action: "Recorded sale", target: `${totalAmount.toFixed(2)}` });

  const populated = await sale.populate(POPULATE);
  res.status(201).json({ success: true, data: populated });
});
