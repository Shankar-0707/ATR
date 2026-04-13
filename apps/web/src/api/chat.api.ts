import { apiJson } from "./http.js";

export type ChatIntentResponse = {
  jobType: "summarise" | "transcribe" | "translate" | "generate" | "unknown";
  needsFile: boolean;
  targetLang?: string;
  sourceLang?: string;
  prompt?: string;
  message: string;
};

export function sendChatMessage(message: string) {
  return apiJson<ChatIntentResponse>("/api/chat/message", {
    method: "POST",
    body: JSON.stringify({ message }),
  });
}
