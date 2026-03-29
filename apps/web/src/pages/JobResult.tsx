import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { Link } from "react-router-dom";
import * as jobsApi from "../api/jobs.api.js";
import { useJob } from "../hooks/useJobs.js";
import { StatusBadge } from "../components/StatusBadge.js";

function ResultBody({
  jobType,
  result,
}: {
  jobType: string;
  result: unknown;
}) {
  if (!result || typeof result !== "object") {
    return (
      <pre className="json-out">{JSON.stringify(result, null, 2)}</pre>
    );
  }

  const r = result as Record<string, unknown>;

  if (jobType === "summarise" && typeof r.summary === "string") {
    return (
      <article className="summary-box">
        <pre className="markdown-ish">{r.summary}</pre>
      </article>
    );
  }

  if (jobType === "translate" && typeof r.translatedText === "string") {
    return (
      <article className="summary-box">
        <pre className="markdown-ish">{r.translatedText}</pre>
      </article>
    );
  }

  if (jobType === "generate" && typeof r.imageUrl === "string") {
    return (
      <div className="image-result">
        <img
          src={r.imageUrl}
          alt={typeof r.revisedPrompt === "string" ? r.revisedPrompt : "Generated"}
          className="generated-image"
        />
        {typeof r.revisedPrompt === "string" ? (
          <p className="muted small">{r.revisedPrompt}</p>
        ) : null}
      </div>
    );
  }

  if (jobType === "transcribe" && typeof r.transcript === "string") {
    return (
      <article className="summary-box">
        <pre className="markdown-ish">{r.transcript}</pre>
      </article>
    );
  }

  return (
    <pre className="json-out">{JSON.stringify(result, null, 2)}</pre>
  );
}

export function JobResult() {
  const { id } = useParams<{ id: string }>();
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
      <div className="page">
        <p className="muted">Loading job…</p>
      </div>
    );
  }
  if (q.isError || !q.data) {
    return (
      <div className="page">
        <p className="error">Job not found.</p>
        <Link to="/">Back to list</Link>
      </div>
    );
  }

  const job = q.data;

  return (
    <div className="page">
      <p>
        <Link to="/">← Jobs</Link>
      </p>
      <div className="row space-between">
        <h1>{job.type}</h1>
        <StatusBadge status={job.status} />
      </div>
      <p className="muted small mono">{job.id}</p>
      {job.error ? <p className="error">{job.error}</p> : null}
      {job.status === "dead" ? (
        <p className="muted">
          This job reached <strong>dead</strong> status (maximum attempts
          exhausted). Create a new job instead.
        </p>
      ) : null}
      {job.status === "failed" ? (
        <p>
          <button
            type="button"
            className="button"
            onClick={() => retry.mutate()}
            disabled={retry.isPending}
          >
            {retry.isPending ? "Retrying…" : "Retry job"}
          </button>
        </p>
      ) : null}
      {job.result ? (
        <>
          <h2>Result</h2>
          <ResultBody jobType={job.type} result={job.result} />
        </>
      ) : (
        <p className="muted">
          {job.status === "pending" || job.status === "active"
            ? "Processing… updates arrive live via WebSocket."
            : "No result."}
        </p>
      )}
    </div>
  );
}
