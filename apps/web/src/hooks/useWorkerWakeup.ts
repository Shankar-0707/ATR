import { useEffect, useRef } from "react";

/**
 * Silently pings the worker's /health endpoint on mount to wake it up
 * from Render's free-tier sleep. Fire-and-forget — errors are ignored.
 * Only runs once per app session (uses a module-level flag).
 */
let pinged = false;

export function useWorkerWakeup() {
  const attempted = useRef(false);

  useEffect(() => {
    if (pinged || attempted.current) return;
    attempted.current = true;

    const workerUrl = import.meta.env.VITE_WORKER_URL;
    if (!workerUrl) return;

    fetch(`${workerUrl}/health`, { mode: "no-cors" })
      .then(() => {
        pinged = true;
      })
      .catch(() => {
        // Silently ignore — this is best-effort pre-warming
      });
  }, []);
}
