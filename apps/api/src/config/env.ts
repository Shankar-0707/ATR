import { z } from "zod";

const schema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  LOG_LEVEL: z
    .enum(["error", "warn", "info", "http", "verbose", "debug", "silly"])
    .default("info"),
  PORT: z.coerce.number().default(3001),
  DATABASE: z.string().min(1, "DATABASE is required"),
  REDIS_URL: z.string().min(1, "REDIS_URL is required"),
  JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 characters"),
  SENTRY_DSN: z.string().trim().min(1).optional(),
  /** When true, auth cookie sets `Secure` (HTTPS). Set `COOKIE_SECURE=true` in production. */
  COOKIE_SECURE: z.preprocess(
    (val) => val === "true" || val === true,
    z.boolean(),
  ).default(false),
  CORS_ORIGIN: z.string().optional(),
  /** Gemini API key — used by the chat intent-parsing service. */
  GEMINI_API_KEY: z.string().min(1, "GEMINI_API_KEY is required"),
  /** Which Gemini model to use for intent parsing. Defaults to gemini-2.5-flash. */
  GEMINI_MODEL: z.string().optional(),
  /**
   * Milliseconds before BullMQ delivers the job to the worker (DB stays `pending` until then).
   * If unset: 2000ms when NODE_ENV is not `production`, else 0. Set to `0` in `.env` to disable.
   */
  BULL_JOB_DELAY_MS: z.coerce.number().min(0).optional(),
  /** Cloudinary — PDF uploads as `raw` (Phase 2). */
  CLOUDINARY_CLOUD_NAME: z.string().min(1, "CLOUDINARY_CLOUD_NAME is required"),
  CLOUDINARY_API_KEY: z.string().min(1, "CLOUDINARY_API_KEY is required"),
  CLOUDINARY_API_SECRET: z.string().min(1, "CLOUDINARY_API_SECRET is required"),

  // --- Phase 4: rate limits & plans (optional — defaults below) ---
  RATE_LIMIT_FREE_JOBS_PER_DAY: z.coerce.number().min(1).optional(),
  RATE_LIMIT_PRO_JOBS_PER_DAY: z.coerce.number().min(1).optional(),
  RATE_LIMIT_ADMIN_JOBS_PER_DAY: z.coerce.number().min(1).optional(),
  RATE_LIMIT_FREE_JOBS_PER_MINUTE: z.coerce.number().min(1).optional(),
  RATE_LIMIT_PRO_JOBS_PER_MINUTE: z.coerce.number().min(1).optional(),
  RATE_LIMIT_ADMIN_JOBS_PER_MINUTE: z.coerce.number().min(1).optional(),
  MAX_CONCURRENT_JOBS_FREE: z.coerce.number().min(1).optional(),
  MAX_CONCURRENT_JOBS_PRO: z.coerce.number().min(1).optional(),
  MAX_CONCURRENT_JOBS_ADMIN: z.coerce.number().min(1).optional(),
  MAX_ATTEMPTS_FREE: z.coerce.number().min(1).optional(),
  MAX_ATTEMPTS_PRO: z.coerce.number().min(1).optional(),
  MAX_ATTEMPTS_ADMIN: z.coerce.number().min(1).optional(),
  /** If true, free-plan users cannot enqueue `generate` jobs (403). */
  FREE_PLAN_BLOCK_GENERATE: z.preprocess(
    (val) => val === "true" || val === true,
    z.boolean(),
  ).optional(),
  /** Dedup window for identical JSON payloads (seconds). 0 = disabled. */
  DEDUP_WINDOW_SECONDS: z.coerce.number().min(0).optional(),
});

const parsed = schema.parse(process.env);

/** BullMQ `delay` option — must be a finite integer or BullMQ skips delayed scheduling (see scripts.js addJob). */
function bullJobDelayMs(): number {
  const raw = parsed.BULL_JOB_DELAY_MS;
  if (raw !== undefined && raw !== null) {
    const n = Number(raw);
    if (Number.isFinite(n) && n >= 0) {
      return Math.floor(n);
    }
  }
  return parsed.NODE_ENV === "production" ? 0 : 2000;
}

/** Validated env — `load-env.ts` runs before this module loads. */
export const env = {
  ...parsed,
  bullJobDelayMs: bullJobDelayMs(),
  rateLimitFreeJobsPerDay: parsed.RATE_LIMIT_FREE_JOBS_PER_DAY ?? 30,
  rateLimitProJobsPerDay: parsed.RATE_LIMIT_PRO_JOBS_PER_DAY ?? 500,
  rateLimitAdminJobsPerDay: parsed.RATE_LIMIT_ADMIN_JOBS_PER_DAY ?? 100_000,
  rateLimitFreeJobsPerMinute: parsed.RATE_LIMIT_FREE_JOBS_PER_MINUTE ?? 5,
  rateLimitProJobsPerMinute: parsed.RATE_LIMIT_PRO_JOBS_PER_MINUTE ?? 60,
  rateLimitAdminJobsPerMinute: parsed.RATE_LIMIT_ADMIN_JOBS_PER_MINUTE ?? 5_000,
  maxConcurrentJobsFree: parsed.MAX_CONCURRENT_JOBS_FREE ?? 5,
  maxConcurrentJobsPro: parsed.MAX_CONCURRENT_JOBS_PRO ?? 25,
  maxConcurrentJobsAdmin: parsed.MAX_CONCURRENT_JOBS_ADMIN ?? 500,
  maxAttemptsFree: parsed.MAX_ATTEMPTS_FREE ?? 3,
  maxAttemptsPro: parsed.MAX_ATTEMPTS_PRO ?? 5,
  maxAttemptsAdmin: parsed.MAX_ATTEMPTS_ADMIN ?? 10,
  freePlanBlockGenerate: parsed.FREE_PLAN_BLOCK_GENERATE ?? false,
  dedupWindowSeconds: parsed.DEDUP_WINDOW_SECONDS ?? 120,
  GEMINI_MODEL: parsed.GEMINI_MODEL?.trim() || "gemini-2.5-flash",
};

export type Env = typeof env;
