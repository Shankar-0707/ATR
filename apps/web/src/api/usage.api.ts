import { apiJson } from "./http.js";

export type UsageSnapshot = {
  plan: string;
  utcDay: string;
  jobsCreatedToday: number;
  dailyJobLimit: number;
  perMinuteJobLimit: number;
  jobsInProgress: number;
  maxConcurrentJobs: number;
  outcomesToday: {
    completed: number;
    failed: number;
    dead: number;
  };
};

export function fetchUsage() {
  return apiJson<UsageSnapshot>("/api/usage");
}
