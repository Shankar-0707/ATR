import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { publishJobUpdate } from "../lib/job-events.js";
import { getGemini } from "../lib/gemini-client.js";
import { env } from "../config/env.js";

const sizeEnum = z.enum(["1024x1024", "1792x1024", "1024x1792"]);

const payloadSchema = z.object({
  prompt: z.string().min(1),
  size: sizeEnum.optional(),
});

function sizeToAspectRatio(
  size: "1024x1024" | "1792x1024" | "1024x1792",
): string {
  switch (size) {
    case "1024x1024":
      return "1:1";
    case "1792x1024":
      return "16:9";
    case "1024x1792":
      return "9:16";
    default:
      return "1:1";
  }
}

function firstImageDataUrl(response: {
  candidates?: Array<{
    content?: { parts?: Array<{ inlineData?: { data?: string; mimeType?: string } }> };
  }>;
}): string | undefined {
  const parts = response.candidates?.[0]?.content?.parts;
  if (!parts) {
    return undefined;
  }
  for (const part of parts) {
    const id = part.inlineData;
    if (id?.data && id.mimeType?.startsWith("image/")) {
      return `data:${id.mimeType};base64,${id.data}`;
    }
  }
  return undefined;
}

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

  const size = p.size ?? env.GEMINI_IMAGE_SIZE;
  const aspectRatio = sizeToAspectRatio(size);
  const ai = getGemini();

  const res = await ai.models.generateContent({
    model: env.GEMINI_IMAGE_MODEL,
    contents: p.prompt,
    config: {
      // Image-only output avoids extra text tokens; preview-* image models often have free-tier quota 0.
      responseModalities: ["IMAGE"],
      imageConfig: { aspectRatio },
    },
  });

  const url = firstImageDataUrl(res);
  if (!url) {
    throw new Error("Gemini returned no image data");
  }

  const result = {
    imageUrl: url,
    revisedPrompt: null as string | null,
    size,
    model: env.GEMINI_IMAGE_MODEL,
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
