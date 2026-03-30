import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import * as adminApi from "../api/admin.api.js";
import {
  Users, Rocket, CheckCircle2, Loader2, Clock, XCircle,
  ChevronLeft, ChevronRight, Filter, Terminal, TrendingUp,
} from "lucide-react";

function PlanBadge({ plan }: { plan: string }) {
  const cfg: Record<string, string> = {
    pro:   "text-indigo-300 border-indigo-500/40 bg-indigo-500/10",
    free:  "text-gray-400 border-gray-600/40 bg-gray-500/10",
    admin: "text-purple-300 border-purple-500/40 bg-purple-500/10",
  };
  return (
    <span className={`text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded border ${cfg[plan] ?? cfg.free}`}>
      {plan}
    </span>
  );
}

function StatusDot({ status }: { status: string }) {
  const cfg: Record<string, { color: string; label: string }> = {
    completed: { color: "bg-emerald-500", label: "Completed" },
    active:    { color: "bg-blue-500",    label: "Active" },
    pending:   { color: "bg-gray-500",    label: "Pending" },
    failed:    { color: "bg-red-500",     label: "Failed" },
    dead:      { color: "bg-rose-700",    label: "Dead" },
  };
  const c = cfg[status] ?? cfg.pending;
  return (
    <span className="flex items-center gap-1.5 text-xs text-gray-400">
      <span className={`w-1.5 h-1.5 rounded-full ${c.color}`} />
      {c.label}
    </span>
  );
}

export function Admin() {
  const { user } = useAuth();
  const [userPage, setUserPage] = useState(0);
  const [jobPage, setJobPage] = useState(0);
  const [jobStatus, setJobStatus] = useState("");
  const PAGE = 5;

  const stats = useQuery({ queryKey: ["admin", "stats"], queryFn: adminApi.fetchAdminStats, enabled: user?.plan === "admin" });
  const users = useQuery({ queryKey: ["admin", "users", userPage], queryFn: () => adminApi.fetchAdminUsers(PAGE, userPage * PAGE), enabled: user?.plan === "admin" });
  const jobs  = useQuery({ queryKey: ["admin", "jobs", jobPage, jobStatus], queryFn: () => adminApi.fetchAdminJobs(PAGE, jobPage * PAGE, jobStatus || undefined), enabled: user?.plan === "admin" });

  if (user?.plan !== "admin") return <Navigate to="/" replace />;

  const s = stats.data;
  const byStatus = s?.jobsByStatus ?? {};

  return (
    <div className="px-8 py-8 max-w-5xl">
      {/* Breadcrumb */}
      <p className="text-xs text-gray-600 mb-6">
        Platform <span className="mx-1 text-gray-700">›</span>
        <span className="text-gray-400">Admin Control</span>
      </p>

      <h1 className="text-3xl font-bold text-white tracking-tight mb-8">System Oversight</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {/* Active infra */}
        <div className="bg-[#161b22] border border-white/5 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[10px] uppercase tracking-widest text-gray-500">Active Infrastructure</p>
            <Users size={18} className="text-gray-600" />
          </div>
          <p className="text-4xl font-bold text-white">{s ? s.users.toLocaleString() : "—"}</p>
          <p className="text-xs text-emerald-400 flex items-center gap-1 mt-1">
            <TrendingUp size={11} /> +12% from last month
          </p>
        </div>

        {/* Total executions */}
        <div className="bg-[#161b22] border border-white/5 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[10px] uppercase tracking-widest text-gray-500">Total Executions</p>
            <Rocket size={18} className="text-gray-600" />
          </div>
          <p className="text-4xl font-bold text-white">{s ? s.jobs.toLocaleString() : "—"}</p>
          <p className="text-xs text-gray-500 mt-1">Platform wide history</p>
        </div>

        {/* Status distribution */}
        <div className="bg-[#161b22] border border-white/5 rounded-2xl p-5">
          <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-4">Status Distribution</p>
          <div className="space-y-2">
            {[
              { key: "completed", label: "Completed", color: "text-emerald-400" },
              { key: "active",    label: "Active",    color: "text-blue-400" },
              { key: "pending",   label: "Pending",   color: "text-gray-400" },
              { key: "failed",    label: "Failed / Dead", color: "text-red-400" },
            ].map(({ key, label, color }) => (
              <div key={key} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-gray-400">
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    key === "completed" ? "bg-emerald-500" :
                    key === "active" ? "bg-blue-500" :
                    key === "pending" ? "bg-gray-500" : "bg-red-500"
                  }`} />
                  {label}
                </span>
                <span className={`font-bold ${color}`}>
                  {key === "failed"
                    ? ((byStatus.failed ?? 0) + (byStatus.dead ?? 0))
                    : (byStatus[key] ?? 0)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Users table */}
      <div className="bg-[#161b22] border border-white/5 rounded-2xl mb-6 overflow-hidden">
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-white">Platform Users</h2>
            <p className="text-xs text-gray-500 mt-0.5">Manage and monitor accounts</p>
          </div>
          <Filter size={16} className="text-gray-600" />
        </div>

        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5">
              {["User Email", "Subscription Plan", "Job Count", "Join Date", "Actions"].map(h => (
                <th key={h} className="px-6 py-3 text-left text-[10px] uppercase tracking-widest text-gray-600 font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i}><td colSpan={5} className="px-6 py-4"><div className="h-5 rounded shimmer" /></td></tr>
              ))
            ) : users.data?.items.map((u) => (
              <tr key={u.id} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                      {u.email[0].toUpperCase()}
                    </div>
                    <span className="text-sm text-gray-300">{u.email}</span>
                  </div>
                </td>
                <td className="px-6 py-4"><PlanBadge plan={u.plan} /></td>
                <td className="px-6 py-4 text-sm text-gray-400">{u._count.jobs}</td>
                <td className="px-6 py-4 text-xs text-gray-600">{new Date(u.created_at).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })}</td>
                <td className="px-6 py-4">
                  <button className="text-xs text-gray-600 hover:text-indigo-400 transition-colors">View</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="px-6 py-3 border-t border-white/5 flex items-center justify-between text-xs text-gray-600">
          <span>Showing {users.data?.items.length ?? 0} of {users.data?.total ?? 0} users</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setUserPage(p => Math.max(0, p - 1))} disabled={userPage === 0}
              className="p-1 rounded hover:bg-white/5 disabled:opacity-30 transition-all">
              <ChevronLeft size={14} />
            </button>
            <button onClick={() => setUserPage(p => p + 1)} disabled={!users.data || (userPage + 1) * PAGE >= users.data.total}
              className="px-3 py-1 rounded bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/40 disabled:opacity-30 transition-all">
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Jobs table */}
      <div className="bg-[#161b22] border border-white/5 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-white">Global Job Logs</h2>
            <p className="text-xs text-gray-500 mt-0.5">Real-time oversight of all AI processes</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-[10px] text-emerald-400 border border-emerald-500/30 bg-emerald-500/10 rounded-full px-2.5 py-1 uppercase tracking-widest font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 pulse-dot" />
              All Systems Nominal
            </span>
            <span className="text-[10px] text-gray-600 border border-white/8 rounded-full px-2.5 py-1">Latency: 14ms</span>
            <select
              value={jobStatus}
              onChange={e => { setJobStatus(e.target.value); setJobPage(0); }}
              className="bg-[#0d1117] border border-white/8 rounded-lg px-2 py-1 text-xs text-gray-400 focus:outline-none focus:border-indigo-500/50"
            >
              <option value="">All statuses</option>
              {["pending","active","completed","failed","dead"].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5">
              {["Job Type", "Status", "User Email", "Timestamp", "Console"].map(h => (
                <th key={h} className="px-6 py-3 text-left text-[10px] uppercase tracking-widest text-gray-600 font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {jobs.isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i}><td colSpan={5} className="px-6 py-4"><div className="h-5 rounded shimmer" /></td></tr>
              ))
            ) : jobs.data?.items.map((j) => {
              const typeLabel: Record<string, string> = { summarise: "Summarisation", generate: "Image Generation", translate: "Translation", transcribe: "Transcription" };
              const ago = Math.round((Date.now() - new Date(j.created_at).getTime()) / 60000);
              return (
                <tr key={j.id} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-gray-200">{typeLabel[j.type] ?? j.type}</p>
                    <p className="text-[10px] text-gray-600 font-mono mt-0.5">ID: {j.id.slice(0, 10).toUpperCase()}</p>
                  </td>
                  <td className="px-6 py-4"><StatusDot status={j.status} /></td>
                  <td className="px-6 py-4 text-xs text-gray-500">{j.user.email}</td>
                  <td className="px-6 py-4 text-xs text-gray-600">{ago}m ago</td>
                  <td className="px-6 py-4">
                    <button className="p-1.5 rounded-lg border border-white/8 hover:border-indigo-500/30 hover:bg-indigo-500/10 text-gray-600 hover:text-indigo-400 transition-all">
                      <Terminal size={13} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="px-6 py-3 border-t border-white/5 flex items-center justify-between text-xs text-gray-600">
          <span>Showing {jobs.data?.items.length ?? 0} of {jobs.data?.total ?? 0} total jobs</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setJobPage(p => Math.max(0, p - 1))} disabled={jobPage === 0}
              className="px-3 py-1 rounded border border-white/8 hover:bg-white/5 disabled:opacity-30 transition-all">
              Prev
            </button>
            <button onClick={() => setJobPage(p => p + 1)} disabled={!jobs.data || (jobPage + 1) * PAGE >= jobs.data.total}
              className="px-3 py-1 rounded bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/40 disabled:opacity-30 transition-all">
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
