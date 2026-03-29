import type { JobType, UserPlan } from "@ai-task-runner/shared";
import { env } from "./env.js";

export function dailyJobLimit(plan: UserPlan): number {
  switch (plan) {
    case "free":
      return env.rateLimitFreeJobsPerDay;
    case "pro":
      return env.rateLimitProJobsPerDay;
    case "admin":
      return env.rateLimitAdminJobsPerDay;
    default: {
      const _n: never = plan;
      return _n;
    }
  }
}

export function minuteJobLimit(plan: UserPlan): number {
  switch (plan) {
    case "free":
      return env.rateLimitFreeJobsPerMinute;
    case "pro":
      return env.rateLimitProJobsPerMinute;
    case "admin":
      return env.rateLimitAdminJobsPerMinute;
    default: {
      const _n: never = plan;
      return _n;
    }
  }
}

export function maxConcurrentJobs(plan: UserPlan): number {
  switch (plan) {
    case "free":
      return env.maxConcurrentJobsFree;
    case "pro":
      return env.maxConcurrentJobsPro;
    case "admin":
      return env.maxConcurrentJobsAdmin;
    default: {
      const _n: never = plan;
      return _n;
    }
  }
}

export function maxAttemptsForPlan(plan: UserPlan): number {
  switch (plan) {
    case "free":
      return env.maxAttemptsFree;
    case "pro":
      return env.maxAttemptsPro;
    case "admin":
      return env.maxAttemptsAdmin;
    default: {
      const _n: never = plan;
      return _n;
    }
  }
}

export function isJobTypeAllowedForPlan(
  plan: UserPlan,
  type: JobType,
): boolean {
  if (plan === "free" && env.freePlanBlockGenerate && type === "generate") {
    return false;
  }
  return true;
}
