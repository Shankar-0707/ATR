import type { Response } from "express";
import { env } from "../../config/env.js";

/** Cookie name for the JWT (httpOnly — not readable by browser JS). */
export const AUTH_COOKIE_NAME = "access_token";

export function setAuthCookie(res: Response, token: string): void {
  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SECURE ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  });
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie(AUTH_COOKIE_NAME, {
    path: "/",
    httpOnly: true,
    sameSite: env.COOKIE_SECURE ? "none" : "lax",
    secure: env.COOKIE_SECURE,
  });
}
