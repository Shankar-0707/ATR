import toast, { Toaster as HotToaster } from "react-hot-toast";

type ToastType = "success" | "error";

export function showToast(type: ToastType, message?: any) {
  let displayMessage = message;

  // We enforce minimal "Job failed" / "Job success" text everywhere unless it pertains to payments
  const isPaymentMsg = typeof message === "string" && (message.includes("Payment") || message.includes("upgrade") || message.includes("Pro"));
  
  if (!isPaymentMsg) {
      if (type === "success" && message && typeof message === "string" && message.includes("success")) {
         displayMessage = "Job success";
      } else if (type === "error" && message && typeof message === "string" && message.includes("failed")) {
         displayMessage = "Job failed";
      } else {
         displayMessage = type === "error" ? "Job failed" : "Job success";
      }
  } else {
      displayMessage = message; // Keep meaningful strings for payment events
  }

  const style: React.CSSProperties = {
    background: "#18181b", // zinc-900
    color: "#e4e4e7", // zinc-200
    border: "1px solid #27272a", // zinc-800
    fontSize: "14px",
    maxWidth: "500px",
    wordBreak: "break-word",
  };

  if (type === "success") {
    toast.success(displayMessage, {
      style,
      iconTheme: {
        primary: "#10b981",
        secondary: "#18181b",
      },
    });
  } else {
    toast.error(displayMessage, {
      style,
      iconTheme: {
        primary: "#ef4444",
        secondary: "#18181b",
      },
      duration: 5000,
    });
  }
}

export function ToastContainer() {
  return <HotToaster position="top-right" />;
}
