import mongoose from "mongoose";

const settingsSchema = new mongoose.Schema(
  {
    shopName: { type: String, default: "IT Place" },
    address: { type: String, default: "" },
    supportEmail: { type: String, default: "" },
    lowStockThreshold: { type: Number, default: 10, min: 0 },
  },
  { timestamps: true }
);

// Singleton accessor — this app has exactly one settings document.
settingsSchema.statics.getSingleton = async function getSingleton() {
  let settings = await this.findOne();
  if (!settings) settings = await this.create({});
  return settings;
};

export const Settings = mongoose.model("Settings", settingsSchema);
