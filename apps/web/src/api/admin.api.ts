import { apiJson } from "./http.js";

export type AdminStats = {
  users: number;
  jobs: number;
  jobsByStatus: Record<string, number>;
  usageTotals: { completed: number; failed: number; dead: number };
};

export type AdminUserRow = {
  id: string;
  email: string;
  plan: string;
  created_at: string;
  _count: { jobs: number };
};

export type AdminJobRow = {
  id: string;
  user_id: string;
  type: string;
  status: string;
  created_at: string;
  error: string | null;
  user: { email: string; plan: string };
};

export function fetchAdminStats() {
  return apiJson<AdminStats>("/api/admin/stats");
}

export function fetchAdminUsers(take = 20, skip = 0) {
  const q = new URLSearchParams({ take: String(take), skip: String(skip) });
  return apiJson<{
    items: AdminUserRow[];
    total: number;
    take: number;
    skip: number;
  }>(`/api/admin/users?${q}`);
}

export function fetchAdminJobs(
  take = 20,
  skip = 0,
  status?: string,
  userId?: string,
) {
  const q = new URLSearchParams({ take: String(take), skip: String(skip) });
  if (status) {
    q.set("status", status);
  }
  if (userId) {
    q.set("userId", userId);
  }
  return apiJson<{
    items: AdminJobRow[];
    total: number;
    take: number;
    skip: number;
  }>(`/api/admin/jobs?${q}`);
}
