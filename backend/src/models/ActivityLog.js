import mongoose from "mongoose";

const activityLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    userName: { type: String, required: true },
    action: { type: String, required: true },
    target: { type: String, trim: true },
    date: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

activityLogSchema.index({ date: -1 });

export const ActivityLog = mongoose.model("ActivityLog", activityLogSchema);
