import { Router } from "express";
import { body } from "express-validator";
import { login, register, getMe, updateMe, changePassword } from "../controllers/authController.js";
import { protect, authorize } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { authLimiter } from "../middleware/rateLimiter.js";

const router = Router();

router.post(
  "/login",
  authLimiter,
  [body("email").isEmail().withMessage("Enter a valid email."), body("password").notEmpty().withMessage("Password is required.")],
  validate,
  login
);

router.post(
  "/register",
  protect,
  authorize("owner"),
  [
    body("name").trim().notEmpty().withMessage("Name is required."),
    body("email").isEmail().withMessage("Enter a valid email."),
    body("password").isLength({ min: 8 }).withMessage("Password must be at least 8 characters."),
    body("role").isIn(["owner", "employee"]).withMessage("Role must be owner or employee."),
  ],
  validate,
  register
);

router.get("/me", protect, getMe);
router.patch("/me", protect, [body("name").optional().trim().notEmpty()], validate, updateMe);
router.post(
  "/change-password",
  protect,
  [
    body("currentPassword").notEmpty(),
    body("newPassword").isLength({ min: 8 }).withMessage("New password must be at least 8 characters."),
  ],
  validate,
  changePassword
);

export default router;
