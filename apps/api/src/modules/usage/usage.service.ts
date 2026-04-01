import type { UserPlan } from "@ai-task-runner/shared";
import { prisma } from "../../core/lib/prisma.js";
import {
  dailyJobLimit,
  maxConcurrentJobs,
  minuteJobLimit,
} from "../../config/plan-policy.js";

export function utcDayBoundary(): Date {
  const d = new Date();
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );
}

export async function getUsageSnapshot(userId: string, plan: UserPlan) {
  const since = utcDayBoundary();
  const day = since;

  const [jobsCreatedToday, jobsInProgress, usageRow] = await Promise.all([
    prisma.job.count({
      where: { user_id: userId, created_at: { gte: since } },
    }),
    prisma.job.count({
      where: {
        user_id: userId,
        status: { in: ["pending", "active"] },
      },
    }),
    prisma.usageDaily.findUnique({
      where: {
        user_id_day: { user_id: userId, day },
      },
    }),
  ]);

  return {
    plan,
    utcDay: day.toISOString().slice(0, 10),
    jobsCreatedToday,
    dailyJobLimit: dailyJobLimit(plan),
    perMinuteJobLimit: minuteJobLimit(plan),
    jobsInProgress,
    maxConcurrentJobs: maxConcurrentJobs(plan),
    outcomesToday: {
      completed: usageRow?.completed ?? 0,
      failed: usageRow?.failed ?? 0,
      dead: usageRow?.dead ?? 0,
    },
  };
}
