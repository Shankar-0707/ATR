import "./load-env.js";
import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";
import { createServer } from "node:http";
import { env } from "./config/env.js";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { logger } from "./core/lib/logger.js";
import { prisma } from "./core/lib/prisma.js";
import { redis } from "./core/lib/redis.js";
import { attachRealtime } from "./core/realtime.js";
import { errorMiddleware } from "./core/middleware/error.middleware.js";
import { adminRouter } from "./modules/admin/index.js";
import { authRouter } from "./modules/auth/index.js";
import { jobsRouter } from "./modules/jobs/index.js";
import { usageRouter } from "./modules/usage/usage.routes.js";
import { upgradeRoutes } from "./modules/upgrade/index.js";

Sentry.init({
  dsn: env.SENTRY_DSN,
  enabled: Boolean(env.SENTRY_DSN),
  environment: env.NODE_ENV,
  integrations: [Sentry.expressIntegration(), nodeProfilingIntegration()],
  tracesSampleRate: env.NODE_ENV === "production" ? 0.2 : 1,
  profilesSampleRate: env.NODE_ENV === "production" ? 0.2 : 1,
});

const app = express();
app.set("trust proxy", 1);
app.use(
  cors({
    origin: env.CORS_ORIGIN === undefined ? true : env.CORS_ORIGIN,
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(express.json());

app.get("/health", async (_req, res) => {
  const health: {
    status: "ok" | "degraded";
    postgres: "ok" | "error";
    redis: "ok" | "error";
  } = { status: "ok", postgres: "ok", redis: "ok" };
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    health.postgres = "error";
    health.status = "degraded";
  }
  try {
    const pong = await redis.ping();
    if (pong !== "PONG") {
      health.redis = "error";
      health.status = "degraded";
    }
  } catch {
    health.redis = "error";
    health.status = "degraded";
  }
  res.status(health.status === "ok" ? 200 : 503).json(health);
});

app.use("/api/auth", authRouter);
app.use("/api/jobs", jobsRouter);
app.use("/api/usage", usageRouter);
app.use("/api/upgrade", upgradeRoutes);
app.use("/api/admin", adminRouter);

Sentry.setupExpressErrorHandler(app);
app.use(errorMiddleware);

const httpServer = createServer(app);
attachRealtime(httpServer);

httpServer.listen(env.PORT, () => {
  logger.info("API listening", {
    port: env.PORT,
    url: `http://localhost:${env.PORT}`,
    sentryEnabled: Boolean(env.SENTRY_DSN),
  });
});
