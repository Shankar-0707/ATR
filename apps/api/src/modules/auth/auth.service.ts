import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import type { UserPlan } from "@ai-task-runner/shared";
import { env } from "../../config/env.js";
import { prisma } from "../../core/lib/prisma.js";
import { ApiError } from "../../core/middleware/error.middleware.js";

const SALT_ROUNDS = 10;
const DEFAULT_QUEUE_NAME = "default";

function signToken(user: {
  id: string;
  email: string;
  plan: string;
}): string {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      plan: user.plan,
    },
    env.JWT_SECRET,
    { expiresIn: "7d" },
  );
}

/** Issue a new JWT string (set on the response with `setAuthCookie` in the controller). */
export function issueAccessToken(user: {
  id: string;
  email: string;
  plan: string;
}): string {
  return signToken(user);
}

export async function registerUser(
  email: string,
  password: string,
): Promise<{ user: { id: string; email: string; plan: UserPlan }; token: string }> {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new ApiError(409, "Email already registered");
  }
  const hash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await prisma.user.create({
    data: {
      email,
      password: hash,
      plan: "free",
    },
  });
  await prisma.queue.create({
    data: {
      user_id: user.id,
      name: DEFAULT_QUEUE_NAME,
      concurrency: 2,
      rate_limit_per_min: 5,
    },
  });
  const token = signToken(user);
  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      plan: user.plan as UserPlan,
    },
  };
}

export async function loginUser(
  email: string,
  password: string,
): Promise<{ user: { id: string; email: string; plan: UserPlan }; token: string }> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new ApiError(401, "Invalid email or password");
  }
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) {
    throw new ApiError(401, "Invalid email or password");
  }
  const token = signToken(user);
  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      plan: user.plan as UserPlan,
    },
  };
}

export async function getUserById(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, plan: true, created_at: true },
  });
  if (!user) {
    throw new ApiError(404, "User not found");
  }
  return {
    id: user.id,
    email: user.email,
    plan: user.plan as UserPlan,
    created_at: user.created_at,
  };
}

export async function upgradePlan(
  userId: string,
  target: "pro" | "free",
): Promise<{ id: string; email: string; plan: UserPlan }> {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { plan: target },
    select: { id: true, email: true, plan: true },
  });
  return {
    id: user.id,
    email: user.email,
    plan: user.plan as UserPlan,
  };
}
