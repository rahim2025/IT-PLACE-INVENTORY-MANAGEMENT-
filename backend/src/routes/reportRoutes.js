import { Router } from "express";
import { getReport, getInvoice } from "../controllers/reportController.js";
import { protect, authorize } from "../middleware/auth.js";

const router = Router();

router.get("/", protect, authorize("owner"), getReport);
router.get("/invoice", protect, authorize("owner"), getInvoice);

export default router;
