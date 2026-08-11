// One-off migration: "type" is new on CustomerDue and defaults to "due" for
// documents created going forward. Existing rows predate the credit system
// entirely, so they're all genuine receivables (customer owes the shop).
// This backfill matters for .lean() reads (dashboard/report aggregation),
// which don't get schema defaults applied the way hydrated documents do.
// Run once via `npm run migrate:due-type` in backend/ — safe to re-run.
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import { CustomerDue } from "../models/CustomerDue.js";

async function run() {
  await connectDB();

  const result = await CustomerDue.updateMany({ type: { $exists: false } }, { $set: { type: "due" } });
  console.log(`Migrated ${result.modifiedCount} customer due(s) to type "due".`);

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
