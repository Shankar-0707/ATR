import { Router } from "express";
import { requireAuth } from "../../core/middleware/auth.middleware.js";
import * as usageController from "./usage.controller.js";

export const usageRouter = Router();

usageRouter.use(requireAuth);
usageRouter.get("/", (req, res, next) => {
  void usageController.getMine(req, res).catch(next);
});
