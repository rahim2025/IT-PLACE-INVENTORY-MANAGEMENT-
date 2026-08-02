import asyncHandler from "express-async-handler";
import { Supplier } from "../models/Supplier.js";
import { ApiError } from "../utils/ApiError.js";

export const listSuppliers = asyncHandler(async (req, res) => {
  const suppliers = await Supplier.find().sort({ name: 1 });
  res.json({ success: true, data: suppliers });
});

export const createSupplier = asyncHandler(async (req, res) => {
  const supplier = await Supplier.create(req.body);
  res.status(201).json({ success: true, data: supplier });
});

export const updateSupplier = asyncHandler(async (req, res) => {
  const supplier = await Supplier.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!supplier) throw new ApiError(404, "Supplier not found.");
  res.json({ success: true, data: supplier });
});
