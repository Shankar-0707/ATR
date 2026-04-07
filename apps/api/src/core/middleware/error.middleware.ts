import * as Sentry from "@sentry/node";
import type { NextFunction, Request, Response } from "express";
import multer from "multer";
import { ZodError } from "zod";
import { logger } from "../lib/logger.js";
import { env } from "node:process";

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function errorMiddleware(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const meta = {
    method: req.method,
    path: req.originalUrl,
    userId:
      typeof req.user === "object" &&
      req.user !== null &&
      "id" in req.user &&
      typeof req.user.id === "string"
        ? req.user.id
        : undefined,
  };

  if (err instanceof multer.MulterError) {
    logger.warn("Upload validation failed", {
      ...meta,
      code: err.code,
      message: err.message,
    });
    if (err.code === "LIMIT_FILE_SIZE") {
      res.status(400).json({ error: "File too large (max 15 MB)" });
      return;
    }
    res.status(400).json({ error: err.message });
    return;
  }
  if (
    err instanceof Error &&
    (err.message === "Only application/pdf is allowed" ||
      err.message.startsWith("Only common audio types"))
  ) {
    logger.warn("File validation failed", {
      ...meta,
      message: err.message,
    });
    res.status(400).json({ error: err.message });
    return;
  }
  if (err instanceof ZodError) {
    logger.warn("Request validation failed", {
      ...meta,
      details: err.flatten(),
    });
    res.status(400).json({
      error: "Validation failed",
      details: err.flatten(),
    });
    return;
  }
  if (err instanceof ApiError) {
    if (err.statusCode >= 500) {
      Sentry.captureException(err, { extra: { ...meta, details: err.details } });
      logger.error("API request failed", {
        ...meta,
        statusCode: err.statusCode,
        details: err.details,
        stack: err.stack,
      });
    } else {
      logger.warn("API request rejected", {
        ...meta,
        statusCode: err.statusCode,
        details: err.details,
      });
    }
    res.status(err.statusCode).json({
      error: err.message,
      ...(err.details !== undefined ? { details: err.details } : {}),
    });
    return;
  }
  Sentry.captureException(err, { extra: meta });
  const errorMessage = err instanceof Error ? err.message : String(err);
  const errorStack = err instanceof Error ? err.stack : undefined;

  logger.error("Unhandled request error", {
    ...meta,
    error: errorMessage,
    stack: errorStack,
  });

  res.status(500).json({
    error: "Internal server error",
    message: errorMessage,
    stack: env.NODE_ENV === "production" ? errorStack : undefined,
  });
}
