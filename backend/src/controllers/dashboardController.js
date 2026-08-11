import asyncHandler from "express-async-handler";
import { Product } from "../models/Product.js";
import { Purchase } from "../models/Purchase.js";
import { Expense } from "../models/Expense.js";
import { CustomerDue } from "../models/CustomerDue.js";
import { Employee } from "../models/Employee.js";
import { Settings } from "../models/Settings.js";
import { bucketByMonth, getInventoryValueTrend } from "../services/analytics.js";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
function endOfToday() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

export const getDashboard = asyncHandler(async (req, res) => {
  const settings = await Settings.getSingleton();
  const todayStart = startOfToday();
  const todayEnd = endOfToday();

  const [products, purchases, expenses, dues, totalEmployees, todaysPurchases, todaysExpenses] = await Promise.all([
    Product.find().select("currentStock wholesalePrice").lean(),
    Purchase.find().select("date quantity unitPrice").lean(),
    Expense.find().select("date amount").lean(),
    CustomerDue.find().select("remainingDue type").lean(),
    Employee.countDocuments(),
    Purchase.find({ date: { $gte: todayStart, $lte: todayEnd } }).select("quantity unitPrice").lean(),
    Expense.find({ date: { $gte: todayStart, $lte: todayEnd } }).select("amount").lean(),
  ]);

  const stockOnHand = products.reduce((s, p) => s + Math.max(p.currentStock, 0), 0);
  const inventoryValue = products.reduce((s, p) => s + p.currentStock * (p.wholesalePrice || 0), 0);
  const lowStockCount = products.filter((p) => p.currentStock > 0 && p.currentStock <= settings.lowStockThreshold).length;
  const outOfStockCount = products.filter((p) => p.currentStock <= 0).length;
  // Receivable (customers owe the shop) and payable (the shop owes someone)
  // are kept separate — netting them into one number would hide real money
  // the shop still needs to collect or pay out.
  const totalReceivable = dues.filter((d) => d.type !== "credit").reduce((s, d) => s + d.remainingDue, 0);
  const totalPayable = dues.filter((d) => d.type === "credit").reduce((s, d) => s + d.remainingDue, 0);

  res.json({
    success: true,
    data: {
      totalProducts: products.length,
      stockOnHand,
      inventoryValue,
      todaysPurchases: todaysPurchases.reduce((s, p) => s + p.quantity * p.unitPrice, 0),
      todaysExpenses: todaysExpenses.reduce((s, e) => s + e.amount, 0),
      totalReceivable,
      totalPayable,
      totalEmployees,
      lowStockCount,
      outOfStockCount,
      purchaseTrend: bucketByMonth(purchases, (p) => p.quantity * p.unitPrice),
      expenseTrend: bucketByMonth(expenses, (e) => e.amount),
      inventoryValueTrend: await getInventoryValueTrend(),
    },
  });
});
