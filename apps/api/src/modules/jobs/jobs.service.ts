import { createRequire } from "node:module";
import type { JobType, UserPlan } from "@ai-task-runner/shared";
import type { Express } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../../core/lib/prisma.js";
import { ApiError } from "../../core/middleware/error.middleware.js";
import {
  isJobTypeAllowedForPlan,
  maxAttemptsForPlan,
  maxConcurrentJobs,
} from "../../config/plan-policy.js";
import { assertNotDuplicatePayload, rememberDedupJob } from "../../core/lib/dedup.js";
import { consumeJobRateSlots } from "../../core/lib/rate-limit.js";
import { destroyRaw, uploadRawAsset } from "./storage.service.js";
import { aiTasksQueue, enqueueAiTask } from "./queue.service.js";

const DEFAULT_QUEUE_NAME = "default";
const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse") as (
  data: Buffer,
) => Promise<{ text?: string }>;

async function extractPdfText(buffer: Buffer): Promise<string> {
  try {
    const parsed = await pdfParse(buffer);
    const text = parsed.text?.trim() ?? "";
    if (!text) {
      return "";
    }
    return text;
  } catch {
    return "";
  }
}

async function getDefaultQueueId(userId: string): Promise<string> {
  const q = await prisma.queue.findFirst({
    where: { user_id: userId, name: DEFAULT_QUEUE_NAME },
  });
  if (!q) {
    throw new ApiError(500, "Default queue missing; contact support");
  }
  return q.id;
}

function priorityForPlan(plan: UserPlan): number {
  if (plan === "pro" || plan === "admin") {
    return 10;
  }
  return 1;
}

async function enforceJobPolicies(
  userId: string,
  plan: UserPlan,
  type: JobType,
  payload: Prisma.InputJsonValue,
  options?: { skipDedup?: boolean },
): Promise<void> {
  if (!isJobTypeAllowedForPlan(plan, type)) {
    throw new ApiError(
      403,
      "This job type is not available on your plan. Upgrade to continue.",
    );
  }

  const concurrent = await prisma.job.count({
    where: {
      user_id: userId,
      status: { in: ["pending", "active"] },
    },
  });
  if (concurrent >= maxConcurrentJobs(plan)) {
    throw new ApiError(
      429,
      "Too many jobs in progress. Wait for completion or cancel a pending job.",
    );
  }

  if (!options?.skipDedup) {
    await assertNotDuplicatePayload(userId, type, payload);
  }
}

export async function createJob(
  userId: string,
  plan: UserPlan,
  type: JobType,
  payload: Prisma.InputJsonValue,
) {
  await enforceJobPolicies(userId, plan, type, payload);
  const rate = await consumeJobRateSlots(userId, plan);
  let createdJobId: string | null = null;
  try {
    const queueId = await getDefaultQueueId(userId);
    const priority = priorityForPlan(plan);
    const maxAttempts = maxAttemptsForPlan(plan);
    const job = await prisma.job.create({
      data: {
        user_id: userId,
        queue_id: queueId,
        type,
        payload,
        status: "pending",
        priority,
        max_attempts: maxAttempts,
        attempts: 0,
      },
    });
    createdJobId = job.id;
    const bullJob = await enqueueAiTask({
      dbJobId: job.id,
      userId,
      type,
      payload,
      priority,
    });
    await prisma.job.update({
      where: { id: job.id },
      data: { bull_job_id: bullJob.id ?? null },
    });
    await rememberDedupJob(userId, type, payload, job.id);
    return prisma.job.findUniqueOrThrow({ where: { id: job.id } });
  } catch (e) {
    await rate.release();
    if (createdJobId) {
      await prisma.job.delete({ where: { id: createdJobId } }).catch(() => {});
    }
    throw e;
  }
}

export async function createSummariseJobFromPdf(
  userId: string,
  plan: UserPlan,
  file: Express.Multer.File,
) {
  const text = await extractPdfText(file.buffer);
  if (text) {
    return createJob(userId, plan, "summarise", {
      source: "text",
      text,
    });
  }

  const uploaded = await uploadRawAsset(userId, file.buffer, file.originalname);
  try {
    return await createJob(userId, plan, "summarise", {
      source: "cloudinary",
      publicId: uploaded.publicId,
      secureUrl: uploaded.secureUrl,
      fileName: file.originalname,
      mimeType: file.mimetype || "application/pdf",
    });
  } catch (err) {
    await destroyRaw(uploaded.publicId).catch(() => {});
    throw err;
  }
}

export async function createTranscribeJobFromAudio(
  userId: string,
  plan: UserPlan,
  file: Express.Multer.File,
) {
  const uploaded = await uploadRawAsset(userId, file.buffer, file.originalname);
  try {
    return await createJob(userId, plan, "transcribe", {
      source: "cloudinary",
      publicId: uploaded.publicId,
      secureUrl: uploaded.secureUrl,
      fileName: file.originalname,
      mimeType: file.mimetype,
    });
  } catch (err) {
    await destroyRaw(uploaded.publicId).catch(() => {});
    throw err;
  }
}

export async function listJobs(userId: string, take = 20, skip = 0) {
  const [items, total] = await Promise.all([
    prisma.job.findMany({
      where: { user_id: userId },
      orderBy: { created_at: "desc" },
      take: Math.min(take, 100),
      skip,
    }),
    prisma.job.count({ where: { user_id: userId } }),
  ]);
  return { items, total, take, skip };
}

export async function getJob(userId: string, jobId: string) {
  const job = await prisma.job.findFirst({
    where: { id: jobId, user_id: userId },
  });
  if (!job) {
    throw new ApiError(404, "Job not found");
  }
  return job;
}

export async function cancelJob(userId: string, jobId: string) {
  const job = await prisma.job.findFirst({
    where: { id: jobId, user_id: userId },
  });
  if (!job) {
    throw new ApiError(404, "Job not found");
  }
  if (job.status !== "pending") {
    throw new ApiError(400, "Only pending jobs can be cancelled");
  }
  if (job.bull_job_id) {
    const bullJob = await aiTasksQueue.getJob(job.bull_job_id);
    await bullJob?.remove();
  }
  await prisma.job.update({
    where: { id: job.id },
    data: {
      status: "failed",
      error: "Cancelled by user",
      completed_at: new Date(),
    },
  });
  return { ok: true };
}

export async function retryJob(userId: string, jobId: string) {
  const job = await prisma.job.findFirst({
    where: { id: jobId, user_id: userId },
  });
  if (!job) {
    throw new ApiError(404, "Job not found");
  }
  if (job.status !== "failed") {
    throw new ApiError(
      400,
      "Only failed jobs can be retried (dead jobs exhausted all attempts)",
    );
  }
  const userRow = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
  });
  const userPlan = userRow.plan as UserPlan;
  const jType = job.type as JobType;
  const payload = job.payload as Prisma.InputJsonValue;

  await enforceJobPolicies(userId, userPlan, jType, payload, {
    skipDedup: true,
  });
  const rate = await consumeJobRateSlots(userId, userPlan);

  try {
    const priority = priorityForPlan(userPlan);
    await prisma.job.update({
      where: { id: job.id },
      data: {
        status: "pending",
        error: null,
        attempts: 0,
        started_at: null,
        completed_at: null,
        result: Prisma.DbNull,
        priority,
      },
    });
    const bullJob = await enqueueAiTask({
      dbJobId: job.id,
      userId,
      type: jType,
      payload,
      priority,
    });
    await prisma.job.update({
      where: { id: job.id },
      data: { bull_job_id: bullJob.id ?? null },
    });
    return prisma.job.findUniqueOrThrow({ where: { id: job.id } });
  } catch (e) {
    await rate.release();
    throw e;
  }
}
