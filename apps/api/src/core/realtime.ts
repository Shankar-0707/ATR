import type { Server as HttpServer } from "node:http";
import cookie from "cookie";
import jwt from "jsonwebtoken";
import { Redis } from "ioredis";
import { Server } from "socket.io";
import {
  JOB_UPDATES_CHANNEL,
  UPGRADE_REQUEST_CHANNEL,
  type JobUpdatePayload,
  type UpgradeRequestUpdatePayload,
} from "@ai-task-runner/shared";
import { env } from "../config/env.js";
import { logger } from "./lib/logger.js";
import { AUTH_COOKIE_NAME } from "../modules/auth/auth.cookies.js";

type JwtPayload = { sub: string };

/**
 * Socket.io on the same HTTP port as Express; Redis subscriber forwards worker
 * publishes on `JOB_UPDATES_CHANNEL` to per-user rooms.
 */
export function attachRealtime(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: {
      origin: env.CORS_ORIGIN === undefined ? true : env.CORS_ORIGIN,
      credentials: true,
    },
    path: "/socket.io",
  });

  io.use((socket, next) => {
    try {
      const cookies = cookie.parse(socket.handshake.headers.cookie ?? "");
      const fromAuth = (socket.handshake.auth as { token?: string })?.token;
      const token = cookies[AUTH_COOKIE_NAME] ?? fromAuth;
      if (!token) {
        next(new Error("Unauthorized"));
        return;
      }
      const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
      socket.data.userId = decoded.sub;
      next();
    } catch {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.data.userId as string;
    void socket.join(`user:${userId}`);
  });

  const subscriber = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
  });

  void subscriber.subscribe(JOB_UPDATES_CHANNEL, UPGRADE_REQUEST_CHANNEL).catch((err) => {
    logger.error("Redis subscribe failed", {
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
  });

  subscriber.on("message", (channel, message) => {
    try {
      if (channel === JOB_UPDATES_CHANNEL) {
        const data = JSON.parse(message) as JobUpdatePayload;
        if (!data.userId || !data.jobId) return;
        io.to(`user:${data.userId}`).emit("job:update", data);
      } else if (channel === UPGRADE_REQUEST_CHANNEL) {
        const data = JSON.parse(message) as UpgradeRequestUpdatePayload;
        if (!data.userId || !data.requestId) return;
        // Notify the user
        io.to(`user:${data.userId}`).emit("upgrade:update", data);
        // Notify all admins
        io.emit("upgrade:admin", data);
      }
    } catch {
      /* ignore malformed */
    }
  });

  return io;
}
