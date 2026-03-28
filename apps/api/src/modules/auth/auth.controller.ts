import type { Request, Response } from "express";
import {
  loginBodySchema,
  registerBodySchema,
  upgradeBodySchema,
} from "./auth.schemas.js";
import { clearAuthCookie, setAuthCookie } from "./auth.cookies.js";
import {
  getUserById,
  issueAccessToken,
  loginUser,
  registerUser,
  upgradePlan,
} from "./auth.service.js";

export async function register(req: Request, res: Response): Promise<void> {
  const body = registerBodySchema.parse(req.body);
  const { user, token } = await registerUser(body.email, body.password);
  setAuthCookie(res, token);
  res.status(201).json({ user });
}

export async function login(req: Request, res: Response): Promise<void> {
  const body = loginBodySchema.parse(req.body);
  const { user, token } = await loginUser(body.email, body.password);
  setAuthCookie(res, token);
  res.json({ user });
}

export async function logout(_req: Request, res: Response): Promise<void> {
  clearAuthCookie(res);
  res.status(204).send();
}

export async function me(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const user = await getUserById(req.user.id);
  res.json(user);
}

export async function upgrade(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const body = upgradeBodySchema.parse(req.body);
  const plan = body.plan ?? "pro";
  const user = await upgradePlan(req.user.id, plan);
  const token = issueAccessToken(user);
  setAuthCookie(res, token);
  res.json(user);
}
