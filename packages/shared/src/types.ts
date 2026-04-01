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

export type UpgradeRequestStatus = "pending" | "approved" | "rejected";

/** Redis → Socket.io job notification (worker publishes, API forwards). */
export type JobUpdatePayload = {
  jobId: string;
  userId: string;
  status: JobStatus;
  progress?: number;
  error?: string | null;
  result?: unknown;
};

/** Redis → Socket.io upgrade request notification */
export type UpgradeRequestUpdatePayload = {
  requestId: string;
  userId: string;
  status: UpgradeRequestStatus;
  targetPlan: string;
};
