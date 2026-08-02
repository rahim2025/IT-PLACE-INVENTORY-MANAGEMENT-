import asyncHandler from "express-async-handler";
import { Brand } from "../models/Brand.js";
import { Product } from "../models/Product.js";
import { ApiError } from "../utils/ApiError.js";
import { logActivity } from "../utils/logActivity.js";

export const listBrands = asyncHandler(async (req, res) => {
  const brands = await Brand.find().sort({ name: 1 });
  res.json({ success: true, data: brands });
});

export const createBrand = asyncHandler(async (req, res) => {
  const brand = await Brand.create({ name: req.body.name.trim() });
  await logActivity({ user: req.user, action: "Added brand", target: brand.name });
  res.status(201).json({ success: true, data: brand });
});

export const updateBrand = asyncHandler(async (req, res) => {
  const brand = await Brand.findById(req.params.id);
  if (!brand) throw new ApiError(404, "Brand not found.");

  brand.name = req.body.name.trim();
  await brand.save();
  await logActivity({ user: req.user, action: "Updated brand", target: brand.name });
  res.json({ success: true, data: brand });
});

export const deleteBrand = asyncHandler(async (req, res) => {
  const brand = await Brand.findById(req.params.id);
  if (!brand) throw new ApiError(404, "Brand not found.");

  const inUse = await Product.countDocuments({ brand: brand._id });
  if (inUse > 0) {
    throw new ApiError(409, "Products are still assigned to this brand, so it can't be deleted.");
  }

  await brand.deleteOne();
  await logActivity({ user: req.user, action: "Deleted brand", target: brand.name });
  res.json({ success: true, message: "Brand deleted." });
});
