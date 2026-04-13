import { GoogleGenAI, Type, Schema } from "@google/genai";
import { env } from "../../config/env.js";

let client: GoogleGenAI | null = null;
function getGemini(): GoogleGenAI {
  if (!client) {
    client = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  }
  return client;
}

export type ParsedIntent = {
  jobType: "summarise" | "transcribe" | "translate" | "generate" | "unknown";
  needsFile: boolean;
  targetLang?: string;
  sourceLang?: string;
  prompt?: string;
  message: string;
};

const intentSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    jobType: {
      type: Type.STRING,
      description: 'The type of job the user wants to run. Must be one of: "summarise", "transcribe", "translate", "generate", or "unknown" if out of scope.',
    },
    needsFile: {
      type: Type.BOOLEAN,
      description: 'True if the requested job type requires a file upload (summarise or transcribe). False for translate and generate.',
    },
    targetLang: {
      type: Type.STRING,
      description: 'For translate jobs only: The requested target language.',
    },
    sourceLang: {
      type: Type.STRING,
      description: 'For translate jobs only: The requested source language, if mentioned.',
    },
    prompt: {
      type: Type.STRING,
      description: 'For generate image jobs only: The description of the image to generate.',
    },
    message: {
      type: Type.STRING,
      description: 'A friendly, brief conversational reply from the assistant acknowledging the user.',
    },
  },
  required: ["jobType", "needsFile", "message"],
};

export async function parseUserIntent(userMessage: string): Promise<ParsedIntent> {
  const ai = getGemini();

  const systemInstruction = `You are the TaskPilot assistant. TaskPilot is an AI job runner that can do ONLY these 4 tasks:
1. summarise — Summarize a PDF or text
2. transcribe — Transcribe an audio file (mp3, wav, m4a, etc)
3. translate — Translate text to another language
4. generate — Generate an image from a text prompt

Your ONLY job is to detect which of these tasks the user wants to execute from their message, and extract any parameters.

Rules:
- If the user asks for anything outside these 4 tasks, set jobType to "unknown" and tell them what you can do in the message.
- For "summarise" and "transcribe", "needsFile" must be true.
- Always respond in JSON matching the schema.
- Be friendly, brief, and professional in the "message" field.
- If it's a translate task, extract "targetLang", and "sourceLang" (if specified).
- If it's a generate task, extract the image description into "prompt".`;

  const res = await ai.models.generateContent({
    model: env.GEMINI_MODEL,
    contents: userMessage,
    config: {
      systemInstruction,
      temperature: 0.1,
      responseMimeType: "application/json",
      responseSchema: intentSchema,
    },
  });

  const text = res.text?.trim();
  if (!text) {
    return {
      jobType: "unknown",
      needsFile: false,
      message: "I'm having trouble understanding right now. Please try again.",
    };
  }

  try {
    const parsed = JSON.parse(text) as ParsedIntent;
    
    // Safety check map
    const validJobs = ["summarise", "transcribe", "translate", "generate", "unknown"];
    if (!validJobs.includes(parsed.jobType)) {
      parsed.jobType = "unknown";
    }

    return parsed;
  } catch (err) {
    return {
      jobType: "unknown",
      needsFile: false,
      message: "I didn't quite catch that. Could you rephrase your request?",
    };
  }
}
