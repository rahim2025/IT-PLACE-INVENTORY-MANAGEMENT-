import { Router } from "express";
import { body } from "express-validator";
import { listExpenses, createExpense } from "../controllers/expenseController.js";
import { protect, authorize } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const router = Router();

router.get("/", protect, authorize("owner"), listExpenses);
router.post(
  "/",
  protect,
  authorize("owner"),
  [
    body("category").trim().notEmpty().withMessage("Enter a category."),
    body("amount").isFloat({ min: 0.01 }).withMessage("Enter an amount greater than zero."),
    body("description").trim().notEmpty().withMessage("Add a short description."),
    body("employee").optional({ values: "falsy" }).isMongoId().withMessage("Choose a valid employee."),
  ],
  validate,
  createExpense
);

export default router;
