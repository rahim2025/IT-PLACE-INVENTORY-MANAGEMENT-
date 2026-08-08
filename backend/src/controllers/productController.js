import asyncHandler from "express-async-handler";
import { Product } from "../models/Product.js";
import { Purchase } from "../models/Purchase.js";
import { InventoryLog } from "../models/InventoryLog.js";
import { CustomerDue } from "../models/CustomerDue.js";
import { ApiError } from "../utils/ApiError.js";
import { logActivity } from "../utils/logActivity.js";

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
  // No upper cap here, unlike other list endpoints — the catalog is
  // reference data (bounded by what the shop actually stocks, not an
  // ever-growing log like purchases/sales), and pages across the app fetch
  // it in one shot for pickers, filters, and the products table itself.
  // Capping at a fixed number just means the bug resurfaces once the
  // catalog outgrows it — same failure mode as the old 100-item cap.
  const limitNum = Math.max(Number(limit) || 10, 1);

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

// Starting stock is captured here as a real Purchase (not a special-cased
// default), so it follows the same InventoryLog trail as every later restock
// — see purchaseController.createPurchase. Wholesale price, unlike stock, is
// a plain user-set field: it's not recomputed from purchase history and can
// be changed later via updateProduct.
export const createProduct = asyncHandler(async (req, res) => {
  const { name, brand, category, sellingPrice, quantity } = req.body;
  const wholesalePrice = req.body.wholesalePrice ? Number(req.body.wholesalePrice) : 0;

  const product = await Product.create({
    name,
    brand,
    category: category || undefined,
    sellingPrice: sellingPrice || undefined,
    wholesalePrice: req.body.wholesalePrice ? wholesalePrice : undefined,
    createdBy: req.user._id,
  });

  const purchase = await Purchase.create({
    product: product._id,
    quantity,
    unitPrice: wholesalePrice,
    date: Date.now(),
    notes: "Initial stock-in.",
    createdBy: req.user._id,
  });

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
  const { name, brand, category, barcode, description, sellingPrice, wholesalePrice, supplier, image } = req.body;

  const product = await Product.findById(req.params.id);
  if (!product) throw new ApiError(404, "Product not found.");

  if (name !== undefined) product.name = name;
  if (brand !== undefined) product.brand = brand;
  if (category !== undefined) product.category = category || undefined;
  if (barcode !== undefined) product.barcode = barcode || undefined;
  if (description !== undefined) product.description = description;
  if (sellingPrice !== undefined) product.sellingPrice = sellingPrice;
  if (wholesalePrice !== undefined) product.wholesalePrice = wholesalePrice === "" ? undefined : Number(wholesalePrice);
  if (supplier !== undefined) product.supplier = supplier || undefined;
  if (image !== undefined) product.image = image;

  await product.save();
  await logActivity({ user: req.user, action: "Updated product", target: product.name });
  res.json({ success: true, data: product });
});

// Purchase history isn't checked here — every product gets an "Initial
// stock-in" Purchase the moment it's created (see createProduct), so that
// would block every deletion, always. Past Purchase/InventoryLog rows for
// this product are left in place after deletion (they're already rendered
// null-safely wherever a deleted product's name would otherwise show), so
// purchase-spend history and reports stay intact.
export const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw new ApiError(404, "Product not found.");

  const dueCount = await CustomerDue.countDocuments({ product: product._id });
  if (dueCount > 0) {
    throw new ApiError(
      409,
      "This product has customer due records attached, so it can't be deleted. Consider keeping it in the catalog instead."
    );
  }

  await product.deleteOne();
  await logActivity({ user: req.user, action: "Deleted product", target: product.name });
  res.json({ success: true, message: "Product deleted." });
});
