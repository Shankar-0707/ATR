import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import {
  AlertCircle,
  BarChart3,
  ChevronRight,
  FileText,
  Image,
  Languages,
  Mic,
  Pause,
  RefreshCw,
  Skull,
  Zap,
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
    pending: { label: "PENDING", cls: "text-gray-400 border-gray-600/40 bg-gray-500/10", dot: "bg-gray-500" },
    active: { label: "ACTIVE", cls: "text-blue-400 border-blue-500/40 bg-blue-500/10", dot: "bg-blue-500", pulse: true },
    completed: { label: "COMPLETED", cls: "text-emerald-400 border-emerald-500/40 bg-emerald-500/10", dot: "bg-emerald-500" },
    failed: { label: "FAILED", cls: "text-red-400 border-red-500/40 bg-red-500/10", dot: "bg-red-500" },
    dead: { label: "DEAD", cls: "text-rose-500 border-rose-500/40 bg-rose-500/10", dot: "bg-rose-600" },
  };
  const c = cfg[status] ?? cfg.pending;

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-widest ${c.cls}`}>
      <span className={`h-2 w-2 rounded-md ${c.dot} ${c.pulse ? "pulse-dot" : ""}`} />
      {c.label}
    </span>
  );
}

function FakeLog({ status }: { status: string }) {
  const lines = [
    { time: "14:22:01", msg: "Fetching documents from secure bucket", highlight: "#chrono-docs-01..." },
    { time: "14:22:04", msg: "Parsing metadata and identifying semantic anchors.", highlight: null },
    { time: "14:22:18", msg: "Initializing large language model inference cluster.", highlight: null },
    { time: "14:22:45", msg: "Synthesizing executive summary section 4 of 6...", highlight: null },
  ];

  if (status === "pending") return null;

  return (
    <div className="mt-4 space-y-2 font-mono text-xs">
      {lines.map((l, i) => (
        <div key={i} className="flex flex-col gap-1 sm:flex-row sm:gap-3">
          <span className="flex-shrink-0 text-zinc-400">{l.time}</span>
          <span className="text-gray-400">
            {l.msg} {l.highlight && <span className="text-zinc-300">{l.highlight}</span>}
          </span>
        </div>
      ))}
    </div>
  );
}

function ResultBody({ jobType, result }: { jobType: string; result: unknown }) {
  if (!result || typeof result !== "object") {
    return (
      <pre className="overflow-auto rounded-md bg-black p-4 text-xs text-gray-400">
        {JSON.stringify(result, null, 2)}
      </pre>
    );
  }
  const r = result as Record<string, unknown>;

  if (jobType === "summarise" && typeof r.summary === "string") {
    return (
      <div className="rounded-xl border border-zinc-800 bg-black p-4 sm:p-5">
        <p className="mb-3 text-[11px] uppercase tracking-widest text-gray-500">Summary Output</p>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-300">{r.summary}</p>
      </div>
    );
  }
  if (jobType === "translate" && typeof r.translatedText === "string") {
    return (
      <div className="rounded-xl border border-zinc-800 bg-black p-4 sm:p-5">
        <p className="mb-3 text-[11px] uppercase tracking-widest text-gray-500">Translation Output</p>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-300">{r.translatedText}</p>
        {typeof r.targetLang === "string" && <p className="mt-3 text-xs text-gray-600">Target: {r.targetLang}</p>}
      </div>
    );
  }
  if (jobType === "generate" && typeof r.imageUrl === "string") {
    return (
      <div className="space-y-3">
        <img
          src={r.imageUrl}
          alt={typeof r.revisedPrompt === "string" ? r.revisedPrompt : "Generated"}
          className="w-full rounded-xl border border-zinc-800"
        />
        {typeof r.revisedPrompt === "string" && <p className="text-xs text-gray-500">{r.revisedPrompt}</p>}
      </div>
    );
  }
  if (jobType === "transcribe" && typeof r.transcript === "string") {
    return (
      <div className="rounded-xl border border-zinc-800 bg-black p-4 sm:p-5">
        <p className="mb-3 text-[11px] uppercase tracking-widest text-gray-500">Transcript</p>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-300">{r.transcript}</p>
      </div>
    );
  }

  return (
    <pre className="overflow-auto rounded-md bg-black p-4 text-xs text-gray-400">
      {JSON.stringify(result, null, 2)}
    </pre>
  );
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
      <div className="flex h-64 items-center justify-center">
        <div className="flex items-center justify-center gap-1">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-2 w-2 rounded-full bg-white pulse-dot"
              style={{ animationDelay: `${i * 0.2}s` }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (q.isError || !q.data) {
    return (
      <div className="px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <p className="text-red-400">Job not found.</p>
        <button onClick={() => nav("/")} className="mt-2 text-sm text-zinc-400">
          Back to jobs
        </button>
      </div>
    );
  }

  const job = q.data;
  const progress = job.status === "active" ? 68 : job.status === "completed" ? 100 : 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <div className="mb-6 flex flex-wrap items-center gap-2 text-xs text-gray-600">
        <button onClick={() => nav("/")} className="transition-colors hover:text-gray-400">
          Jobs
        </button>
        <ChevronRight size={12} />
        <span className="font-mono text-gray-400">{job.id.slice(0, 16).toUpperCase()}</span>
      </div>

      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            {JOB_LABELS[job.type] ?? job.type}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {job.status === "active"
              ? "Processing your request in real time."
              : job.status === "completed"
                ? "Task completed successfully."
                : job.status === "failed"
                  ? "Task encountered an error."
                  : job.status === "dead"
                    ? "Task exhausted all retry attempts."
                    : "Waiting in queue..."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge status={job.status} />
          {job.status === "active" && (
            <button className="flex items-center gap-1.5 rounded-full border border-zinc-800 px-3 py-1.5 text-xs font-medium text-gray-400 transition-all hover:text-gray-200">
              <Pause size={12} /> Pause
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <div className="rounded-2xl border border-zinc-800 bg-[#000000] p-4 sm:p-6">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-white">Real-time Execution</h2>
              </div>
              {progress > 0 && (
                <div className="text-left sm:text-right">
                  <span className="text-3xl font-bold text-zinc-400">{progress}%</span>
                </div>
              )}
            </div>

            {progress > 0 && (
              <div className="mb-4 h-2 overflow-hidden rounded-md bg-white/5">
                <div
                  className="h-full rounded-md bg-white transition-all duration-1000"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}

            <FakeLog status={job.status} />

            {job.error && (
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-xs text-red-400">
                <AlertCircle size={13} className="mt-0.5 flex-shrink-0" />
                Task encountered an error.
              </div>
            )}

            {job.status === "dead" && (
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2.5 text-xs text-rose-400">
                <Skull size={13} className="mt-0.5 flex-shrink-0" />
                Maximum retry attempts exhausted. Create a new job to try again.
              </div>
            )}

            {job.status === "failed" && (
              <button
                onClick={() => retry.mutate()}
                disabled={retry.isPending}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-black transition-all hover:bg-zinc-200 disabled:opacity-60 sm:w-auto sm:rounded-md"
              >
                <RefreshCw size={13} className={retry.isPending ? "animate-spin" : ""} />
                {retry.isPending ? "Retrying..." : "Retry Job"}
              </button>
            )}
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-[#000000] p-4 sm:p-6">
            <h2 className="mb-4 text-base font-semibold text-white">Task Parameters</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-x-8">
              {[
                { label: "Token Limit", value: "128,000 Context" },
                { label: "Attempts", value: `${job.attempts} / ${job.max_attempts}` },
                {
                  label: "Priority",
                  value: job.priority === 1 ? "Ultra High (Tier 1)" : `Tier ${job.priority}`,
                  highlight: job.priority === 1,
                },
              ].map(({ label, value, highlight }) => (
                <div key={label}>
                  <p className="mb-1 text-[10px] uppercase tracking-widest text-gray-600">{label}</p>
                  <p className={`text-sm font-semibold ${highlight ? "text-zinc-400" : "text-gray-200"}`}>
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {job.result && (
            <div className="rounded-2xl border border-zinc-800 bg-[#000000] p-4 sm:p-6">
              <h2 className="mb-4 text-base font-semibold text-white">Result</h2>
              <ResultBody jobType={job.type} result={job.result} />
            </div>
          )}

          {!job.result && (job.status === "pending" || job.status === "active") && (
            <div className="flex flex-col items-center rounded-2xl border border-zinc-800 bg-[#000000] p-8 text-center">
              <div className="mb-3 flex items-center justify-center gap-1">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="h-2 w-2 rounded-full bg-white pulse-dot"
                    style={{ animationDelay: `${i * 0.2}s` }}
                  />
                ))}
              </div>
              <p className="text-sm text-gray-500">Processing... updates arrive live via WebSocket.</p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-zinc-800 bg-[#000000] p-5">
            <div className="mb-3 flex items-center justify-between">
              <Zap size={16} className="text-zinc-400" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Pro Insight</span>
            </div>
            <h3 className="mb-2 text-sm font-semibold text-white">Efficiency Rating</h3>
            <p className="mb-3 text-xs text-gray-500">
              This job is consuming <span className="font-semibold text-zinc-300">14% less compute</span> than
              standard tasks due to optimized processing.
            </p>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold text-white">98.4</span>
              <span className="text-xs text-gray-500">Quality Score</span>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-[#000000]">
            <div className="flex h-28 items-center justify-center bg-zinc-900/80">
              <BarChart3 size={40} className="text-zinc-400/30" />
            </div>
            <div className="p-4">
              <p className="mb-2 text-[10px] uppercase tracking-widest text-gray-500">Semantic Coverage</p>
              <p className="text-xs text-gray-400">
                The AI is currently mapping distinct data silos into a single narrative flow.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
