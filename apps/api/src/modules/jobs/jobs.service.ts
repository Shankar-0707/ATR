import type { JobType, UserPlan } from "@ai-task-runner/shared";
import type { Express } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../../core/lib/prisma.js";
import { ApiError } from "../../core/middleware/error.middleware.js";
import { destroyRaw, uploadRawAsset } from "./storage.service.js";
import { aiTasksQueue, enqueueAiTask } from "./queue.service.js";

const DEFAULT_QUEUE_NAME = "default";

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

export async function createJob(
  userId: string,
  plan: UserPlan,
  type: JobType,
  payload: Prisma.InputJsonValue,
) {
  const queueId = await getDefaultQueueId(userId);
  const priority = priorityForPlan(plan);
  const job = await prisma.job.create({
    data: {
      user_id: userId,
      queue_id: queueId,
      type,
      payload,
      status: "pending",
      priority,
    },
  });
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
  return prisma.job.findUniqueOrThrow({ where: { id: job.id } });
}

export async function createSummariseJobFromPdf(
  userId: string,
  plan: UserPlan,
  file: Express.Multer.File,
) {
  const uploaded = await uploadRawAsset(userId, file.buffer, file.originalname);
  try {
    return await createJob(userId, plan, "summarise", {
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
    throw new ApiError(400, "Only failed jobs can be retried");
  }
  const userRow = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
  });
  const userPlan = userRow.plan as UserPlan;
  const priority = priorityForPlan(userPlan);
  const payload = job.payload as Prisma.InputJsonValue;
  const jType = job.type as JobType;
  await prisma.job.update({
    where: { id: job.id },
    data: {
      status: "pending",
      error: null,
      attempts: { increment: 1 },
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
}
