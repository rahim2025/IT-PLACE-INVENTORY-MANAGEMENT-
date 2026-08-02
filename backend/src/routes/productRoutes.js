import { Router } from "express";
import { body } from "express-validator";
import { listProducts, getProduct, createProduct, updateProduct, deleteProduct } from "../controllers/productController.js";
import { protect, authorize } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const router = Router();

const identityRules = [
  body("name").trim().notEmpty().withMessage("Product name is required."),
  body("brand").isMongoId().withMessage("Choose a valid brand."),
  body("category").isMongoId().withMessage("Choose a valid category."),
];

const createProductRules = [
  ...identityRules,
  body("sellingPrice").trim().notEmpty().withMessage("Selling price is required."),
  body("quantity").isInt({ min: 1 }).withMessage("Enter a starting quantity of at least 1."),
  body("buyingPrice").isFloat({ min: 0 }).withMessage("Enter a valid buying price."),
];

const updateProductRules = [
  ...identityRules,
  body("sellingPrice").optional({ values: "falsy" }).trim(),
  body("supplier").optional({ values: "falsy" }).isMongoId().withMessage("Choose a valid supplier."),
];

router.get("/", protect, authorize("owner", "employee"), listProducts);
router.get("/:id", protect, authorize("owner", "employee"), getProduct);
// Employees can add new products too — editing/deleting stays owner-only.
router.post("/", protect, authorize("owner", "employee"), createProductRules, validate, createProduct);
router.patch("/:id", protect, authorize("owner"), updateProductRules, validate, updateProduct);
router.delete("/:id", protect, authorize("owner"), deleteProduct);

export default router;
