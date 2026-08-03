import { Router } from "express";
import { body } from "express-validator";
import {
  listEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  listEmployeeTransactions,
  createEmployeeTransaction,
} from "../controllers/employeeController.js";
import { protect, authorize } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const router = Router();

const employeeRules = [
  body("name").trim().notEmpty().withMessage("Name is required."),
  body("email").optional({ values: "falsy" }).isEmail().withMessage("Enter a valid email."),
  body("position").trim().notEmpty().withMessage("Position is required."),
  body("monthlySalary").isFloat({ min: 0 }).withMessage("Enter a monthly salary."),
];

router.get("/", protect, authorize("owner"), listEmployees);
router.post("/", protect, authorize("owner"), employeeRules, validate, createEmployee);
router.patch("/:id", protect, authorize("owner"), employeeRules, validate, updateEmployee);
router.delete("/:id", protect, authorize("owner"), deleteEmployee);

router.get("/transactions/all", protect, authorize("owner"), listEmployeeTransactions);
router.post(
  "/transactions",
  protect,
  authorize("owner"),
  [
    body("employee").isMongoId().withMessage("Choose a valid employee."),
    body("type").isIn(["Advance", "Payout", "Other"]).withMessage("Choose a valid transaction type."),
    body("amount").isFloat({ min: 0.01 }).withMessage("Enter an amount greater than zero."),
  ],
  validate,
  createEmployeeTransaction
);

export default router;
