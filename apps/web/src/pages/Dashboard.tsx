import { Link } from "react-router-dom";
import { useJobsList } from "../hooks/useJobs.js";
import { StatusBadge } from "../components/StatusBadge.js";
import { UsageBar } from "../components/UsageBar.js";

export function Dashboard() {
  const q = useJobsList();

  if (q.isLoading) {
    return (
      <div className="page">
        <p className="muted">Loading jobs…</p>
      </div>
    );
  }
  if (q.isError) {
    return (
      <div className="page">
        <p className="error">Could not load jobs.</p>
      </div>
    );
  }

  const { items, total } = q.data!;

  return (
    <div className="page">
      <UsageBar />
      <div className="row space-between">
        <h1>Jobs</h1>
        <Link className="button" to="/jobs/new">
          New summarise job
        </Link>
      </div>
      <p className="muted small">{total} total</p>
      <ul className="job-list">
        {items.map((j) => (
          <li key={j.id}>
            <Link to={`/jobs/${j.id}`} className="job-link">
              <span className="job-type">{j.type}</span>
              <StatusBadge status={j.status} />
              <span className="muted small">
                {new Date(j.created_at).toLocaleString()}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {items.length === 0 ? (
        <p className="muted">No jobs yet. Create a summarise job to get started.</p>
      ) : null}
    </div>
  );
}
