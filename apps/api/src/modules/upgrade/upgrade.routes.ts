import { Router } from "express";
import { requireAuth } from "../../core/middleware/auth.middleware.js";
import { requireAdmin } from "../../core/middleware/admin.middleware.js";
import * as upgradeController from "./upgrade.controller.js";

const router = Router();

// User routes
router.post("/", requireAuth, upgradeController.createRequest);
router.get("/my", requireAuth, upgradeController.myRequests);
router.post("/create-order", requireAuth, upgradeController.createOrder);
router.post("/verify-payment", requireAuth, upgradeController.verifyPayment);

// Admin routes
router.get("/", requireAuth, requireAdmin, upgradeController.listRequests);
router.post("/:id/review", requireAuth, requireAdmin, upgradeController.reviewRequest);

export default router;
