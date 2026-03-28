import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { AUTH_COOKIE_NAME } from "../../modules/auth/auth.cookies.js";
import { env } from "../../config/env.js";

type JwtPayload = {
  sub: string;
  email: string;
  plan: string;
};

function extractToken(req: Request): string | undefined {
  const fromCookie = req.cookies?.[AUTH_COOKIE_NAME] as string | undefined;
  if (fromCookie) {
    return fromCookie;
  }
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    return header.slice("Bearer ".length).trim();
  }
  return undefined;
}

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const token = extractToken(req);
  if (!token) {
    res.status(401).json({
      error: "Not authenticated — use cookie session or Authorization: Bearer",
    });
    return;
  }
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    req.user = {
      id: decoded.sub,
      email: decoded.email,
      plan: decoded.plan as import("@ai-task-runner/shared").UserPlan,
    };
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}
