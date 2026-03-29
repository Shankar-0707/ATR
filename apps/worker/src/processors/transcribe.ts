import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { publishJobUpdate } from "../lib/job-events.js";
import { fetchBinaryFromCloudinaryUrl } from "../lib/cloudinary-fetch.js";
import { getGemini } from "../lib/gemini-client.js";
import { env } from "../config/env.js";

/** Inline audio limit for Gemini multimodal requests (~20 MiB). */
const MAX_INLINE_AUDIO_BYTES = 20 * 1024 * 1024;

const payloadSchema = z.object({
  source: z.literal("cloudinary"),
  publicId: z.string().min(1),
  secureUrl: z.string().url(),
  fileName: z.string(),
  mimeType: z.string(),
});

export async function processTranscribeJob(input: {
  dbJobId: string;
  userId: string;
  payload: unknown;
}): Promise<void> {
  const { dbJobId, userId } = input;
  const parsed = payloadSchema.parse(input.payload);

  await publishJobUpdate({
    jobId: dbJobId,
    userId,
    status: "active",
    progress: 10,
  });

  const buf = await fetchBinaryFromCloudinaryUrl(parsed.secureUrl);
  if (buf.length > MAX_INLINE_AUDIO_BYTES) {
    throw new Error(
      `Audio is too large for inline transcription (max ${MAX_INLINE_AUDIO_BYTES} bytes).`,
    );
  }

  await publishJobUpdate({
    jobId: dbJobId,
    userId,
    status: "active",
    progress: 40,
  });

  const mime = parsed.mimeType?.trim() || "audio/mpeg";
  const ai = getGemini();
  const res = await ai.models.generateContent({
    model: env.GEMINI_TRANSCRIPTION_MODEL,
    contents: [
      {
        inlineData: {
          mimeType: mime,
          data: buf.toString("base64"),
        },
      },
      "Transcribe this audio verbatim. Output only the spoken words, with no labels or commentary.",
    ],
    config: {
      temperature: 0,
      maxOutputTokens: 8192,
    },
  });

  const text = res.text?.trim() ?? "";

  if (!String(text).trim()) {
    throw new Error("Transcription was empty");
  }

  const result = {
    transcript: String(text).trim(),
    model: env.GEMINI_TRANSCRIPTION_MODEL,
    source: "cloudinary" as const,
  };

  await prisma.job.update({
    where: { id: dbJobId },
    data: {
      status: "completed",
      completed_at: new Date(),
      result,
      error: null,
    },
  });

  await publishJobUpdate({
    jobId: dbJobId,
    userId,
    status: "completed",
    progress: 100,
    result,
  });
}
