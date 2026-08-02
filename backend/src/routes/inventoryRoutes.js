import { Router } from "express";
import { body } from "express-validator";
import { getStockOverview, listMovementHistory, createAdjustment } from "../controllers/inventoryController.js";
import { protect, authorize } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const router = Router();

router.get("/", protect, authorize("owner", "employee"), getStockOverview);
router.get("/movements", protect, authorize("owner", "employee"), listMovementHistory);
router.post(
  "/adjustments",
  protect,
  authorize("owner", "employee"),
  [
    body("product").isMongoId().withMessage("Choose a valid product."),
    body("quantityChange")
      .isInt()
      .custom((v) => Number(v) !== 0)
      .withMessage("Enter a non-zero quantity change."),
    body("reason").trim().notEmpty().withMessage("Explain the adjustment for the audit trail."),
  ],
  validate,
  createAdjustment
);

export default router;
