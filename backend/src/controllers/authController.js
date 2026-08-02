import asyncHandler from "express-async-handler";
import { User } from "../models/User.js";
import { generateToken } from "../utils/generateToken.js";
import { ApiError } from "../utils/ApiError.js";
import { logActivity } from "../utils/logActivity.js";

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
  if (!user || !user.isActive || !(await user.comparePassword(password))) {
    throw new ApiError(401, "That email or password isn't right.");
  }

  const token = generateToken(user);
  res.json({ success: true, data: { user, token } });
});

// Owner-only: provisions a login for a new employee or owner account.
export const register = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    throw new ApiError(409, "An account with that email already exists.");
  }

  const user = await User.create({ name, email: email.toLowerCase(), password, role });
  await logActivity({ user: req.user, action: "Created user account", target: `${user.name} (${user.role})` });

  res.status(201).json({ success: true, data: user });
});

export const getMe = asyncHandler(async (req, res) => {
  res.json({ success: true, data: req.user });
});

export const updateMe = asyncHandler(async (req, res) => {
  const { name } = req.body;
  if (name) req.user.name = name;
  await req.user.save();
  res.json({ success: true, data: req.user });
});

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select("+password");

  if (!(await user.comparePassword(currentPassword))) {
    throw new ApiError(401, "Current password is incorrect.");
  }

  user.password = newPassword;
  await user.save();
  res.json({ success: true, message: "Password updated." });
});
