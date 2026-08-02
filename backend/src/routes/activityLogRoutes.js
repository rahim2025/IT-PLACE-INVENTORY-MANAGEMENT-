import { Router } from "express";
import { listActivityLogs } from "../controllers/activityLogController.js";
import { protect } from "../middleware/auth.js";

const router = Router();

router.get("/", protect, listActivityLogs);

export default router;
