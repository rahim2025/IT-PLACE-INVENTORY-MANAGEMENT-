import { Router } from "express";
import { body } from "express-validator";
import { listBrands, createBrand, updateBrand, deleteBrand } from "../controllers/brandController.js";
import { protect, authorize } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const router = Router();

const nameRule = [body("name").trim().notEmpty().withMessage("Brand name is required.")];

router.get("/", protect, authorize("owner", "employee"), listBrands);
// Employees create brands on the fly when adding a product — editing/deleting stays owner-only.
router.post("/", protect, authorize("owner", "employee"), nameRule, validate, createBrand);
router.patch("/:id", protect, authorize("owner"), nameRule, validate, updateBrand);
router.delete("/:id", protect, authorize("owner"), deleteBrand);

export default router;
