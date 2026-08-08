import { Router } from "express";
import { body } from "express-validator";
import { listPurchases, createPurchase } from "../controllers/purchaseController.js";
import { protect, authorize } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const router = Router();

router.get("/", protect, authorize("owner", "employee"), listPurchases);
router.post(
  "/",
  protect,
  authorize("owner", "employee"),
  [
    body("product").isMongoId().withMessage("Choose a valid product."),
    body("quantity").isInt({ min: 1 }).withMessage("Quantity must be at least 1."),
    body("unitPrice").optional({ values: "falsy" }).isFloat({ min: 0 }).withMessage("Wholesale price can't be negative."),
    body("supplier").optional({ values: "falsy" }).isMongoId().withMessage("Choose a valid supplier."),
    body("date").optional().isISO8601().withMessage("Enter a valid date."),
  ],
  validate,
  createPurchase
);

export default router;
