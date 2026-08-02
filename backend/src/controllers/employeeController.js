import asyncHandler from "express-async-handler";
import { Employee } from "../models/Employee.js";
import { EmployeeTransaction } from "../models/EmployeeTransaction.js";
import { ApiError } from "../utils/ApiError.js";
import { logActivity } from "../utils/logActivity.js";

// Each calendar month resets to a fresh monthlySalary allotment — unused salary
// isn't held as future credit, since it's simply paid out as normal wages. But
// if advances/loans taken in a month exceed that month's salary, the shortfall
// carries over and is deducted from the following month's allotment (and the
// one after that, and so on) until it's paid off.
function computeRemainingSalary(monthlySalary, joinDate, now, monthlyTakenByKey) {
  let balance = 0;
  let year = joinDate.getFullYear();
  let month = joinDate.getMonth() + 1;
  const endYear = now.getFullYear();
  const endMonth = now.getMonth() + 1;

  while (year < endYear || (year === endYear && month <= endMonth)) {
    const taken = monthlyTakenByKey.get(`${year}-${month}`) ?? 0;
    balance = Math.min(balance, 0) + monthlySalary - taken;
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }

  return balance;
}

export const listEmployees = asyncHandler(async (req, res) => {
  const employees = await Employee.find().sort({ name: 1 });

  const monthlyTotals = await EmployeeTransaction.aggregate([
    {
      $group: {
        _id: { employee: "$employee", year: { $year: "$date" }, month: { $month: "$date" } },
        amount: { $sum: "$amount" },
      },
    },
  ]);

  const takenByEmployee = new Map();
  for (const t of monthlyTotals) {
    const key = String(t._id.employee);
    if (!takenByEmployee.has(key)) takenByEmployee.set(key, new Map());
    takenByEmployee.get(key).set(`${t._id.year}-${t._id.month}`, t.amount);
  }

  const now = new Date();
  const currentKey = `${now.getFullYear()}-${now.getMonth() + 1}`;

  const rows = employees.map((e) => {
    const monthlyTaken = takenByEmployee.get(String(e._id)) ?? new Map();
    const totalAdvance = monthlyTaken.get(currentKey) ?? 0;
    const remainingSalary = computeRemainingSalary(e.monthlySalary, e.joinDate, now, monthlyTaken);
    return { ...e.toObject(), totalAdvance, remainingSalary };
  });

  res.json({ success: true, data: rows });
});

export const createEmployee = asyncHandler(async (req, res) => {
  const employee = await Employee.create(req.body);
  await logActivity({ user: req.user, action: "Added employee", target: employee.name });
  res.status(201).json({ success: true, data: employee });
});

export const updateEmployee = asyncHandler(async (req, res) => {
  const employee = await Employee.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!employee) throw new ApiError(404, "Employee not found.");
  await logActivity({ user: req.user, action: "Updated employee", target: employee.name });
  res.json({ success: true, data: employee });
});

// Deleting is never blocked, even with transaction history or a remaining
// balance — any transactions tied to this employee are removed along with
// them so nothing is left pointing at an employee who no longer exists.
export const deleteEmployee = asyncHandler(async (req, res) => {
  const employee = await Employee.findById(req.params.id);
  if (!employee) throw new ApiError(404, "Employee not found.");

  await EmployeeTransaction.deleteMany({ employee: employee._id });
  await employee.deleteOne();
  await logActivity({ user: req.user, action: "Deleted employee", target: employee.name });
  res.json({ success: true, message: "Employee deleted." });
});

export const listEmployeeTransactions = asyncHandler(async (req, res) => {
  const { employee, page = 1, limit = 15 } = req.query;
  const filter = {};
  if (employee) filter.employee = employee;

  const pageNum = Math.max(Number(page) || 1, 1);
  const limitNum = Math.min(Math.max(Number(limit) || 15, 1), 100);

  const [items, total] = await Promise.all([
    EmployeeTransaction.find(filter)
      .populate({ path: "employee", select: "name" })
      .sort({ date: -1, createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    EmployeeTransaction.countDocuments(filter),
  ]);

  res.json({ success: true, data: items, meta: { total, page: pageNum, pages: Math.ceil(total / limitNum) || 1 } });
});

export const createEmployeeTransaction = asyncHandler(async (req, res) => {
  const { employee: employeeId, type, amount, notes, date } = req.body;

  const employee = await Employee.findById(employeeId);
  if (!employee) throw new ApiError(404, "Employee not found.");

  const transaction = await EmployeeTransaction.create({
    employee: employeeId,
    type,
    amount,
    notes,
    date: date || Date.now(),
    createdBy: req.user._id,
  });

  await logActivity({ user: req.user, action: "Recorded employee transaction", target: `${employee.name} — ${type} ${amount}` });

  const populated = await transaction.populate({ path: "employee", select: "name" });
  res.status(201).json({ success: true, data: populated });
});
