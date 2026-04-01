import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, X } from "lucide-react";

type ToastType = "success" | "error";

let toastId = 0;
const listeners = new Set<(toast: ToastData) => void>();

type ToastData = {
  id: number;
  type: ToastType;
  message: string;
};

export function showToast(type: ToastType, message: string) {
  const toast: ToastData = { id: toastId++, type, message };
  listeners.forEach((fn) => fn(toast));
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  useEffect(() => {
    const handler = (toast: ToastData) => {
      setToasts((prev) => [...prev, toast]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toast.id));
      }, 5000);
    };
    listeners.add(handler);
    return () => {
      listeners.delete(handler);
    };
  }, []);

  return (
    <div className="fixed top-20 right-6 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border shadow-2xl slide-in ${
            toast.type === "success"
              ? "bg-emerald-900/90 border-emerald-500/40 text-emerald-100"
              : "bg-red-900/90 border-red-500/40 text-red-100"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 size={18} className="flex-shrink-0" />
          ) : (
            <XCircle size={18} className="flex-shrink-0" />
          )}
          <span className="text-sm font-medium">{toast.message}</span>
          <button
            onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
            className="ml-2 text-white/60 hover:text-white transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
