// Wipes and repopulates the database with a realistic IT-shop dataset —
// mirrors the fixtures used by the frontend prototype so both sides tell the
// same story once they're wired together. Safe to re-run: it clears first.
import { connectDB } from "../src/config/db.js";
import { env } from "../src/config/env.js";
import mongoose from "mongoose";

import { User } from "../src/models/User.js";
import { Category } from "../src/models/Category.js";
import { Brand } from "../src/models/Brand.js";
import { Supplier } from "../src/models/Supplier.js";
import { Product } from "../src/models/Product.js";
import { Purchase } from "../src/models/Purchase.js";
import { InventoryLog } from "../src/models/InventoryLog.js";
import { Employee } from "../src/models/Employee.js";
import { EmployeeTransaction } from "../src/models/EmployeeTransaction.js";
import { Expense } from "../src/models/Expense.js";
import { Customer } from "../src/models/Customer.js";
import { CustomerDue } from "../src/models/CustomerDue.js";
import { DuePayment } from "../src/models/DuePayment.js";
import { ActivityLog } from "../src/models/ActivityLog.js";
import { Settings } from "../src/models/Settings.js";
import { weightedAverage } from "../src/utils/weightedAverage.js";

const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

async function destroyAll() {
  const models = [
    User,
    Category,
    Brand,
    Supplier,
    Product,
    Purchase,
    InventoryLog,
    Employee,
    EmployeeTransaction,
    Expense,
    Customer,
    CustomerDue,
    DuePayment,
    ActivityLog,
    Settings,
  ];
  await Promise.all(models.map((m) => m.deleteMany({})));
  console.log("Cleared all collections.");
}

// Records a purchase the same way the API does: create the Purchase doc,
// recompute the product's weighted-average cost from its history (only since
// its last stockout, if any), bump stock, and leave an InventoryLog entry.
async function recordPurchase({ product, quantity, unitPrice, supplier, date, notes, user }) {
  const purchase = await Purchase.create({ product: product._id, quantity, unitPrice, supplier, date, notes, createdBy: user._id });
  const historyFilter = { product: product._id };
  if (product.stockResetAt) historyFilter.createdAt = { $gte: product.stockResetAt };
  const history = await Purchase.find(historyFilter).select("quantity unitPrice");
  product.avgBuyingPrice = weightedAverage(history);
  product.currentStock += quantity;
  await product.save();
  await InventoryLog.create({
    product: product._id,
    type: "Purchase",
    quantityChange: quantity,
    resultingStock: product.currentStock,
    reference: purchase._id,
    user: user._id,
    date,
  });
  return purchase;
}

async function recordAdjustment({ product, quantityChange, reason, date, user }) {
  product.currentStock += quantityChange;
  await product.save();
  await InventoryLog.create({
    product: product._id,
    type: "Manual Adjustment",
    quantityChange,
    resultingStock: product.currentStock,
    reason,
    user: user._id,
    date,
  });
}

async function seed() {
  await connectDB();
  await destroyAll();

  const owner = await User.create({
    name: env.seedOwner.name,
    email: env.seedOwner.email,
    password: env.seedOwner.password,
    role: "owner",
  });
  const employeeUser = await User.create({
    name: "Rafael Costa",
    email: "rafael.costa@itplace.shop",
    password: "Employee123!",
    role: "employee",
  });

  const settings = await Settings.getSingleton();
  settings.shopName = "IT Place";
  settings.address = "12 Fenwick Street, Newark, NJ";
  settings.supportEmail = owner.email;
  settings.lowStockThreshold = 10;
  await settings.save();

  const categoryNames = ["Laptops", "Desktops", "Motherboards", "Processors", "Memory (RAM)", "Storage", "Graphics Cards", "Networking"];
  const categories = Object.fromEntries(
    await Promise.all(categoryNames.map(async (name) => [name, await Category.create({ name })]))
  );

  const brandNames = ["Dell", "HP", "Lenovo", "Asus", "MSI", "Gigabyte", "Corsair", "Kingston", "Samsung", "Intel", "AMD", "NVIDIA", "TP-Link"];
  const brands = Object.fromEntries(await Promise.all(brandNames.map(async (name) => [name, await Brand.create({ name })])));

  const suppliers = {
    continental: await Supplier.create({
      name: "Continental IT Distributors",
      contactPerson: "Farah Idris",
      phone: "+1 (212) 555-0148",
      email: "sales@continental-it.com",
      address: "4 Harbor Freight Rd, Newark, NJ",
    }),
    summit: await Supplier.create({
      name: "Summit Component Wholesale",
      contactPerson: "Marcus Tan",
      phone: "+1 (415) 555-0192",
      email: "orders@summitcomp.com",
      address: "88 Bay Ridge Ave, Oakland, CA",
    }),
    redline: await Supplier.create({
      name: "Redline Hardware Supply",
      contactPerson: "Priya Nair",
      phone: "+1 (312) 555-0173",
      email: "priya@redlinehw.com",
      address: "220 Industrial Loop, Chicago, IL",
    }),
  };

  const productSeeds = [
    { name: "ThinkPad E14 Gen 5", brand: "Lenovo", category: "Laptops", sellingPrice: 899, supplier: "continental" },
    { name: "Pavilion 15 Laptop", brand: "HP", category: "Laptops", sellingPrice: 649, supplier: "continental" },
    { name: "ROG Strix G16", brand: "Asus", category: "Laptops", sellingPrice: 1499, supplier: "summit" },
    { name: "OptiPlex 7020 SFF", brand: "Dell", category: "Desktops", sellingPrice: 779, supplier: "continental" },
    { name: "B650 AORUS Elite AX", brand: "Gigabyte", category: "Motherboards", sellingPrice: 189, supplier: "redline" },
    { name: "PRO B760M-A WIFI", brand: "MSI", category: "Motherboards", sellingPrice: 139, supplier: "redline" },
    { name: "Core i5-14400F", brand: "Intel", category: "Processors", sellingPrice: 219, supplier: "summit" },
    { name: "Ryzen 5 7600", brand: "AMD", category: "Processors", sellingPrice: 229, supplier: "summit" },
    { name: "Vengeance DDR5 32GB Kit", brand: "Corsair", category: "Memory (RAM)", sellingPrice: 109, supplier: "summit" },
    { name: "Fury Beast DDR4 16GB Kit", brand: "Kingston", category: "Memory (RAM)", sellingPrice: 49, supplier: "summit" },
    { name: "990 PRO 1TB NVMe SSD", brand: "Samsung", category: "Storage", sellingPrice: 89, supplier: "continental" },
    { name: "GeForce RTX 4060", brand: "NVIDIA", category: "Graphics Cards", sellingPrice: 329, supplier: "summit" },
    { name: "Archer AX55 Router", brand: "TP-Link", category: "Networking", sellingPrice: 89, supplier: "continental" },
  ];

  const products = {};
  for (const p of productSeeds) {
    products[p.name] = await Product.create({
      name: p.name,
      brand: brands[p.brand]._id,
      category: categories[p.category]._id,
      sellingPrice: p.sellingPrice,
      supplier: suppliers[p.supplier]._id,
      description: `${p.brand} ${p.name}`,
      createdBy: owner._id,
    });
  }

  // Two purchases per product at different prices, so the weighted-average
  // cost is a real calculation, not a stored constant.
  for (const p of productSeeds) {
    const product = products[p.name];
    const basePrice = p.sellingPrice * 0.68;
    await recordPurchase({
      product,
      quantity: 10,
      unitPrice: Math.round(basePrice),
      supplier: suppliers[p.supplier]._id,
      date: daysAgo(60),
      notes: "Initial stock-in.",
      user: owner,
    });
    await recordPurchase({
      product,
      quantity: 6,
      unitPrice: Math.round(basePrice * 1.05),
      supplier: suppliers[p.supplier]._id,
      date: daysAgo(20),
      notes: "Restock.",
      user: owner,
    });
  }

  // Push a few products into low/out-of-stock territory so the dashboard has something to flag.
  await recordAdjustment({ product: products["ROG Strix G16"], quantityChange: -11, reason: "Sold through, pending restock.", date: daysAgo(10), user: owner });
  await recordAdjustment({ product: products["GeForce RTX 4060"], quantityChange: -16, reason: "Sold through.", date: daysAgo(8), user: owner });
  await recordAdjustment({ product: products["Archer AX55 Router"], quantityChange: -3, reason: "Recount correction — damaged units.", date: daysAgo(5), user: owner });

  const employees = {};
  const employeeSeeds = [
    { name: "Sana Iqbal", email: "sana.iqbal@itplace.shop", position: "Senior Technician", monthlySalary: 2600 },
    { name: "Rafael Costa", email: "rafael.costa@itplace.shop", position: "Sales Associate", monthlySalary: 2100 },
    { name: "Grace Muthoni", email: "grace.muthoni@itplace.shop", position: "Inventory Clerk", monthlySalary: 1950 },
  ];
  for (const e of employeeSeeds) {
    employees[e.name] = await Employee.create({ ...e, joinDate: daysAgo(200) });
  }

  await EmployeeTransaction.create({ employee: employees["Sana Iqbal"]._id, type: "Advance", amount: 300, date: daysAgo(15), notes: "Against this month's salary." });
  await EmployeeTransaction.create({ employee: employees["Rafael Costa"]._id, type: "Other", amount: 500, date: daysAgo(40), notes: "Repay over 3 months." });
  await EmployeeTransaction.create({ employee: employees["Grace Muthoni"]._id, type: "Advance", amount: 150, date: daysAgo(3), notes: "" });

  const expenseSeeds = [
    { category: "Rent", amount: 1400, description: "Shopfront monthly rent.", date: daysAgo(29) },
    { category: "Internet", amount: 89, description: "Fiber line, 500Mbps plan.", date: daysAgo(29) },
    { category: "Electricity", amount: 240, description: "Monthly utility bill.", date: daysAgo(27) },
    { category: "Transport", amount: 65, description: "Courier pickup for supplier delivery.", date: daysAgo(24), employee: employees["Grace Muthoni"]._id },
    { category: "Maintenance", amount: 130, description: "AC servicing.", date: daysAgo(18) },
    { category: "Miscellaneous", amount: 24, description: "Cleaning supplies.", date: daysAgo(0) },
  ];
  for (const e of expenseSeeds) {
    await Expense.create({ ...e, createdBy: owner._id });
  }

  const customerSeeds = [
    { name: "Marcus Webb", email: "marcus.webb@example.com", address: "12 Fenwick St, Newark, NJ" },
    { name: "Elena Vasquez", email: "elena.vasquez@example.com", address: "88 Cortlandt Ave, Newark, NJ" },
    { name: "David Kim", email: "david.kim@example.com", address: "301 Ridge Rd, Elizabeth, NJ" },
    { name: "Fatima Rahman", email: "fatima.rahman@example.com", address: "47 Millbrook Ln, Union, NJ" },
  ];
  const customers = {};
  for (const c of customerSeeds) {
    customers[c.name] = await Customer.create(c);
  }

  async function createDue({ customerName, productName, dueAmount, date, notes = "" }) {
    const due = await CustomerDue.create({
      customer: customers[customerName]._id,
      product: productName ? products[productName]._id : undefined,
      dueAmount,
      date,
      notes,
      createdBy: owner._id,
    });
    return due;
  }

  const due1 = await createDue({
    customerName: "Marcus Webb",
    productName: "ThinkPad E14 Gen 5",
    dueAmount: 899,
    date: daysAgo(26),
    notes: "Repeat customer, approved by owner.",
  });
  await DuePayment.create({ due: due1._id, amount: 400, date: daysAgo(10), notes: "Partial, cash." });
  due1.paidAmount = 400;
  await due1.save();

  const due2 = await createDue({
    customerName: "Elena Vasquez",
    productName: "990 PRO 1TB NVMe SSD",
    dueAmount: 178,
    date: daysAgo(20),
  });
  await DuePayment.create({ due: due2._id, amount: due2.dueAmount, date: daysAgo(8), notes: "Paid in full." });
  due2.paidAmount = due2.dueAmount;
  await due2.save();

  await createDue({ customerName: "David Kim", productName: "GeForce RTX 4060", dueAmount: 329, date: daysAgo(14) });
  await createDue({
    customerName: "Fatima Rahman",
    dueAmount: 248,
    date: daysAgo(6),
    notes: "Vengeance DDR5 32GB Kit + PRO B760M-A WIFI — small business owner, pays monthly.",
  });

  await ActivityLog.create({ user: owner._id, userName: owner.name, action: "Seeded database", target: "Initial demo dataset" });

  console.log("\nSeed complete.");
  console.log("-----------------------------------------");
  console.log(`Owner login:    ${owner.email} / ${env.seedOwner.password}`);
  console.log(`Employee login: ${employeeUser.email} / Employee123!`);
  console.log("-----------------------------------------\n");
}

seed()
  .then(() => mongoose.disconnect())
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
