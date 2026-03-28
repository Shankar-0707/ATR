import { useQuery } from "@tanstack/react-query";
import * as jobsApi from "../api/jobs.api.js";

export function useJobsList() {
  return useQuery({
    queryKey: ["jobs", "list"],
    queryFn: () => jobsApi.listJobs(50, 0),
  });
}

export function useJob(id: string | undefined) {
  return useQuery({
    queryKey: ["jobs", "one", id],
    queryFn: () => jobsApi.getJob(id!),
    enabled: Boolean(id),
  });
}
