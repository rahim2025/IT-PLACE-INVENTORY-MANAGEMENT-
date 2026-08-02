import asyncHandler from "express-async-handler";
import { Product } from "../models/Product.js";
import { InventoryLog } from "../models/InventoryLog.js";
import { Settings } from "../models/Settings.js";
import { ApiError } from "../utils/ApiError.js";
import { logActivity } from "../utils/logActivity.js";

export const getStockOverview = asyncHandler(async (req, res) => {
  const { status } = req.query; // "low" | "out" | undefined
  const settings = await Settings.getSingleton();

  const products = await Product.find()
    .populate([{ path: "brand", select: "name" }, { path: "category", select: "name" }])
    .sort({ name: 1 });

  const rows = products.map((p) => {
    const value = p.currentStock * p.avgBuyingPrice;
    const stockStatus = p.currentStock <= 0 ? "out" : p.currentStock <= settings.lowStockThreshold ? "low" : "ok";
    return { ...p.toObject(), value, stockStatus };
  });

  const filtered = status ? rows.filter((r) => r.stockStatus === status) : rows;

  res.json({
    success: true,
    data: filtered,
    meta: {
      totalStock: rows.reduce((s, r) => s + Math.max(r.currentStock, 0), 0),
      inventoryValue: rows.reduce((s, r) => s + r.value, 0),
      lowStockCount: rows.filter((r) => r.stockStatus === "low").length,
      outOfStockCount: rows.filter((r) => r.stockStatus === "out").length,
    },
  });
});

export const listMovementHistory = asyncHandler(async (req, res) => {
  const { product, type, page = 1, limit = 15 } = req.query;

  const filter = {};
  if (product) filter.product = product;
  if (type) filter.type = type;

  const pageNum = Math.max(Number(page) || 1, 1);
  const limitNum = Math.min(Math.max(Number(limit) || 15, 1), 100);

  const [items, total] = await Promise.all([
    InventoryLog.find(filter)
      .populate([{ path: "product", select: "name" }, { path: "user", select: "name" }])
      .sort({ date: -1, createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    InventoryLog.countDocuments(filter),
  ]);

  res.json({ success: true, data: items, meta: { total, page: pageNum, pages: Math.ceil(total / limitNum) || 1 } });
});

export const createAdjustment = asyncHandler(async (req, res) => {
  const { product: productId, quantityChange, reason } = req.body;

  const product = await Product.findById(productId);
  if (!product) throw new ApiError(404, "Product not found.");

  product.currentStock += quantityChange;
  await product.save();

  const log = await InventoryLog.create({
    product: productId,
    type: "Manual Adjustment",
    quantityChange,
    resultingStock: product.currentStock,
    reason,
    user: req.user._id,
  });

  await logActivity({
    user: req.user,
    action: "Adjusted stock",
    target: `${product.name} ${quantityChange > 0 ? "+" : ""}${quantityChange}`,
  });

  const populated = await log.populate([{ path: "product", select: "name" }, { path: "user", select: "name" }]);
  res.status(201).json({ success: true, data: populated });
});
