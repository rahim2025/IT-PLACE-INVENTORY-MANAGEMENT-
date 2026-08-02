import { ActivityLog } from "../models/ActivityLog.js";

export async function logActivity({ user, action, target }) {
  await ActivityLog.create({
    user: user?._id,
    userName: user?.name ?? "System",
    action,
    target,
  });
}
