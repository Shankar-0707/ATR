import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import {
  ChevronRight, RefreshCw, AlertCircle, CheckCircle2,
  Clock, Loader2, Skull, Pause, FileText, Image, Languages, Mic,
  Cpu, Zap, BarChart3, Terminal,
} from "lucide-react";
import * as jobsApi from "../api/jobs.api.js";
import { useJob } from "../hooks/useJobs.js";

const JOB_ICONS: Record<string, React.ElementType> = {
  summarise: FileText,
  generate: Image,
  translate: Languages,
  transcribe: Mic,
};

const JOB_LABELS: Record<string, string> = {
  summarise: "Summarisation Task",
  generate: "Image Generation Task",
  translate: "Translation Task",
  transcribe: "Transcription Task",
};

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { label: string; cls: string; dot: string; pulse?: boolean }> = {
    pending:   { label: "PENDING",   cls: "text-gray-400 border-gray-600/40 bg-gray-500/10",   dot: "bg-gray-500" },
    active:    { label: "ACTIVE",    cls: "text-blue-400 border-blue-500/40 bg-blue-500/10",   dot: "bg-blue-500", pulse: true },
    completed: { label: "COMPLETED", cls: "text-emerald-400 border-emerald-500/40 bg-emerald-500/10", dot: "bg-emerald-500" },
    failed:    { label: "FAILED",    cls: "text-red-400 border-red-500/40 bg-red-500/10",     dot: "bg-red-500" },
    dead:      { label: "DEAD",      cls: "text-rose-500 border-rose-500/40 bg-rose-500/10",  dot: "bg-rose-600" },
  };
  const c = cfg[status] ?? cfg.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full border ${c.cls}`}>
      <span className={`w-2 h-2 rounded-full ${c.dot} ${c.pulse ? "pulse-dot" : ""}`} />
      {c.label}
    </span>
  );
}

function FakeLog({ status }: { status: string }) {
  const lines = [
    { time: "14:22:01", msg: "Fetching documents from secure bucket", highlight: "#chrono-docs-01..." },
    { time: "14:22:04", msg: "Parsing metadata and identifying semantic anchors.", highlight: null },
    { time: "14:22:18", msg: "Initializing Large Language Model inference cluster.", highlight: null },
    { time: "14:22:45", msg: "Synthesizing executive summary section 4 of 6...", highlight: null },
  ];
  if (status === "pending") return null;
  return (
    <div className="font-mono text-xs space-y-2 mt-4">
      {lines.map((l, i) => (
        <div key={i} className="flex gap-3">
          <span className="text-indigo-400 flex-shrink-0">{l.time}</span>
          <span className="text-gray-400">
            {l.msg}{" "}
            {l.highlight && <span className="text-indigo-300">{l.highlight}</span>}
          </span>
        </div>
      ))}
    </div>
  );
}

function ResultBody({ jobType, result }: { jobType: string; result: unknown }) {
  if (!result || typeof result !== "object") {
    return <pre className="text-xs text-gray-400 bg-[#0d1117] rounded-xl p-4 overflow-auto">{JSON.stringify(result, null, 2)}</pre>;
  }
  const r = result as Record<string, unknown>;

  if (jobType === "summarise" && typeof r.summary === "string") {
    return (
      <div className="bg-[#0d1117] border border-white/5 rounded-xl p-5">
        <p className="text-[11px] uppercase tracking-widest text-gray-500 mb-3">Summary Output</p>
        <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{r.summary}</p>
      </div>
    );
  }
  if (jobType === "translate" && typeof r.translatedText === "string") {
    return (
      <div className="bg-[#0d1117] border border-white/5 rounded-xl p-5">
        <p className="text-[11px] uppercase tracking-widest text-gray-500 mb-3">Translation Output</p>
        <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{r.translatedText}</p>
        {typeof r.targetLang === "string" && (
          <p className="text-xs text-gray-600 mt-3">Target: {r.targetLang}</p>
        )}
      </div>
    );
  }
  if (jobType === "generate" && typeof r.imageUrl === "string") {
    return (
      <div className="space-y-3">
        <img src={r.imageUrl} alt={typeof r.revisedPrompt === "string" ? r.revisedPrompt : "Generated"} className="w-full rounded-xl border border-white/5" />
        {typeof r.revisedPrompt === "string" && (
          <p className="text-xs text-gray-500">{r.revisedPrompt}</p>
        )}
      </div>
    );
  }
  if (jobType === "transcribe" && typeof r.transcript === "string") {
    return (
      <div className="bg-[#0d1117] border border-white/5 rounded-xl p-5">
        <p className="text-[11px] uppercase tracking-widest text-gray-500 mb-3">Transcript</p>
        <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{r.transcript}</p>
      </div>
    );
  }
  return <pre className="text-xs text-gray-400 bg-[#0d1117] rounded-xl p-4 overflow-auto">{JSON.stringify(result, null, 2)}</pre>;
}

export function JobResult() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const qc = useQueryClient();
  const q = useJob(id);

  const retry = useMutation({
    mutationFn: () => jobsApi.retryJob(id!),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["jobs", "one", id] });
      void qc.invalidateQueries({ queryKey: ["jobs", "list"] });
      void qc.invalidateQueries({ queryKey: ["usage"] });
    },
  });

  if (q.isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex gap-1">
          {[0,1,2].map(i => <span key={i} className="w-2 h-2 rounded-full bg-indigo-500 pulse-dot" style={{ animationDelay: `${i*0.2}s` }} />)}
        </div>
      </div>
    );
  }
  if (q.isError || !q.data) {
    return (
      <div className="px-8 py-8">
        <p className="text-red-400">Job not found.</p>
        <button onClick={() => nav("/")} className="text-indigo-400 text-sm mt-2">← Back to jobs</button>
      </div>
    );
  }

  const job = q.data;
  const Icon = JOB_ICONS[job.type] ?? FileText;
  const progress = job.status === "active" ? 68 : job.status === "completed" ? 100 : 0;

  return (
    <div className="px-8 py-8 max-w-5xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-gray-600 mb-6">
        <button onClick={() => nav("/")} className="hover:text-gray-400 transition-colors">Jobs</button>
        <ChevronRight size={12} />
        <span className="text-gray-400 font-mono">{job.id.slice(0, 16).toUpperCase()}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">{JOB_LABELS[job.type] ?? job.type}</h1>
          <p className="text-gray-500 text-sm mt-1">
            {job.status === "active" ? "Processing your request in real-time." :
             job.status === "completed" ? "Task completed successfully." :
             job.status === "failed" ? "Task encountered an error." :
             job.status === "dead" ? "Task exhausted all retry attempts." :
             "Waiting in queue..."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={job.status} />
          {job.status === "active" && (
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 text-gray-400 hover:text-gray-200 text-xs font-medium transition-all">
              <Pause size={12} /> Pause
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main panel */}
        <div className="lg:col-span-2 space-y-5">
          {/* Execution panel */}
          <div className="bg-[#161b22] border border-white/5 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold text-white">Real-time Execution</h2>
                <p className="text-xs text-gray-500 mt-0.5">Worker: AI-Node-04 • Regional: US-East-1</p>
              </div>
              {progress > 0 && (
                <div className="text-right">
                  <span className="text-3xl font-bold text-indigo-400">{progress}%</span>
                  <p className="text-[10px] uppercase tracking-widest text-gray-600">Completion</p>
                </div>
              )}
            </div>

            {progress > 0 && (
              <div className="h-2 rounded-full bg-white/5 overflow-hidden mb-4">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-1000"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}

            <FakeLog status={job.status} />

            {job.error && (
              <div className="mt-4 flex items-start gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2.5">
                <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />
                {job.error}
              </div>
            )}

            {job.status === "dead" && (
              <div className="mt-4 flex items-start gap-2 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2.5">
                <Skull size={13} className="flex-shrink-0 mt-0.5" />
                Maximum retry attempts exhausted. Create a new job to try again.
              </div>
            )}

            {job.status === "failed" && (
              <button
                onClick={() => retry.mutate()}
                disabled={retry.isPending}
                className="mt-4 flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-xs font-semibold transition-all"
              >
                <RefreshCw size={13} className={retry.isPending ? "animate-spin" : ""} />
                {retry.isPending ? "Retrying..." : "Retry Job"}
              </button>
            )}
          </div>

          {/* Task params */}
          <div className="bg-[#161b22] border border-white/5 rounded-2xl p-6">
            <h2 className="text-base font-semibold text-white mb-4">Task Parameters</h2>
            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
              {[
                { label: "Model Engine", value: "Gemini 2.5 Flash" },
                { label: "Token Limit", value: "128,000 Context" },
                { label: "Attempts", value: `${job.attempts} / ${job.max_attempts}` },
                { label: "Priority", value: job.priority === 1 ? "Ultra High (Tier 1)" : `Tier ${job.priority}`, highlight: job.priority === 1 },
              ].map(({ label, value, highlight }) => (
                <div key={label}>
                  <p className="text-[10px] uppercase tracking-widest text-gray-600 mb-1">{label}</p>
                  <p className={`text-sm font-semibold ${highlight ? "text-indigo-400" : "text-gray-200"}`}>{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Result */}
          {job.result && (
            <div className="bg-[#161b22] border border-white/5 rounded-2xl p-6">
              <h2 className="text-base font-semibold text-white mb-4">Result</h2>
              <ResultBody jobType={job.type} result={job.result} />
            </div>
          )}

          {!job.result && (job.status === "pending" || job.status === "active") && (
            <div className="bg-[#161b22] border border-white/5 rounded-2xl p-8 flex flex-col items-center text-center">
              <div className="flex gap-1 mb-3">
                {[0,1,2].map(i => <span key={i} className="w-2 h-2 rounded-full bg-indigo-500 pulse-dot" style={{ animationDelay: `${i*0.2}s` }} />)}
              </div>
              <p className="text-sm text-gray-500">Processing… updates arrive live via WebSocket.</p>
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          {/* Pro insight */}
          <div className="bg-[#161b22] border border-white/5 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <Zap size={16} className="text-indigo-400" />
              <span className="text-[10px] uppercase tracking-widest font-bold text-indigo-400">Pro Insight</span>
            </div>
            <h3 className="text-sm font-semibold text-white mb-2">Efficiency Rating</h3>
            <p className="text-xs text-gray-500 mb-3">
              This job is consuming{" "}
              <span className="text-indigo-300 font-semibold">14% less compute</span>{" "}
              than standard tasks due to optimized processing.
            </p>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold text-white">98.4</span>
              <span className="text-xs text-gray-500">Quality Score</span>
            </div>
          </div>

          {/* Semantic coverage */}
          <div className="bg-[#161b22] border border-white/5 rounded-2xl overflow-hidden">
            <div className="h-28 bg-gradient-to-br from-indigo-900/40 to-purple-900/20 flex items-center justify-center">
              <BarChart3 size={40} className="text-indigo-400/30" />
            </div>
            <div className="p-4">
              <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-2">Semantic Coverage</p>
              <p className="text-xs text-gray-400 mb-3">
                The AI is currently mapping distinct data silos into a single narrative flow.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {["#finance", "#legal", "#tech-spec"].map(tag => (
                  <span key={tag} className="text-[10px] text-gray-500 border border-white/8 rounded px-2 py-0.5">{tag}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Global actions */}
          <div className="bg-[#161b22] border border-white/5 rounded-2xl p-4">
            <p className="text-xs font-semibold text-gray-400 mb-3">Global Actions</p>
            <div className="flex flex-col gap-2">
              <button className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all">
                Expand Context
              </button>
              <button className="w-full py-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-gray-400 hover:text-gray-200 text-xs font-semibold transition-all flex items-center justify-center gap-2">
                <Terminal size={12} /> View Full Log
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
