import { z } from "zod";

const imageSizes = z.enum(["1024x1024", "1792x1024", "1024x1792"]);

const schema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  LOG_LEVEL: z
    .enum(["error", "warn", "info", "http", "verbose", "debug", "silly"])
    .default("info"),
  DATABASE: z.string().min(1, "DATABASE is required"),
  REDIS_URL: z.string().min(1, "REDIS_URL is required"),
  SENTRY_DSN: z.string().trim().min(1).optional(),
  GEMINI_API_KEY: z.string().min(1, "GEMINI_API_KEY is required"),
  GEMINI_MODEL: z.string().optional(),
  GEMINI_TRANSLATION_MODEL: z.string().optional(),
  GEMINI_IMAGE_MODEL: z.string().optional(),
  GEMINI_IMAGE_SIZE: z.string().optional(),
  GEMINI_TRANSCRIPTION_MODEL: z.string().optional(),
  CLOUDINARY_CLOUD_NAME: z.string().min(1, "CLOUDINARY_CLOUD_NAME is required"),
  CLOUDINARY_API_KEY: z.string().min(1, "CLOUDINARY_API_KEY is required"),
  CLOUDINARY_API_SECRET: z.string().min(1, "CLOUDINARY_API_SECRET is required"),
  PORT: z.coerce.number().default(3001),
  BULL_JOB_DELAY_MS: z.coerce.number().min(0).optional(),
});

const parsed = schema.parse(process.env);

const defaultModel = parsed.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
const imageSizeRaw = parsed.GEMINI_IMAGE_SIZE?.trim() || "1024x1024";
const imageSizeParsed = imageSizes.safeParse(imageSizeRaw);

export const env = {
  ...parsed,
  BULL_JOB_DELAY_MS: parsed.BULL_JOB_DELAY_MS ?? (parsed.NODE_ENV === "production" ? 0 : 2000),
  GEMINI_MODEL: defaultModel,
  GEMINI_TRANSLATION_MODEL:
    parsed.GEMINI_TRANSLATION_MODEL?.trim() || defaultModel,
  GEMINI_IMAGE_MODEL:
    parsed.GEMINI_IMAGE_MODEL?.trim() || "gemini-2.5-flash-image",
  GEMINI_IMAGE_SIZE: imageSizeParsed.success
    ? imageSizeParsed.data
    : "1024x1024",
  GEMINI_TRANSCRIPTION_MODEL:
    parsed.GEMINI_TRANSCRIPTION_MODEL?.trim() || defaultModel,
};
