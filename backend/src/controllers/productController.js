import asyncHandler from "express-async-handler";
import { Product } from "../models/Product.js";
import { Purchase } from "../models/Purchase.js";
import { InventoryLog } from "../models/InventoryLog.js";
import { CustomerDue } from "../models/CustomerDue.js";
import { ApiError } from "../utils/ApiError.js";
import { logActivity } from "../utils/logActivity.js";
import { weightedAverage } from "../utils/weightedAverage.js";

const POPULATE = [
  { path: "brand", select: "name" },
  { path: "category", select: "name" },
  { path: "supplier", select: "name" },
];

export const listProducts = asyncHandler(async (req, res) => {
  const { search, category, brand, supplier, page = 1, limit = 10 } = req.query;

  const filter = {};
  if (search) filter.$text = { $search: search };
  if (category) filter.category = category;
  if (brand) filter.brand = brand;
  if (supplier) filter.supplier = supplier;

  const pageNum = Math.max(Number(page) || 1, 1);
  const limitNum = Math.min(Math.max(Number(limit) || 10, 1), 100);

  const [items, total] = await Promise.all([
    Product.find(filter)
      .populate(POPULATE)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    Product.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: items,
    meta: { total, page: pageNum, pages: Math.ceil(total / limitNum) || 1 },
  });
});

export const getProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id).populate(POPULATE);
  if (!product) throw new ApiError(404, "Product not found.");
  res.json({ success: true, data: product });
});

// Starting stock/cost are captured here as a real Purchase (not special-cased
// defaults), so they follow the same weighted-average + InventoryLog trail as
// every later restock — see purchaseController.createPurchase.
export const createProduct = asyncHandler(async (req, res) => {
  const { name, brand, category, sellingPrice, quantity, buyingPrice } = req.body;

  const product = await Product.create({
    name,
    brand,
    category,
    sellingPrice,
    createdBy: req.user._id,
  });

  const purchase = await Purchase.create({
    product: product._id,
    quantity,
    unitPrice: buyingPrice,
    date: Date.now(),
    notes: "Initial stock-in.",
    createdBy: req.user._id,
  });

  product.avgBuyingPrice = weightedAverage([{ quantity, unitPrice: buyingPrice }]);
  product.currentStock = quantity;
  await product.save();

  await InventoryLog.create({
    product: product._id,
    type: "Purchase",
    quantityChange: quantity,
    resultingStock: product.currentStock,
    reference: purchase._id,
    user: req.user._id,
    date: purchase.date,
  });

  await logActivity({ user: req.user, action: "Added product", target: product.name });

  const populated = await product.populate(POPULATE);
  res.status(201).json({ success: true, data: populated });
});

export const updateProduct = asyncHandler(async (req, res) => {
  const { name, brand, category, barcode, description, sellingPrice, supplier, image } = req.body;

  const product = await Product.findById(req.params.id);
  if (!product) throw new ApiError(404, "Product not found.");

  if (name !== undefined) product.name = name;
  if (brand !== undefined) product.brand = brand;
  if (category !== undefined) product.category = category;
  if (barcode !== undefined) product.barcode = barcode || undefined;
  if (description !== undefined) product.description = description;
  if (sellingPrice !== undefined) product.sellingPrice = sellingPrice;
  if (supplier !== undefined) product.supplier = supplier || undefined;
  if (image !== undefined) product.image = image;

  await product.save();
  await logActivity({ user: req.user, action: "Updated product", target: product.name });
  res.json({ success: true, data: product });
});

export const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw new ApiError(404, "Product not found.");

  const [purchaseCount, dueCount] = await Promise.all([
    Purchase.countDocuments({ product: product._id }),
    CustomerDue.countDocuments({ product: product._id }),
  ]);

  if (purchaseCount > 0 || dueCount > 0) {
    throw new ApiError(
      409,
      "This product has purchase or due history attached, so it can't be deleted. Consider keeping it in the catalog instead."
    );
  }

  await product.deleteOne();
  await logActivity({ user: req.user, action: "Deleted product", target: product.name });
  res.json({ success: true, message: "Product deleted." });
});
