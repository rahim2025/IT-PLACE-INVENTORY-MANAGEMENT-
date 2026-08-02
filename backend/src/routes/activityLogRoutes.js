import { Router } from "express";
import { listActivityLogs } from "../controllers/activityLogController.js";
import { protect, authorize } from "../middleware/auth.js";

const router = Router();

router.get("/", protect, authorize("owner", "employee"), listActivityLogs);

export default router;
