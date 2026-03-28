import { z } from "zod";

/**
 * JSON job creation — `summarise` (text), `translate`, `generate` (image prompt).
 * `transcribe` uses `POST /api/jobs/transcribe` with multipart only (not this schema).
 */
export const createJobBodySchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("summarise"),
    payload: z.object({
      source: z.literal("text"),
      text: z.string().min(1).max(500_000),
    }),
  }),
  z.object({
    type: z.literal("translate"),
    payload: z.object({
      text: z.string().min(1).max(100_000),
      /** BCP-47 or plain language name, e.g. `fr`, `French` */
      targetLang: z.string().min(2).max(32),
      sourceLang: z.string().min(2).max(32).optional(),
    }),
  }),
  z.object({
    type: z.literal("generate"),
    payload: z.object({
      prompt: z.string().min(1).max(4000),
      size: z.enum(["1024x1024", "1792x1024", "1024x1792"]).optional(),
    }),
  }),
]);
