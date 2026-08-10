// One-off migration: the "shop" field is new on Product and Sale and
// required going forward, but existing rows predate it. Everything that
// existed before this feature shipped is assumed to belong to Shop 1 (the
// original, pre-multi-shop location). Run once via `npm run migrate:shop`
// in backend/ — safe to re-run, it only touches rows still missing the field.
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import { Product } from "../models/Product.js";
import { Sale } from "../models/Sale.js";

async function run() {
  await connectDB();

  const productResult = await Product.updateMany({ shop: { $exists: false } }, { $set: { shop: "Shop 1" } });
  console.log(`Migrated ${productResult.modifiedCount} product(s) to Shop 1.`);

  const saleResult = await Sale.updateMany({ shop: { $exists: false } }, { $set: { shop: "Shop 1" } });
  console.log(`Migrated ${saleResult.modifiedCount} sale(s) to Shop 1.`);

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
