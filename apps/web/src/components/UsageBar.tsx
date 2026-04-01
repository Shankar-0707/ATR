import { useQuery } from "@tanstack/react-query";
import * as usageApi from "../api/usage.api.js";

export function UsageBar() {
  const q = useQuery({
    queryKey: ["usage"],
    queryFn: () => usageApi.fetchUsage(),
    staleTime: 30_000,
  });

  if (q.isLoading || q.isError || !q.data) {
    return null;
  }

  const u = q.data;
  return (
    <div className="usage-bar" role="status">
      <span className="muted small">
        Today (UTC {u.utcDay}): {u.jobsCreatedToday}/{u.dailyJobLimit} jobs ·{" "}
        {u.jobsInProgress}/{u.maxConcurrentJobs} in progress · completed{" "}
        {u.outcomesToday.completed}
      </span>
    </div>
  );
}
