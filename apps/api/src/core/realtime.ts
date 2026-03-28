import type { Server as HttpServer } from "node:http";
import cookie from "cookie";
import jwt from "jsonwebtoken";
import { Redis } from "ioredis";
import { Server } from "socket.io";
import {
  JOB_UPDATES_CHANNEL,
  type JobUpdatePayload,
} from "@ai-task-runner/shared";
import { env } from "../config/env.js";
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

  void subscriber.subscribe(JOB_UPDATES_CHANNEL).catch((err) => {
    console.error("Redis subscribe failed:", err);
  });

  subscriber.on("message", (_channel, message) => {
    try {
      const data = JSON.parse(message) as JobUpdatePayload;
      if (!data.userId || !data.jobId) {
        return;
      }
      io.to(`user:${data.userId}`).emit("job:update", data);
    } catch {
      /* ignore malformed */
    }
  });

  return io;
}
