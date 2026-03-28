import { z } from "zod";

const imageSizes = z.enum(["1024x1024", "1792x1024", "1024x1792"]);

const schema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  DATABASE: z.string().min(1, "DATABASE is required"),
  REDIS_URL: z.string().min(1, "REDIS_URL is required"),
  OPENAI_API_KEY: z.string().min(1, "OPENAI_API_KEY is required"),
  OPENAI_MODEL: z.string().optional(),
  OPENAI_TRANSLATION_MODEL: z.string().optional(),
  OPENAI_IMAGE_MODEL: z.string().optional(),
  OPENAI_IMAGE_SIZE: z.string().optional(),
  OPENAI_TRANSCRIPTION_MODEL: z.string().optional(),
  /** Used to validate `secure_url` from job payloads before fetch (SSRF guard). */
  CLOUDINARY_CLOUD_NAME: z
    .string()
    .min(1, "CLOUDINARY_CLOUD_NAME is required"),
});

const parsed = schema.parse(process.env);

const defaultModel = parsed.OPENAI_MODEL?.trim() || "gpt-4o-mini";
const imageSizeRaw = parsed.OPENAI_IMAGE_SIZE?.trim() || "1024x1024";
const imageSizeParsed = imageSizes.safeParse(imageSizeRaw);

export const env = {
  ...parsed,
  OPENAI_MODEL: defaultModel,
  OPENAI_TRANSLATION_MODEL:
    parsed.OPENAI_TRANSLATION_MODEL?.trim() || defaultModel,
  OPENAI_IMAGE_MODEL: parsed.OPENAI_IMAGE_MODEL?.trim() || "dall-e-3",
  OPENAI_IMAGE_SIZE: imageSizeParsed.success
    ? imageSizeParsed.data
    : "1024x1024",
  OPENAI_TRANSCRIPTION_MODEL:
    parsed.OPENAI_TRANSCRIPTION_MODEL?.trim() || "whisper-1",
};
