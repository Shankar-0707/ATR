import OpenAI from "openai";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { publishJobUpdate } from "../lib/job-events.js";
import { env } from "../config/env.js";

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

const payloadSchema = z.object({
  text: z.string().min(1),
  targetLang: z.string().min(1),
  sourceLang: z.string().optional(),
});

export async function processTranslateJob(input: {
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
    progress: 20,
  });

  const system = `You are a professional translator. Translate the user's text into ${p.targetLang}. Output only the translation — no quotes, labels, or commentary.`;

  const userMsg = p.sourceLang
    ? `Source language: ${p.sourceLang}.\n\n${p.text}`
    : p.text;

  const res = await openai.chat.completions.create({
    model: env.OPENAI_TRANSLATION_MODEL,
    temperature: 0.2,
    max_tokens: 8192,
    messages: [
      { role: "system", content: system },
      { role: "user", content: userMsg },
    ],
  });

  const translated = res.choices[0]?.message?.content?.trim();
  if (!translated) {
    throw new Error("OpenAI returned empty translation");
  }

  const result = {
    translatedText: translated,
    targetLang: p.targetLang,
    sourceLang: p.sourceLang ?? null,
    model: env.OPENAI_TRANSLATION_MODEL,
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
