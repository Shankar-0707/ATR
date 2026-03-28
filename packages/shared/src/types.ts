/** Shared domain types for API, worker, and web (requirements §5 packages/shared). */

export type JobType =
  | "summarise"
  | "transcribe"
  | "generate"
  | "translate";

export type JobStatus =
  | "pending"
  | "active"
  | "completed"
  | "failed"
  | "dead";

export type UserPlan = "free" | "pro" | "admin";

export type LogLevel = "info" | "warn" | "error";

/** Redis → Socket.io job notification (worker publishes, API forwards). */
export type JobUpdatePayload = {
  jobId: string;
  userId: string;
  status: JobStatus;
  progress?: number;
  error?: string | null;
  result?: unknown;
};
