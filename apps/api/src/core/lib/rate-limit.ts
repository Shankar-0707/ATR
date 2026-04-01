import type { UserPlan } from "@ai-task-runner/shared";
import { dailyJobLimit, minuteJobLimit } from "../../config/plan-policy.js";
import { env } from "../../config/env.js";
import { ApiError } from "../middleware/error.middleware.js";
import { redis } from "./redis.js";

export function utcDayKey(): string {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

function minuteBucketKey(): string {
  const d = new Date();
  const h = String(d.getUTCHours()).padStart(2, "0");
  const min = String(d.getUTCMinutes()).padStart(2, "0");
  return `${utcDayKey()}${h}${min}`;
}

function secondsUntilUtcMidnight(): number {
  const now = new Date();
  const t = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1),
  );
  return Math.max(1, Math.floor((t.getTime() - now.getTime()) / 1000));
}

export type RateSlot = { release: () => Promise<void> };

/**
 * Atomically consumes one daily + one per-minute slot (Redis).
 * Admin plan skips limits. Caller must `release()` if job creation fails after this succeeds.
 */
export async function consumeJobRateSlots(
  userId: string,
  plan: UserPlan,
): Promise<RateSlot> {
  if (plan === "admin") {
    return { release: async () => {} };
  }

  const dailyLimit = dailyJobLimit(plan);
  const minuteLimit = minuteJobLimit(plan);
  const dKey = `rl:d:${userId}:${utcDayKey()}`;
  const mKey = `rl:m:${userId}:${minuteBucketKey()}`;

  const d = await redis.incr(dKey);
  if (d === 1) {
    await redis.expire(dKey, secondsUntilUtcMidnight());
  }
  if (d > dailyLimit) {
    await redis.decr(dKey);
    throw new ApiError(
      429,
      "Daily job limit reached. Try again tomorrow or upgrade your plan.",
    );
  }

  const m = await redis.incr(mKey);
  if (m === 1) {
    await redis.expire(mKey, 120);
  }
  if (m > minuteLimit) {
    await redis.decr(dKey);
    await redis.decr(mKey);
    throw new ApiError(
      429,
      "Too many jobs per minute. Slow down and try again shortly.",
    );
  }

  let released = false;
  return {
    release: async () => {
      if (released) {
        return;
      }
      released = true;
      await redis.decr(dKey);
      await redis.decr(mKey);
    },
  };
}
