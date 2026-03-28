import { useParams } from "react-router-dom";
import { Link } from "react-router-dom";
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
  const q = useJob(id);

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
