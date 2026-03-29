import type { NextFunction, Request, Response } from "express";

export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (req.user?.plan !== "admin") {
    res.status(403).json({ error: "Admin only" });
    return;
  }
  next();
}
