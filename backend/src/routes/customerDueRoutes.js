import { Router } from "express";
import { body } from "express-validator";
import { listDues, createDue, updateDue, deleteDue, createDuePayment, listDuePayments } from "../controllers/customerDueController.js";
import { protect, authorize } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const router = Router();

router.get("/", protect, authorize("owner"), listDues);
router.post(
  "/",
  protect,
  authorize("owner"),
  [
    body("customer").isMongoId().withMessage("Choose a valid customer."),
    body("product").optional({ values: "falsy" }).isMongoId().withMessage("Choose a valid product."),
    body("dueAmount").isFloat({ min: 0.01 }).withMessage("Enter a due amount greater than zero."),
  ],
  validate,
  createDue
);
router.patch(
  "/:id",
  protect,
  authorize("owner"),
  [
    body("customer").optional().isMongoId().withMessage("Choose a valid customer."),
    body("product").optional({ values: "falsy" }).isMongoId().withMessage("Choose a valid product."),
    body("dueAmount").optional().isFloat({ min: 0.01 }).withMessage("Enter a due amount greater than zero."),
  ],
  validate,
  updateDue
);
router.delete("/:id", protect, authorize("owner"), deleteDue);

router.get("/payments", protect, authorize("owner"), listDuePayments);
router.post(
  "/payments",
  protect,
  authorize("owner"),
  [
    body("due").isMongoId().withMessage("Choose a valid due record."),
    body("amount").isFloat({ min: 0.01 }).withMessage("Enter an amount greater than zero."),
  ],
  validate,
  createDuePayment
);

export default router;
