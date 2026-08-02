import asyncHandler from "express-async-handler";
import { Category } from "../models/Category.js";
import { Product } from "../models/Product.js";
import { ApiError } from "../utils/ApiError.js";
import { logActivity } from "../utils/logActivity.js";

export const listCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find().sort({ name: 1 });
  res.json({ success: true, data: categories });
});

export const createCategory = asyncHandler(async (req, res) => {
  const category = await Category.create({ name: req.body.name.trim() });
  await logActivity({ user: req.user, action: "Added category", target: category.name });
  res.status(201).json({ success: true, data: category });
});

export const updateCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) throw new ApiError(404, "Category not found.");

  category.name = req.body.name.trim();
  await category.save();
  await logActivity({ user: req.user, action: "Updated category", target: category.name });
  res.json({ success: true, data: category });
});

export const deleteCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) throw new ApiError(404, "Category not found.");

  const inUse = await Product.countDocuments({ category: category._id });
  if (inUse > 0) {
    throw new ApiError(409, "Products are still assigned to this category, so it can't be deleted.");
  }

  await category.deleteOne();
  await logActivity({ user: req.user, action: "Deleted category", target: category.name });
  res.json({ success: true, message: "Category deleted." });
});
