import { z } from "zod";

const imageSizes = z.enum(["1024x1024", "1792x1024", "1024x1792"]);

const schema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  DATABASE: z.string().min(1, "DATABASE is required"),
  REDIS_URL: z.string().min(1, "REDIS_URL is required"),
  GEMINI_API_KEY: z.string().min(1, "GEMINI_API_KEY is required"),
  GEMINI_MODEL: z.string().optional(),
  GEMINI_TRANSLATION_MODEL: z.string().optional(),
  GEMINI_IMAGE_MODEL: z.string().optional(),
  GEMINI_IMAGE_SIZE: z.string().optional(),
  GEMINI_TRANSCRIPTION_MODEL: z.string().optional(),
  CLOUDINARY_CLOUD_NAME: z
    .string()
    .min(1, "CLOUDINARY_CLOUD_NAME is required"),
});

const parsed = schema.parse(process.env);

const defaultModel = parsed.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
const imageSizeRaw = parsed.GEMINI_IMAGE_SIZE?.trim() || "1024x1024";
const imageSizeParsed = imageSizes.safeParse(imageSizeRaw);

export const env = {
  ...parsed,
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
