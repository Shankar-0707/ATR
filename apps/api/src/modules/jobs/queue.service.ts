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

export async function enqueueAiTask(data: AiTaskJobData) {
  // We no longer use BullMQ "delay" due to serverless Redis issues on Upstash.
  // Delay is natively handled directly in the worker to hold in "pending".
  return aiTasksQueue.add("process", data, {
    jobId: data.dbJobId,
    priority: data.priority,
  });
}
