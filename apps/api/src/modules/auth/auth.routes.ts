import { Router } from "express";
import { requireAuth } from "../../core/middleware/auth.middleware.js";
import * as authController from "./auth.controller.js";

export const authRouter = Router();

authRouter.post("/register", (req, res, next) => {
  void authController.register(req, res).catch(next);
});
authRouter.post("/login", (req, res, next) => {
  void authController.login(req, res).catch(next);
});
authRouter.post("/logout", (req, res, next) => {
  void authController.logout(req, res).catch(next);
});
authRouter.get("/me", requireAuth, (req, res, next) => {
  void authController.me(req, res).catch(next);
});
authRouter.patch("/upgrade", requireAuth, (req, res, next) => {
  void authController.upgrade(req, res).catch(next);
});
