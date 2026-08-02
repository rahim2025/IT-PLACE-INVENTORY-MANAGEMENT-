import asyncHandler from "express-async-handler";
import { Employee } from "../models/Employee.js";
import { EmployeeTransaction } from "../models/EmployeeTransaction.js";
import { ApiError } from "../utils/ApiError.js";
import { logActivity } from "../utils/logActivity.js";

// Salary accrues every calendar month since the employee joined and never
// silently resets — nothing is assumed "paid via normal wages" unless the
// owner actually records it (Advance, Payout, or Other). So remaining salary
// is simply: (months employed × monthlySalary) − (everything ever paid).
// Recording a Payout is what brings it back down, not the calendar.
function monthsEmployed(joinDate, now) {
  const months = (now.getFullYear() - joinDate.getFullYear()) * 12 + (now.getMonth() - joinDate.getMonth()) + 1;
  return Math.max(months, 0);
}

async function getRemainingSalary(employee) {
  const [totals] = await EmployeeTransaction.aggregate([
    { $match: { employee: employee._id } },
    { $group: { _id: null, amount: { $sum: "$amount" } } },
  ]);
  const totalPaid = totals?.amount ?? 0;
  return monthsEmployed(employee.joinDate, new Date()) * employee.monthlySalary - totalPaid;
}

export const listEmployees = asyncHandler(async (req, res) => {
  const employees = await Employee.find().sort({ name: 1 });

  const [lifetimeTotals, monthlyTotals] = await Promise.all([
    EmployeeTransaction.aggregate([{ $group: { _id: "$employee", amount: { $sum: "$amount" } } }]),
    EmployeeTransaction.aggregate([
      {
        $group: {
          _id: { employee: "$employee", year: { $year: "$date" }, month: { $month: "$date" } },
          amount: { $sum: "$amount" },
        },
      },
    ]),
  ]);

  const totalPaidByEmployee = new Map(lifetimeTotals.map((t) => [String(t._id), t.amount]));

  const now = new Date();
  const currentKey = `${now.getFullYear()}-${now.getMonth() + 1}`;
  const paidThisMonthByEmployee = new Map();
  for (const t of monthlyTotals) {
    if (`${t._id.year}-${t._id.month}` === currentKey) {
      paidThisMonthByEmployee.set(String(t._id.employee), t.amount);
    }
  }

  const rows = employees.map((e) => {
    const totalAdvance = paidThisMonthByEmployee.get(String(e._id)) ?? 0;
    const totalPaid = totalPaidByEmployee.get(String(e._id)) ?? 0;
    const remainingSalary = monthsEmployed(e.joinDate, now) * e.monthlySalary - totalPaid;
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

  // A Payout settles what's owed — it can't be used once the balance is
  // already zero or negative (over-advanced), and can't exceed what's owed
  // either. Advances/Other stay uncapped, since going negative there is the
  // whole point: it's recovered from next month's accruing salary.
  if (type === "Payout") {
    const remainingSalary = await getRemainingSalary(employee);
    if (remainingSalary <= 0) {
      throw new ApiError(
        400,
        `${employee.name} has no balance owed right now — record an Advance instead if you're paying them ahead of next month's salary.`
      );
    }
    if (amount > remainingSalary) {
      throw new ApiError(400, `Payout can't exceed the $${remainingSalary.toFixed(2)} owed to ${employee.name}.`);
    }
  }

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
