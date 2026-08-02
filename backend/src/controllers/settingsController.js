import asyncHandler from "express-async-handler";
import { Settings } from "../models/Settings.js";
import { logActivity } from "../utils/logActivity.js";

export const getSettings = asyncHandler(async (req, res) => {
  const settings = await Settings.getSingleton();
  res.json({ success: true, data: settings });
});

export const updateSettings = asyncHandler(async (req, res) => {
  const settings = await Settings.getSingleton();
  const { shopName, address, supportEmail, lowStockThreshold } = req.body;

  if (shopName !== undefined) settings.shopName = shopName;
  if (address !== undefined) settings.address = address;
  if (supportEmail !== undefined) settings.supportEmail = supportEmail;
  if (lowStockThreshold !== undefined) settings.lowStockThreshold = lowStockThreshold;

  await settings.save();
  await logActivity({ user: req.user, action: "Updated settings", target: settings.shopName });
  res.json({ success: true, data: settings });
});
