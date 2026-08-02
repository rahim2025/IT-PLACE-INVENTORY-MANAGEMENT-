import asyncHandler from "express-async-handler";
import { User } from "../models/User.js";
import { ApiError } from "../utils/ApiError.js";
import { logActivity } from "../utils/logActivity.js";

export const listUsers = asyncHandler(async (req, res) => {
  const users = await User.find().sort({ createdAt: -1 });
  res.json({ success: true, data: users });
});

// Owner grants (or revokes) access here — "user" has none, "employee" and
// "owner" do. Guards against locking everyone out: can't change your own
// role, and can't demote/remove the last remaining owner.
export const updateUserRole = asyncHandler(async (req, res) => {
  const { role } = req.body;

  if (String(req.params.id) === String(req.user._id)) {
    throw new ApiError(400, "You can't change your own role.");
  }

  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, "Account not found.");

  if (user.role === "owner" && role !== "owner") {
    const ownerCount = await User.countDocuments({ role: "owner" });
    if (ownerCount <= 1) {
      throw new ApiError(400, "There must be at least one owner account.");
    }
  }

  user.role = role;
  await user.save();
  await logActivity({ user: req.user, action: "Changed account role", target: `${user.name} → ${role}` });
  res.json({ success: true, data: user });
});

export const deleteUser = asyncHandler(async (req, res) => {
  if (String(req.params.id) === String(req.user._id)) {
    throw new ApiError(400, "You can't delete your own account.");
  }

  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, "Account not found.");

  if (user.role === "owner") {
    const ownerCount = await User.countDocuments({ role: "owner" });
    if (ownerCount <= 1) {
      throw new ApiError(400, "There must be at least one owner account.");
    }
  }

  await user.deleteOne();
  await logActivity({ user: req.user, action: "Deleted account", target: `${user.name} (${user.role})` });
  res.json({ success: true, message: "Account deleted." });
});
