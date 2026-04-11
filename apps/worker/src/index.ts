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
  family: 4,
  keepAlive: 10000,
  ...(env.REDIS_URL.startsWith("rediss://") ? { tls: { rejectUnauthorized: false } } : {}),
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

  // ── Self-ping keep-alive for Render Free Tier ──
  // Render spins down free web services after 15 min of inactivity.
  // Pinging the PUBLIC URL counts as inbound traffic (localhost does NOT).
  if (env.NODE_ENV === "production") {
    const KEEP_ALIVE_INTERVAL_MS = 13 * 60 * 1000; // 13 minutes
    const publicUrl = env.WORKER_PUBLIC_URL;

    setInterval(() => {
      if (publicUrl) {
        // Ping our own public URL — Render sees this as inbound traffic
        fetch(`${publicUrl}/health`)
          .then((res) => {
            logger.info("Keep-alive ping OK (public)", { status: res.status, url: publicUrl });
          })
          .catch((err) => {
            logger.warn("Keep-alive ping failed (public)", { error: String(err), url: publicUrl });
          });
      } else {
        // Fallback: localhost ping (won't prevent Render spindown, but still validates health)
        const req = http.request(
          { hostname: "0.0.0.0", port: env.PORT, path: "/health", method: "GET" },
          (res) => {
            res.resume();
            logger.info("Keep-alive ping OK (local)", { status: res.statusCode });
          },
        );
        req.on("error", (err) => {
          logger.warn("Keep-alive ping failed (local)", { error: err.message });
        });
        req.end();
      }
    }, KEEP_ALIVE_INTERVAL_MS);
    logger.info("Keep-alive self-ping enabled", { intervalMs: KEEP_ALIVE_INTERVAL_MS, publicUrl: publicUrl ?? "localhost" });
  }
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

    // Simulate delay for pending jobs using the worker env configuration
    if (env.BULL_JOB_DELAY_MS > 0) {
      await new Promise(resolve => setTimeout(resolve, env.BULL_JOB_DELAY_MS));
      
      // Check if job was cancelled during the delay
      const currentJob = await prisma.job.findUnique({ where: { id: dbJobId } });
      if (currentJob && ["failed", "dead", "completed"].includes(currentJob.status)) {
        logger.info("Job aborted because status changed during delay", { jobId: dbJobId, status: currentJob.status });
        return; // Abort silently, user cancelled it or it was modified
      }
    }

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
