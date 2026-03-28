import { Link } from "react-router-dom";
import type { JobRow } from "../api/jobs.api.js";
import { StatusBadge } from "./StatusBadge.js";

export function JobCard({ job }: { job: JobRow }) {
  return (
    <Link to={`/jobs/${job.id}`} className="job-card">
      <span className="job-type">{job.type}</span>
      <StatusBadge status={job.status} />
    </Link>
  );
}
