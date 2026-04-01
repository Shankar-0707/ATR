import type { Request, Response } from "express";
import type { UserPlan } from "@ai-task-runner/shared";
import { getUsageSnapshot } from "./usage.service.js";

function plan(req: Request): UserPlan {
  return req.user!.plan;
}

export async function getMine(req: Request, res: Response): Promise<void> {
  const snapshot = await getUsageSnapshot(req.user!.id, plan(req));
  res.json(snapshot);
}
