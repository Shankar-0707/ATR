import type { Request, Response } from "express";
import * as adminService from "./admin.service.js";

export async function stats(_req: Request, res: Response): Promise<void> {
  const data = await adminService.getPlatformStats();
  res.json(data);
}

export async function users(req: Request, res: Response): Promise<void> {
  const take = Math.min(100, Math.max(1, Number(req.query.take) || 20));
  const skip = Math.max(0, Number(req.query.skip) || 0);
  const data = await adminService.listUsers(take, skip);
  res.json(data);
}

export async function jobs(req: Request, res: Response): Promise<void> {
  const take = Math.min(100, Math.max(1, Number(req.query.take) || 20));
  const skip = Math.max(0, Number(req.query.skip) || 0);
  const status =
    typeof req.query.status === "string" && req.query.status.length > 0
      ? req.query.status
      : undefined;
  const userId =
    typeof req.query.userId === "string" && req.query.userId.length > 0
      ? req.query.userId
      : undefined;
  const data = await adminService.listAllJobs(take, skip, status, userId);
  res.json(data);
}
