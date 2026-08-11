import asyncHandler from "express-async-handler";
import { Expense, EXPENSE_CATEGORIES } from "../models/Expense.js";
import { logActivity } from "../utils/logActivity.js";

export const listExpenses = asyncHandler(async (req, res) => {
  const { category, shop, from, to, page = 1, limit = 15 } = req.query;

  const filter = {};
  if (category) filter.category = category;
  if (shop) filter.shop = shop;
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = new Date(from);
    if (to) filter.date.$lte = new Date(to);
  }

  const pageNum = Math.max(Number(page) || 1, 1);
  const limitNum = Math.min(Math.max(Number(limit) || 15, 1), 100);

  const [items, total, usedCategories] = await Promise.all([
    Expense.find(filter)
      .populate({ path: "employee", select: "name" })
      .sort({ date: -1, createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    Expense.countDocuments(filter),
    Expense.distinct("category"),
  ]);

  const categories = Array.from(new Set([...EXPENSE_CATEGORIES, ...usedCategories])).sort();

  res.json({ success: true, data: items, meta: { total, page: pageNum, pages: Math.ceil(total / limitNum) || 1, categories } });
});

export const createExpense = asyncHandler(async (req, res) => {
  const { category, shop, amount, date, description, employee } = req.body;

  const expense = await Expense.create({
    category,
    shop: shop || undefined,
    amount,
    date: date || Date.now(),
    description,
    employee: employee || undefined,
    createdBy: req.user._id,
  });

  await logActivity({ user: req.user, action: "Added expense", target: `${category} — ${amount}` });

  const populated = await expense.populate({ path: "employee", select: "name" });
  res.status(201).json({ success: true, data: populated });
});
