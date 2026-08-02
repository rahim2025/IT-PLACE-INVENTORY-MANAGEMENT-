import { Router } from "express";
import { body } from "express-validator";
import { listCustomers, createCustomer } from "../controllers/customerController.js";
import { protect, authorize } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const router = Router();

router.get("/", protect, authorize("owner"), listCustomers);
router.post(
  "/",
  protect,
  authorize("owner"),
  [
    body("name").trim().notEmpty().withMessage("Name is required."),
    body("email").optional({ values: "falsy" }).isEmail().withMessage("Enter a valid email."),
  ],
  validate,
  createCustomer
);

export default router;
