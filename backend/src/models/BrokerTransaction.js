import mongoose from "mongoose";

const brokerTransactionSchema = new mongoose.Schema(
  {
    broker: { type: mongoose.Schema.Types.ObjectId, ref: "Broker", required: true },
    // Credit = commission owed to the broker (increases their balance).
    // Payment = money actually paid out to them (decreases their balance).
    type: { type: String, enum: ["Credit", "Payment"], required: true },
    amount: { type: Number, required: true, min: 0.01 },
    date: { type: Date, required: true, default: Date.now },
    notes: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

brokerTransactionSchema.index({ broker: 1, date: -1 });

export const BrokerTransaction = mongoose.model("BrokerTransaction", brokerTransactionSchema);
