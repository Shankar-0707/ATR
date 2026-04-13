import type { Request, Response } from "express";
import { parseUserIntent } from "./chat.service.js";

export async function handleChatMessage(req: Request, res: Response): Promise<void> {
  const { message } = req.body as { message?: string };
  
  if (!message || typeof message !== "string") {
    res.status(400).json({ error: "Missing or invalid 'message' field in body." });
    return;
  }

  const intent = await parseUserIntent(message);
  res.json(intent);
}
