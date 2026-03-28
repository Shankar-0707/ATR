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
  const delayMs = Math.max(0, Math.floor(Number(env.bullJobDelayMs)));
  return aiTasksQueue.add("process", data, {
    jobId: data.dbJobId,
    priority: data.priority,
    ...(delayMs > 0 ? { delay: delayMs } : {}),
  });
}
