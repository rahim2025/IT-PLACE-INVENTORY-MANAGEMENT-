import { Router } from "express";
import { body } from "express-validator";
import { listSales, createSale } from "../controllers/saleController.js";
import { protect, authorize } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { SHOPS } from "../constants/shops.js";

const router = Router();

router.get("/", protect, authorize("owner", "employee"), listSales);
router.post(
  "/",
  protect,
  authorize("owner", "employee"),
  [
    body("shop").isIn(SHOPS).withMessage(`Choose one of: ${SHOPS.join(", ")}.`),
    body("items").isArray({ min: 1 }).withMessage("Add at least one product."),
    body("items.*.product").isMongoId().withMessage("Choose a valid product for each item."),
    body("items.*.quantity").isInt({ min: 1 }).withMessage("Quantity must be at least 1."),
    body("items.*.unitPrice").isFloat({ min: 0 }).withMessage("Enter a unit price for each item."),
    body("date").optional().isISO8601().withMessage("Enter a valid date."),
  ],
  validate,
  createSale
);

export default router;
