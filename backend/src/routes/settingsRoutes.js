import { Router } from "express";
import { body } from "express-validator";
import { getSettings, updateSettings } from "../controllers/settingsController.js";
import { protect, authorize } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const router = Router();

router.get("/", protect, getSettings);
router.patch(
  "/",
  protect,
  authorize("owner"),
  [body("lowStockThreshold").optional().isInt({ min: 0 }).withMessage("Threshold can't be negative.")],
  validate,
  updateSettings
);

export default router;
