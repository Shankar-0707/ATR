import { apiJson } from "./http.js";

export type JobRow = {
  id: string;
  user_id: string;
  queue_id: string;
  bull_job_id: string | null;
  type: string;
  payload: unknown;
  status: string;
  priority: number;
  attempts: number;
  max_attempts: number;
  result: unknown;
  error: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
};

export type JobsListResponse = {
  items: JobRow[];
  total: number;
  take: number;
  skip: number;
};

export function listJobs(take = 20, skip = 0) {
  const q = new URLSearchParams({
    take: String(take),
    skip: String(skip),
  });
  return apiJson<JobsListResponse>(`/api/jobs?${q}`);
}

export function getJob(id: string) {
  return apiJson<JobRow>(`/api/jobs/${id}`);
}

export function retryJob(id: string) {
  return apiJson<JobRow>(`/api/jobs/${id}/retry`, { method: "POST" });
}

export function removeJob(id: string) {
  return apiJson<{ ok: boolean; action: string }>(`/api/jobs/${id}`, {
    method: "DELETE",
  });
}

export function createSummariseText(text: string) {
  return apiJson<JobRow>("/api/jobs", {
    method: "POST",
    body: JSON.stringify({
      type: "summarise",
      payload: { source: "text", text },
    }),
  });
}

export function createSummarisePdf(file: File) {
  const fd = new FormData();
  fd.append("file", file);
  const base = import.meta.env.VITE_API_URL ?? "";
  return fetch(`${base}/api/jobs/summarise`, {
    method: "POST",
    body: fd,
    credentials: "include",
  }).then(async (res) => {
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(
        typeof (err as { error?: string }).error === "string"
          ? (err as { error: string }).error
          : res.statusText,
      );
    }
    return res.json() as Promise<JobRow>;
  });
}

export function createTranslateJob(
  text: string,
  targetLang: string,
  sourceLang?: string,
) {
  return apiJson<JobRow>("/api/jobs", {
    method: "POST",
    body: JSON.stringify({
      type: "translate",
      payload: {
        text,
        targetLang,
        ...(sourceLang ? { sourceLang } : {}),
      },
    }),
  });
}

export type ImageSize = "1024x1024" | "1792x1024" | "1024x1792";

export function createGenerateImageJob(prompt: string, size?: ImageSize) {
  return apiJson<JobRow>("/api/jobs", {
    method: "POST",
    body: JSON.stringify({
      type: "generate",
      payload: {
        prompt,
        ...(size ? { size } : {}),
      },
    }),
  });
}

export function createTranscribeAudio(file: File) {
  const fd = new FormData();
  fd.append("file", file);
  const base = import.meta.env.VITE_API_URL ?? "";
  return fetch(`${base}/api/jobs/transcribe`, {
    method: "POST",
    body: fd,
    credentials: "include",
  }).then(async (res) => {
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(
        typeof (err as { error?: string }).error === "string"
          ? (err as { error: string }).error
          : res.statusText,
      );
    }
    return res.json() as Promise<JobRow>;
  });
}
