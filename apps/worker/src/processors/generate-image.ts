import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { publishJobUpdate } from "../lib/job-events.js";
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
  const [widthStr, heightStr] = size.split("x");
  const width = parseInt(widthStr, 10) || 1024;
  const height = parseInt(heightStr, 10) || 1024;
  
  // Use Pollinations AI for reliable high-quality image generation without API quota limits
  const encodedPrompt = encodeURIComponent(p.prompt);
  const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&nologo=true`;

  const pollRes = await fetch(url);
  if (!pollRes.ok) {
    throw new Error(`Pollinations AI failed to generate image: ${pollRes.statusText}`);
  }
  const buffer = await pollRes.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");
  const dataUrl = `data:image/jpeg;base64,${base64}`;

  const result = {
    imageUrl: dataUrl,
    revisedPrompt: null as string | null,
    size,
    model: "pollinations-ai-flux",
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
