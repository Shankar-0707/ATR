import "./load-env.js";
import * as Sentry from "@sentry/node";
import { Worker } from "bullmq";
import { Redis } from "ioredis";
import type { JobType } from "@ai-task-runner/shared";
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { prisma } from "./lib/prisma.js";
import { publishJobUpdate } from "./lib/job-events.js";
import { processGenerateImageJob } from "./processors/generate-image.js";
import { processSummariseJob } from "./processors/summarise.js";
import { processTranscribeJob } from "./processors/transcribe.js";
import { processTranslateJob } from "./processors/translate.js";
import { recordUsageOutcome } from "./lib/usage-daily.js";

Sentry.init({
  dsn: env.SENTRY_DSN,
  enabled: Boolean(env.SENTRY_DSN),
  environment: env.NODE_ENV,
  tracesSampleRate: env.NODE_ENV === "production" ? 0.2 : 1,
});

const connection = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

import http from "node:http";

const QUEUE_NAME = "ai-tasks";

// Add a simple HTTP health check server for Render (Free Web Service mode)
const server = http.createServer((req, res) => {
  if (req.url === "/health" || req.url === "/") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("OK");
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(env.PORT, "0.0.0.0", () => {
  logger.info("Health check server active", { port: env.PORT });
});

type AiTaskJobData = {
  dbJobId: string;
  userId: string;
  type: JobType;
  payload: unknown;
  priority: number;
};

async function runProcessor(
  type: JobType,
  data: { dbJobId: string; userId: string; payload: unknown },
): Promise<void> {
  switch (type) {
    case "summarise":
      await processSummariseJob(data);
      return;
    case "translate":
      await processTranslateJob(data);
      return;
    case "generate":
      await processGenerateImageJob(data);
      return;
    case "transcribe":
      await processTranscribeJob(data);
      return;
    default: {
      const _exhaustive: never = type;
      throw new Error(`Unsupported job type: ${String(_exhaustive)}`);
    }
  }
}

new Worker<AiTaskJobData>(
  QUEUE_NAME,
  async (job) => {
    const { dbJobId, userId, type, payload } = job.data;

    await prisma.job.update({
      where: { id: dbJobId },
      data: {
        status: "active",
        started_at: new Date(),
      },
    });
    await publishJobUpdate({
      jobId: dbJobId,
      userId,
      status: "active",
      progress: 0,
    });

    try {
      await runProcessor(type, { dbJobId, userId, payload });
      await recordUsageOutcome(userId, "completed");
      logger.info("Job processed", {
        jobId: dbJobId,
        userId,
        type,
        queue: QUEUE_NAME,
      });
    } catch (e) {
      Sentry.captureException(e, {
        extra: { jobId: dbJobId, userId, type, queue: QUEUE_NAME },
      });
      const msg = e instanceof Error ? e.message : "Unknown error";
      const row = await prisma.job.findUnique({ where: { id: dbJobId } });
      const nextAttempts = (row?.attempts ?? 0) + 1;
      const maxA = row?.max_attempts ?? 3;
      const isDead = nextAttempts >= maxA;
      await prisma.job.update({
        where: { id: dbJobId },
        data: {
          status: isDead ? "dead" : "failed",
          completed_at: new Date(),
          error: msg,
          attempts: nextAttempts,
        },
      });
      await recordUsageOutcome(userId, isDead ? "dead" : "failed");
      await publishJobUpdate({
        jobId: dbJobId,
        userId,
        status: isDead ? "dead" : "failed",
        error: msg,
      });
      logger.error("Job processing failed", {
        jobId: dbJobId,
        userId,
        type,
        queue: QUEUE_NAME,
        status: isDead ? "dead" : "failed",
        attempts: nextAttempts,
        maxAttempts: maxA,
        error: msg,
        stack: e instanceof Error ? e.stack : undefined,
      });
    }
  },
  { connection: connection.duplicate() },
);

logger.info("Worker listening", {
  queue: QUEUE_NAME,
  sentryEnabled: Boolean(env.SENTRY_DSN),
});
