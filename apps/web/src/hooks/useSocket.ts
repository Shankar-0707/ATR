import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { io, type Socket } from "socket.io-client";
import type { JobUpdatePayload, UpgradeRequestUpdatePayload } from "@ai-task-runner/shared";

const wsBase = () => import.meta.env.VITE_WS_URL ?? window.location.origin;

export function useJobSocket(enabled: boolean) {
  const qc = useQueryClient();
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setConnected(false);
      return;
    }
    const socket = io(wsBase(), {
      path: "/socket.io",
      withCredentials: true,
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;
    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    
    socket.on("job:update", (payload: JobUpdatePayload) => {
      void qc.invalidateQueries({ queryKey: ["jobs", "list"] });
      void qc.invalidateQueries({ queryKey: ["jobs", "one", payload.jobId] });
    });

    socket.on("upgrade:update", (payload: UpgradeRequestUpdatePayload) => {
      void qc.invalidateQueries({ queryKey: ["upgrade", "my"] });
      void qc.invalidateQueries({ queryKey: ["me"] });
      
      // Show toast notification
      import("../components/Toast.js").then(({ showToast }) => {
        if (payload.status === "approved") {
          showToast("success", "Your upgrade to Pro has been approved! 🎉");
        } else if (payload.status === "rejected") {
          showToast("error", "Your upgrade request was rejected.");
        }
      });
    });

    socket.on("upgrade:admin", (payload: UpgradeRequestUpdatePayload) => {
      void qc.invalidateQueries({ queryKey: ["admin", "upgrade-requests"] });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [enabled, qc]);

  return { connected };
}
