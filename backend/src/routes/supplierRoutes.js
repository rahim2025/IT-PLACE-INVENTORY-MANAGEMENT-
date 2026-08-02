import { Router } from "express";
import { body } from "express-validator";
import { listSuppliers, createSupplier, updateSupplier } from "../controllers/supplierController.js";
import { protect, authorize } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const router = Router();

const supplierRules = [
  body("name").trim().notEmpty().withMessage("Supplier name is required."),
  body("email").optional({ values: "falsy" }).isEmail().withMessage("Enter a valid email."),
];

router.get("/", protect, authorize("owner", "employee"), listSuppliers);
router.post("/", protect, authorize("owner"), supplierRules, validate, createSupplier);
router.patch("/:id", protect, authorize("owner"), supplierRules, validate, updateSupplier);

export default router;
