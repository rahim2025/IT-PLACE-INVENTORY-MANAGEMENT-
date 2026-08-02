import { Router } from "express";
import { body } from "express-validator";
import { listUsers, updateUserRole, deleteUser } from "../controllers/userController.js";
import { protect, authorize } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const router = Router();

router.get("/", protect, authorize("owner"), listUsers);
router.patch(
  "/:id/role",
  protect,
  authorize("owner"),
  [body("role").isIn(["user", "employee", "owner"]).withMessage("Choose a valid role.")],
  validate,
  updateUserRole
);
router.delete("/:id", protect, authorize("owner"), deleteUser);

export default router;
