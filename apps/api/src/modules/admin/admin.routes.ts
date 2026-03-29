import { Router } from "express";
import { requireAuth } from "../../core/middleware/auth.middleware.js";
import { requireAdmin } from "../../core/middleware/admin.middleware.js";
import * as adminController from "./admin.controller.js";

export const adminRouter = Router();

adminRouter.use(requireAuth, requireAdmin);

adminRouter.get("/stats", (req, res, next) => {
  void adminController.stats(req, res).catch(next);
});
adminRouter.get("/users", (req, res, next) => {
  void adminController.users(req, res).catch(next);
});
adminRouter.get("/jobs", (req, res, next) => {
  void adminController.jobs(req, res).catch(next);
});
