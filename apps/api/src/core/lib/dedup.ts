import { createHash } from "node:crypto";
import type { JobType } from "@ai-task-runner/shared";
import { env } from "../../config/env.js";
import { ApiError } from "../middleware/error.middleware.js";
import { redis } from "./redis.js";

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((v) => stableStringify(v)).join(",")}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(",")}}`;
}

export function payloadFingerprint(type: JobType, payload: unknown): string {
  return createHash("sha256")
    .update(`${type}:${stableStringify(payload)}`)
    .digest("hex");
}

export async function assertNotDuplicatePayload(
  userId: string,
  type: JobType,
  payload: unknown,
): Promise<void> {
  if (env.dedupWindowSeconds <= 0) {
    return;
  }
  const fp = payloadFingerprint(type, payload);
  const key = `dedup:${userId}:${fp}`;
  const existing = await redis.get(key);
  if (existing) {
    throw new ApiError(409, "Duplicate job submitted recently", {
      duplicateOf: existing,
    });
  }
}

export async function rememberDedupJob(
  userId: string,
  type: JobType,
  payload: unknown,
  jobId: string,
): Promise<void> {
  if (env.dedupWindowSeconds <= 0) {
    return;
  }
  const fp = payloadFingerprint(type, payload);
  const key = `dedup:${userId}:${fp}`;
  await redis.set(key, jobId, "EX", env.dedupWindowSeconds);
}
