import { Router } from "express";
import { body } from "express-validator";
import { listCategories, createCategory, updateCategory, deleteCategory } from "../controllers/categoryController.js";
import { protect, authorize } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const router = Router();

const nameRule = [body("name").trim().notEmpty().withMessage("Category name is required.")];

router.get("/", protect, authorize("owner", "employee"), listCategories);
// Employees create categories on the fly when adding a product — editing/deleting stays owner-only.
router.post("/", protect, authorize("owner", "employee"), nameRule, validate, createCategory);
router.patch("/:id", protect, authorize("owner"), nameRule, validate, updateCategory);
router.delete("/:id", protect, authorize("owner"), deleteCategory);

export default router;
