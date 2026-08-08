import asyncHandler from "express-async-handler";
import { Purchase } from "../models/Purchase.js";
import { Product } from "../models/Product.js";
import { InventoryLog } from "../models/InventoryLog.js";
import { ApiError } from "../utils/ApiError.js";
import { logActivity } from "../utils/logActivity.js";

const POPULATE = [
  { path: "product", select: "name brand category", populate: ["brand", "category"] },
  { path: "supplier", select: "name" },
];

export const listPurchases = asyncHandler(async (req, res) => {
  const { product, supplier, from, to, page = 1, limit = 10 } = req.query;

  const filter = {};
  if (product) filter.product = product;
  if (supplier) filter.supplier = supplier;
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = new Date(from);
    if (to) filter.date.$lte = new Date(to);
  }

  const pageNum = Math.max(Number(page) || 1, 1);
  const limitNum = Math.min(Math.max(Number(limit) || 10, 1), 1000);

  const [items, total] = await Promise.all([
    Purchase.find(filter)
      .populate(POPULATE)
      .sort({ date: -1, createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    Purchase.countDocuments(filter),
  ]);

  res.json({ success: true, data: items, meta: { total, page: pageNum, pages: Math.ceil(total / limitNum) || 1 } });
});

// Stock-in entry point. Never edits a prior purchase's price — each purchase
// is kept as its own historical record. Doesn't touch the product's
// wholesale price; that's a plain field the owner sets/updates separately.
export const createPurchase = asyncHandler(async (req, res) => {
  const { product: productId, quantity, unitPrice, supplier, date, notes } = req.body;

  const product = await Product.findById(productId);
  if (!product) throw new ApiError(404, "Product not found.");

  const purchase = await Purchase.create({
    product: productId,
    quantity,
    unitPrice: unitPrice ? Number(unitPrice) : 0,
    supplier: supplier || undefined,
    date: date || Date.now(),
    notes,
    createdBy: req.user._id,
  });

  product.currentStock += quantity;
  await product.save();

  await InventoryLog.create({
    product: productId,
    type: "Purchase",
    quantityChange: quantity,
    resultingStock: product.currentStock,
    reference: purchase._id,
    user: req.user._id,
    date: purchase.date,
  });

  await logActivity({ user: req.user, action: "Recorded purchase", target: `${product.name} × ${quantity}` });

  const populated = await purchase.populate(POPULATE);
  res.status(201).json({ success: true, data: populated });
});
