import { Router } from "express";
import { body } from "express-validator";
import { listCategories, createCategory, updateCategory, deleteCategory } from "../controllers/categoryController.js";
import { protect, authorize } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const router = Router();

const nameRule = [body("name").trim().notEmpty().withMessage("Category name is required.")];

router.get("/", protect, listCategories);
router.post("/", protect, authorize("owner"), nameRule, validate, createCategory);
router.patch("/:id", protect, authorize("owner"), nameRule, validate, updateCategory);
router.delete("/:id", protect, authorize("owner"), deleteCategory);

export default router;
