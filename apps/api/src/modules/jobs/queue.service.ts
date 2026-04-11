import { Queue } from "bullmq";
import type { JobType } from "@ai-task-runner/shared";
import { env } from "../../config/env.js";
import { redis } from "../../core/lib/redis.js";

export const AI_TASKS_QUEUE_NAME = "ai-tasks";

export type AiTaskJobData = {
  dbJobId: string;
  userId: string;
  type: JobType;
  payload: unknown;
  priority: number;
};

export const aiTasksQueue = new Queue<AiTaskJobData>(AI_TASKS_QUEUE_NAME, {
  connection: redis,
});

/**
 * Fire-and-forget ping to wake up the worker on Render free tier.
 * If WORKER_URL is not set or the request fails, we silently ignore it —
 * the job is already in Redis and the worker will pick it up once awake.
 */
function wakeWorker() {
  const workerUrl = process.env.WORKER_URL;
  if (!workerUrl) return;
  fetch(`${workerUrl}/health`).catch(() => {
    /* ignore — best-effort wake-up */
  });
}

export async function enqueueAiTask(data: AiTaskJobData) {
  // We no longer use BullMQ "delay" due to serverless Redis issues on Upstash.
  // Delay is natively handled directly in the worker to hold in "pending".
  const bullJob = await aiTasksQueue.add("process", data, {
    jobId: data.dbJobId,
    priority: data.priority,
  });

  // Ping the worker to wake it up (Render free tier spins down after 15 min)
  wakeWorker();

  return bullJob;
}
