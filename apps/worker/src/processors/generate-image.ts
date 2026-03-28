import OpenAI from "openai";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { publishJobUpdate } from "../lib/job-events.js";
import { env } from "../config/env.js";

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

const sizeEnum = z.enum(["1024x1024", "1792x1024", "1024x1792"]);

const payloadSchema = z.object({
  prompt: z.string().min(1),
  size: sizeEnum.optional(),
});

export async function processGenerateImageJob(input: {
  dbJobId: string;
  userId: string;
  payload: unknown;
}): Promise<void> {
  const { dbJobId, userId } = input;
  const p = payloadSchema.parse(input.payload);

  await publishJobUpdate({
    jobId: dbJobId,
    userId,
    status: "active",
    progress: 15,
  });

  const size = p.size ?? env.OPENAI_IMAGE_SIZE;

  const res = await openai.images.generate({
    model: env.OPENAI_IMAGE_MODEL,
    prompt: p.prompt,
    n: 1,
    size,
    response_format: "url",
  });

  const item = res.data?.[0];
  const url = item?.url;
  if (!url) {
    throw new Error("OpenAI returned no image URL");
  }

  const result = {
    imageUrl: url,
    revisedPrompt: item?.revised_prompt ?? null,
    size,
    model: env.OPENAI_IMAGE_MODEL,
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
