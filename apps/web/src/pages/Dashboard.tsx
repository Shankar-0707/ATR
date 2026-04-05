import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  FileText, Image, Languages, Mic, Zap, TrendingUp,
  ChevronRight, Clock, AlertCircle, CheckCircle2, Loader2,
   Skull,
} from "lucide-react";
import { useJobsList } from "../hooks/useJobs.js";
import { fetchUsage } from "../api/usage.api.js";
import { useAuth } from "../hooks/useAuth.js";
import type { JobRow } from "../api/jobs.api.js";

const JOB_ICONS: Record<string, React.ElementType> = {
  summarise: FileText,
  generate: Image,
  translate: Languages,
  transcribe: Mic,
};

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string; icon: React.ElementType }> = {
  pending:   { label: "PENDING",   color: "text-gray-400",   dot: "bg-gray-500",   icon: Clock },
  active:    { label: "ACTIVE",    color: "text-blue-400",   dot: "bg-blue-500",   icon: Loader2 },
  completed: { label: "COMPLETED", color: "text-emerald-400",dot: "bg-emerald-500",icon: CheckCircle2 },
  failed:    { label: "FAILED",    color: "text-red-400",    dot: "bg-red-500",    icon: AlertCircle },
  dead:      { label: "DEAD",      color: "text-rose-600",   dot: "bg-rose-700",   icon: Skull },
};

function JobCard({ job }: { job: JobRow }) {
  const nav = useNavigate();
  const Icon = JOB_ICONS[job.type] ?? FileText;
  const s = STATUS_CONFIG[job.status] ?? STATUS_CONFIG.pending;
  const StatusIcon = s.icon;
  const isActive = job.status === "active";

  const typeLabel: Record<string, string> = {
    summarise: "Summarise",
    generate: "Generate Image",
    translate: "Translate",
    transcribe: "Transcribe",
  };

  return (
    <div
      onClick={() => nav(`/jobs/${job.id}`)}
      className="group flex items-center gap-4 bg-[#000000] hover:bg-[#1c2230] border border-zinc-800 hover:border-white/20 rounded-md px-5 py-4 cursor-pointer transition-all duration-200 slide-in"
    >
      <div className={`w-10 h-10 rounded-md flex items-center justify-center flex-shrink-0 ${
        job.status === "dead" ? "bg-rose-900/30" :
        job.status === "failed" ? "bg-red-900/30" :
        job.status === "completed" ? "bg-emerald-900/20" :
        job.status === "active" ? "bg-blue-900/20" :
        "bg-white/5"
      }`}>
        <Icon size={18} className={s.color} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-sm font-semibold text-gray-200 truncate">
            {typeLabel[job.type] ?? job.type}
          </span>
          <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md border ${
            job.status === "completed" ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" :
            job.status === "active"    ? "text-blue-400 border-blue-500/30 bg-blue-500/10" :
            job.status === "failed"    ? "text-red-400 border-red-500/30 bg-red-500/10" :
            job.status === "dead"      ? "text-rose-500 border-rose-500/30 bg-rose-500/10" :
            "text-gray-500 border-gray-600/30 bg-gray-500/10"
          }`}>
            <span className={`w-1.5 h-1.5 rounded-md ${s.dot} ${isActive ? "pulse-dot" : ""}`} />
            {s.label}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-600">
          <span className="flex items-center gap-1">
            <Clock size={10} />
            {new Date(job.created_at).toLocaleString()}
          </span>
          {job.error && (
            <span className="text-red-500 truncate max-w-xs flex items-center gap-1">
              <AlertCircle size={10} />
              Failed
            </span>
          )}
          {job.status === "active" && (
            <span className="text-blue-400 flex items-center gap-1">
              <Zap size={10} />
              65% Complete
            </span>
          )}
          {job.status === "pending" && (
            <span className="text-gray-500">Queued</span>
          )}
        </div>
      </div>

      <button className="text-gray-600 group-hover:text-gray-300 transition-colors flex items-center gap-1 text-xs font-medium flex-shrink-0">
        View Details <ChevronRight size={14} />
      </button>
    </div>
  );
}

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="bg-[#000000] border border-zinc-800 rounded-md p-5">
      <p className="text-[11px] uppercase tracking-widest text-gray-500 mb-3">{label}</p>
      <p className={`text-3xl font-bold ${color ?? "text-white"}`}>{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}

export function Dashboard() {
  const nav = useNavigate();
  const { user } = useAuth();
  const q = useJobsList();
  const usage = useQuery({ queryKey: ["usage"], queryFn: fetchUsage, enabled: Boolean(user) });

  const items = q.data?.items ?? [];
  const total = q.data?.total ?? 0;

  const statusCounts = items.reduce<Record<string, number>>((acc, j) => {
    acc[j.status] = (acc[j.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="px-8 py-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Job Execution History</h1>
          <p className="text-gray-500 text-sm mt-1">Monitor and manage your active AI Works.</p>
        </div>
        <button
          onClick={() => nav("/jobs/new")}
          className="flex items-center gap-2 px-4 py-2.5 rounded-md bg-white text-black hover:bg-zinc-200 text-sm font-semibold transition-all duration-150 "
        >
          <Zap size={15} />
          Execute New Job
        </button>
      </div>

      {/* Usage pill */}
      {usage.data && (
        <div className="inline-flex items-center gap-2 bg-[#000000] border border-zinc-800 rounded-md px-4 py-1.5 text-xs text-gray-400 mb-6">
          <span className="w-2 h-2 rounded-md bg-emerald-500 pulse-dot" />
          Usage: {usage.data.jobsCreatedToday} / {usage.data.dailyJobLimit} jobs today
        </div>
      )}

      {/* Job list */}
      <div className="flex flex-col gap-3 mb-10">
        {q.isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 rounded-md shimmer" />
          ))
        ) : items.length === 0 ? (
          <div className="text-center py-16 text-gray-600">
            <Zap size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No jobs yet. Execute your first AI task.</p>
          </div>
        ) : (
          items.map((j) => <JobCard key={j.id} job={j} />)
        )}
      </div>

      {/* Bottom stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#000000] border border-zinc-800 rounded-md p-6">
          <p className="text-[11px] uppercase tracking-widest text-gray-500 mb-2">AI Processing Power</p>
          <p className="text-4xl font-bold text-white">
            94.8 <span className="text-lg font-normal text-gray-500">Teraflops</span>
          </p>
          <p className="text-xs text-gray-500 mt-2 mb-4">
            Your dedicated GPU instances are running at peak efficiency.
          </p>
          <div className="flex gap-2">
            <span className="text-[10px] uppercase tracking-widest font-bold text-emerald-400 border border-emerald-500/30 bg-emerald-500/10 rounded px-2 py-1">Optimized</span>
            <span className="text-[10px] uppercase tracking-widest font-bold text-blue-400 border border-blue-500/30 bg-blue-500/10 rounded px-2 py-1">Scaling Active</span>
          </div>
        </div>

        <div className="bg-[#000000] border border-zinc-800 rounded-md p-6">
          <p className="text-[11px] uppercase tracking-widest text-gray-500 mb-2">Total Jobs</p>
          <p className="text-4xl font-bold text-white">{total.toLocaleString()}</p>
          <p className="text-xs text-emerald-400 flex items-center gap-1 mt-1 mb-4">
            <TrendingUp size={12} />
            +14% from last week
          </p>
          <div className="flex gap-1 items-end h-8">
            {[3,5,4,7,6,8,9].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-sm bg-white text-black hover:bg-zinc-200/40 hover:bg-white text-black hover:bg-zinc-200/70 transition-colors"
                style={{ height: `${(h / 9) * 100}%` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
