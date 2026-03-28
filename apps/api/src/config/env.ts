import { z } from "zod";

const schema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().default(3001),
  DATABASE: z.string().min(1, "DATABASE is required"),
  REDIS_URL: z.string().min(1, "REDIS_URL is required"),
  JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 characters"),
  /** When true, auth cookie sets `Secure` (HTTPS). Set `COOKIE_SECURE=true` in production. */
  COOKIE_SECURE: z.preprocess(
    (val) => val === "true" || val === true,
    z.boolean(),
  ).default(false),
  CORS_ORIGIN: z.string().optional(),
  /**
   * Milliseconds before BullMQ delivers the job to the worker (DB stays `pending` until then).
   * If unset: 2000ms when NODE_ENV is not `production`, else 0. Set to `0` in `.env` to disable.
   */
  BULL_JOB_DELAY_MS: z.coerce.number().min(0).optional(),
  /** Cloudinary — PDF uploads as `raw` (Phase 2). */
  CLOUDINARY_CLOUD_NAME: z.string().min(1, "CLOUDINARY_CLOUD_NAME is required"),
  CLOUDINARY_API_KEY: z.string().min(1, "CLOUDINARY_API_KEY is required"),
  CLOUDINARY_API_SECRET: z.string().min(1, "CLOUDINARY_API_SECRET is required"),
});

export type Env = z.infer<typeof schema> & { bullJobDelayMs: number };

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
export const env = { ...parsed, bullJobDelayMs: bullJobDelayMs() };
