import asyncHandler from "express-async-handler";
import { Purchase } from "../models/Purchase.js";
import { Sale } from "../models/Sale.js";
import { Expense } from "../models/Expense.js";
import { EmployeeTransaction } from "../models/EmployeeTransaction.js";
import { BrokerTransaction } from "../models/BrokerTransaction.js";
import { DuePayment } from "../models/DuePayment.js";
import { Product } from "../models/Product.js";
import { Settings } from "../models/Settings.js";
import { ApiError } from "../utils/ApiError.js";

function getRange(period, refDate = new Date()) {
  const ref = new Date(refDate);
  let start;
  if (period === "daily") start = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  else if (period === "weekly") start = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() - 6);
  else if (period === "monthly") start = new Date(ref.getFullYear(), ref.getMonth(), 1);
  else if (period === "yearly") start = new Date(ref.getFullYear(), 0, 1);
  else throw new ApiError(400, "Period must be daily, weekly, monthly, or yearly.");

  const end = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate(), 23, 59, 59, 999);
  return { start, end };
}

export const getReport = asyncHandler(async (req, res) => {
  const period = req.query.period ?? "monthly";
  const { start, end } = getRange(period);
  const range = { $gte: start, $lte: end };

  const [purchases, expenses, employeeTx, brokerPayments, duePayments] = await Promise.all([
    Purchase.find({ date: range }).populate({ path: "product", select: "name" }).lean(),
    Expense.find({ date: range }).lean(),
    EmployeeTransaction.find({ date: range }).populate({ path: "employee", select: "name" }).lean(),
    // "Payment" only — mirrors getInvoice: a "Credit" just records an accrued
    // liability, no money has moved yet, so it shouldn't count as a cost here.
    BrokerTransaction.find({ date: range, type: "Payment" }).populate({ path: "broker", select: "name" }).lean(),
    DuePayment.find({ date: range }).populate({ path: "due", select: "type" }).lean(),
  ]);

  // A payment against a "due" is money collected from a customer (revenue).
  // A payment against a "credit" is the shop paying someone back (a cost) —
  // these must never be lumped into the same "collected" figure.
  const dueCollections = duePayments.filter((p) => p.due?.type !== "credit");
  const creditRepayments = duePayments.filter((p) => p.due?.type === "credit");

  const ledger = [
    ...purchases.map((p) => ({
      id: `purchase-${p._id}`,
      type: "Purchase",
      detail: `${p.product?.name ?? "Product"} × ${p.quantity}`,
      amount: p.quantity * p.unitPrice,
      date: p.date,
    })),
    ...expenses.map((e) => ({
      id: `expense-${e._id}`,
      type: "Expense",
      detail: `${e.category} — ${e.description}`,
      amount: e.amount,
      date: e.date,
    })),
    ...employeeTx.map((t) => ({
      id: `emptx-${t._id}`,
      type: "Employee payment",
      detail: `${t.type}${t.employee?.name ? ` — ${t.employee.name}` : ""}`,
      amount: t.amount,
      date: t.date,
    })),
    ...brokerPayments.map((t) => ({
      id: `brokertx-${t._id}`,
      type: "Broker payout",
      detail: `${t.broker?.name ?? "Broker"}${t.notes ? ` — ${t.notes}` : ""}`,
      amount: t.amount,
      date: t.date,
    })),
    ...dueCollections.map((p) => ({
      id: `duepay-${p._id}`,
      type: "Due collection",
      detail: p.notes || "Customer payment",
      amount: p.amount,
      date: p.date,
    })),
    ...creditRepayments.map((p) => ({
      id: `creditpay-${p._id}`,
      type: "Credit repayment",
      detail: p.notes || "Repaid to customer/supplier",
      amount: p.amount,
      date: p.date,
    })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  const stockAdded = purchases.reduce((s, p) => s + p.quantity, 0);
  const products = await Product.find().select("currentStock wholesalePrice").lean();
  const inventoryValue = products.reduce((s, p) => s + p.currentStock * (p.wholesalePrice || 0), 0);

  res.json({
    success: true,
    data: {
      period,
      range: { start, end },
      ledger,
      totals: {
        purchases: purchases.reduce((s, p) => s + p.quantity * p.unitPrice, 0),
        stockAdded,
        expenses: expenses.reduce((s, e) => s + e.amount, 0),
        employeePayments: employeeTx.reduce((s, t) => s + t.amount, 0),
        brokerPayments: brokerPayments.reduce((s, t) => s + t.amount, 0),
        dueCollected: dueCollections.reduce((s, p) => s + p.amount, 0),
        creditRepaid: creditRepayments.reduce((s, p) => s + p.amount, 0),
        inventoryValue,
      },
    },
  });
});

function getInvoiceRange(mode, dateStr) {
  const ref = dateStr ? new Date(dateStr) : new Date();
  if (Number.isNaN(ref.getTime())) throw new ApiError(400, "Enter a valid date.");

  if (mode === "today") {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }
  if (mode === "month") {
    const start = new Date(ref.getFullYear(), ref.getMonth(), 1);
    const end = new Date(ref.getFullYear(), ref.getMonth() + 1, 0, 23, 59, 59, 999);
    return { start, end };
  }
  if (mode === "date") {
    if (!dateStr) throw new ApiError(400, "Choose a date.");
    const start = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
    const end = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate(), 23, 59, 59, 999);
    return { start, end };
  }
  throw new ApiError(400, "Mode must be today, month, or date.");
}

// Broker cost only counts "Payment" transactions (cash actually paid out) —
// "Credit" just records an accrued liability, no money has moved yet. This
// keeps every cost section on the same cash-basis footing as Expenses.
export const getInvoice = asyncHandler(async (req, res) => {
  const { mode = "today", date, shop } = req.query;
  const { start, end } = getInvoiceRange(mode, date);
  const range = { $gte: start, $lte: end };

  // Only sales carry a shop — employee/broker/expense costs are whole-business,
  // so they're never filtered here even when a specific shop is requested.
  const saleFilter = shop ? { date: range, shop } : { date: range };

  const [settings, sales, employeeTx, brokerPayments, expenses, duePayments] = await Promise.all([
    Settings.getSingleton(),
    Sale.find(saleFilter).populate({ path: "items.product", select: "name" }).lean(),
    EmployeeTransaction.find({ date: range }).populate({ path: "employee", select: "name" }).lean(),
    BrokerTransaction.find({ date: range, type: "Payment" }).populate({ path: "broker", select: "name" }).lean(),
    Expense.find({ date: range }).lean(),
    DuePayment.find({ date: range })
      .populate({ path: "due", select: "type customer", populate: { path: "customer", select: "name" } })
      .lean(),
  ]);

  // Same due/credit split as getReport: a payment against a "due" is money
  // collected from a customer (revenue); a payment against a "credit" is the
  // shop paying someone back (a cost) — never the same bucket.
  const dueCollectionItems = duePayments
    .filter((p) => p.due?.type !== "credit")
    .map((p) => ({ date: p.date, customer: p.due?.customer?.name ?? "Unknown customer", amount: p.amount, notes: p.notes || "" }));
  const creditRepaymentItems = duePayments
    .filter((p) => p.due?.type === "credit")
    .map((p) => ({ date: p.date, customer: p.due?.customer?.name ?? "Unknown customer", amount: p.amount, notes: p.notes || "" }));

  const saleItems = sales.flatMap((s) =>
    s.items.map((it) => ({
      date: s.date,
      product: it.product?.name ?? "Unknown product",
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      lineTotal: it.quantity * it.unitPrice,
    }))
  );
  const employeeItems = employeeTx.map((t) => ({
    date: t.date,
    employee: t.employee?.name ?? "Unknown employee",
    type: t.type,
    amount: t.amount,
    notes: t.notes || "",
  }));
  const brokerItems = brokerPayments.map((t) => ({
    date: t.date,
    broker: t.broker?.name ?? "Unknown broker",
    amount: t.amount,
    notes: t.notes || "",
  }));
  const expenseItems = expenses.map((e) => ({
    date: e.date,
    category: e.category,
    description: e.description,
    amount: e.amount,
  }));

  res.json({
    success: true,
    data: {
      company: { name: settings.shopName, address: settings.address, supportEmail: settings.supportEmail },
      range: { start, end },
      shop: shop || "All shops",
      sales: {
        count: sales.length,
        quantity: saleItems.reduce((s, i) => s + i.quantity, 0),
        total: saleItems.reduce((s, i) => s + i.lineTotal, 0),
        items: saleItems,
      },
      employeeCost: {
        count: employeeItems.length,
        total: employeeItems.reduce((s, i) => s + i.amount, 0),
        items: employeeItems,
      },
      brokerCost: {
        count: brokerItems.length,
        total: brokerItems.reduce((s, i) => s + i.amount, 0),
        items: brokerItems,
      },
      expenses: {
        count: expenseItems.length,
        total: expenseItems.reduce((s, i) => s + i.amount, 0),
        items: expenseItems,
      },
      dueCollections: {
        count: dueCollectionItems.length,
        total: dueCollectionItems.reduce((s, i) => s + i.amount, 0),
        items: dueCollectionItems,
      },
      creditRepayments: {
        count: creditRepaymentItems.length,
        total: creditRepaymentItems.reduce((s, i) => s + i.amount, 0),
        items: creditRepaymentItems,
      },
    },
  });
});
