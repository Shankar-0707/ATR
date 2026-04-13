import { Router } from "express";
import { requireAuth } from "../../core/middleware/auth.middleware.js";
import { handleChatMessage } from "./chat.controller.js";

export const chatRouter = Router();

chatRouter.use(requireAuth);
chatRouter.post("/message", (req, res, next) => {
  void handleChatMessage(req, res).catch(next);
});
