import { Router } from "express";
import { body } from "express-validator";
import {
  listBrokers,
  createBroker,
  updateBroker,
  deleteBroker,
  listBrokerTransactions,
  createBrokerTransaction,
} from "../controllers/brokerController.js";
import { protect, authorize } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const router = Router();

router.get("/", protect, authorize("owner"), listBrokers);
router.post(
  "/",
  protect,
  authorize("owner"),
  [body("name").trim().notEmpty().withMessage("Name is required.")],
  validate,
  createBroker
);
router.patch(
  "/:id",
  protect,
  authorize("owner"),
  [body("name").optional().trim().notEmpty().withMessage("Name is required.")],
  validate,
  updateBroker
);
router.delete("/:id", protect, authorize("owner"), deleteBroker);

router.get("/transactions/all", protect, authorize("owner"), listBrokerTransactions);
router.post(
  "/transactions",
  protect,
  authorize("owner"),
  [
    body("broker").isMongoId().withMessage("Choose a valid broker."),
    body("type").isIn(["Credit", "Payment"]).withMessage("Choose a valid transaction type."),
    body("amount").isFloat({ min: 0.01 }).withMessage("Enter an amount greater than zero."),
  ],
  validate,
  createBrokerTransaction
);

export default router;
