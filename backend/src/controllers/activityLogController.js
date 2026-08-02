import asyncHandler from "express-async-handler";
import { ActivityLog } from "../models/ActivityLog.js";

export const listActivityLogs = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const pageNum = Math.max(Number(page) || 1, 1);
  const limitNum = Math.min(Math.max(Number(limit) || 20, 1), 100);

  const [items, total] = await Promise.all([
    ActivityLog.find()
      .sort({ date: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    ActivityLog.countDocuments(),
  ]);

  res.json({ success: true, data: items, meta: { total, page: pageNum, pages: Math.ceil(total / limitNum) || 1 } });
});
