import mongoose from "mongoose";

const employeeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    position: { type: String, required: true, trim: true },
    monthlySalary: { type: Number, required: true, min: 0 },
    joinDate: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true }
);

export const Employee = mongoose.model("Employee", employeeSchema);
