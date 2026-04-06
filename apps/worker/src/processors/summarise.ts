import { createRequire } from "node:module";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { publishJobUpdate } from "../lib/job-events.js";
import { fetchBinaryFromCloudinaryUrl } from "../lib/cloudinary-fetch.js";
import { getGemini } from "../lib/gemini-client.js";
import { env } from "../config/env.js";

const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse") as (
  data: Buffer,
) => Promise<{ text: string }>;

const payloadSchema = z.discriminatedUnion("source", [
  z.object({
    source: z.literal("text"),
    text: z.string().min(1),
  }),
  z.object({
    source: z.literal("cloudinary"),
    publicId: z.string().min(1),
    secureUrl: z.string().url(),
    fileName: z.string(),
    mimeType: z.string(),
  }),
]);

const CHUNK_SIZE = 12_000;
const CHUNK_OVERLAP = 200;

function chunkText(text: string): string[] {
  const t = text.trim();
  if (t.length <= CHUNK_SIZE) {
    return [t];
  }
  const chunks: string[] = [];
  let i = 0;
  while (i < t.length) {
    const end = Math.min(i + CHUNK_SIZE, t.length);
    chunks.push(t.slice(i, end));
    if (end === t.length) {
      break;
    }
    i = end - CHUNK_OVERLAP;
  }
  return chunks;
}

async function completeSummary(
  userContent: string,
  instruction: string,
): Promise<string> {
  const ai = getGemini();
  const res = await ai.models.generateContent({
    model: env.GEMINI_MODEL,
    contents: `${instruction}\n\n---\n\n${userContent}`,
    config: {
      systemInstruction:
        "You are a precise assistant. Output clear Markdown. Be faithful to the source; do not invent facts.",
      temperature: 0.3,
      maxOutputTokens: 8192,
    },
  });
  const out = res.text?.trim();
  if (!out) {
    throw new Error("Gemini returned empty summary");
  }
  return out;
}

async function summariseLongText(
  text: string,
  reportProgress: (pct: number) => Promise<void>,
): Promise<string> {
  const chunks = chunkText(text);
  if (chunks.length === 1) {
    await reportProgress(55);
    return completeSummary(
      chunks[0]!,
      "Summarize the following text in well-structured Markdown (headings, bullets where helpful).",
    );
  }
  const partials: string[] = [];
  for (let idx = 0; idx < chunks.length; idx++) {
    const chunk = chunks[idx]!;
    const part = await completeSummary(
      chunk,
      "Summarize this section in short bullet points (Markdown). Capture key facts only.",
    );
    partials.push(`### Part ${idx + 1}\n${part}`);
    const pct = 45 + Math.round((40 * (idx + 1)) / chunks.length);
    await reportProgress(Math.min(pct, 85));
  }
  const merged = partials.join("\n\n");
  await reportProgress(88);
  return completeSummary(
    merged,
    "Produce one consolidated summary in Markdown from these partial summaries. Remove duplication; preserve structure.",
  );
}

async function summarisePdfWithGemini(buf: Buffer): Promise<string> {
  const ai = getGemini();
  const res = await ai.models.generateContent({
    model: env.GEMINI_MODEL,
    contents: [
      {
        inlineData: {
          mimeType: "application/pdf",
          data: buf.toString("base64"),
        },
      },
      "Summarize this PDF in well-structured Markdown. Use headings and bullets where helpful. Be faithful to the document and do not invent facts.",
    ],
    config: {
      systemInstruction:
        "You are a precise assistant. Output clear Markdown. Be faithful to the source; do not invent facts.",
      temperature: 0.3,
      maxOutputTokens: 8192,
    },
  });
  const out = res.text?.trim();
  if (!out) {
    throw new Error("Gemini returned empty summary");
  }
  return out;
}

export async function processSummariseJob(input: {
  dbJobId: string;
  userId: string;
  payload: unknown;
}): Promise<void> {
  const { dbJobId, userId } = input;
  const parsed = payloadSchema.parse(input.payload);

  const report = async (progress: number) => {
    await publishJobUpdate({
      jobId: dbJobId,
      userId,
      status: "active",
      progress,
    });
  };

  await report(5);

  let text = "";
  let summaryFromPdf: string | null = null;
  let source: "text" | "cloudinary";

  if (parsed.source === "text") {
    text = parsed.text;
    source = "text";
  } else {
    await report(15);
    const buf = await fetchBinaryFromCloudinaryUrl(parsed.secureUrl);
    source = "cloudinary";
    try {
      const parsedPdf = await pdfParse(buf);
      text = parsedPdf.text?.trim() ?? "";
    } catch {
      text = "";
    }
    if (!text) {
      await report(35);
      summaryFromPdf = await summarisePdfWithGemini(buf);
    }
  }

  if (!text.trim() && !summaryFromPdf) {
    throw new Error("No extractable text (empty document or unreadable PDF)");
  }

  let summary: string;
  if (summaryFromPdf) {
    summary = summaryFromPdf;
  } else {
    await report(35);
    summary = await summariseLongText(text, report);
  }

  await report(95);

  const result = {
    summary,
    model: env.GEMINI_MODEL,
    source,
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
