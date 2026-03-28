import { Redis } from "ioredis";
import {
  JOB_UPDATES_CHANNEL,
  type JobUpdatePayload,
} from "@ai-task-runner/shared";
import { env } from "../config/env.js";

const publisher = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

export async function publishJobUpdate(
  payload: JobUpdatePayload,
): Promise<void> {
  await publisher.publish(JOB_UPDATES_CHANNEL, JSON.stringify(payload));
}
