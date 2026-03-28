import { extname } from "node:path";
import OpenAI from "openai";
import { toFile } from "openai/uploads";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { publishJobUpdate } from "../lib/job-events.js";
import { fetchBinaryFromCloudinaryUrl } from "../lib/cloudinary-fetch.js";
import { env } from "../config/env.js";

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

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
  const ext = extname(parsed.fileName) || ".mp3";
  const file = await toFile(buf, `input${ext}`);

  await publishJobUpdate({
    jobId: dbJobId,
    userId,
    status: "active",
    progress: 40,
  });

  const tr = await openai.audio.transcriptions.create({
    file,
    model: env.OPENAI_TRANSCRIPTION_MODEL,
  });

  const text = tr.text ?? "";

  if (!String(text).trim()) {
    throw new Error("Transcription was empty");
  }

  const result = {
    transcript: String(text).trim(),
    model: env.OPENAI_TRANSCRIPTION_MODEL,
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
