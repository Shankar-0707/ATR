import { useAuth } from "./useAuth.js";
import { showToast } from "../components/Toast.js";

export function useUpgrade() {
  const { user } = useAuth();

  const handleUpgrade = async () => {
    if (!user) {
      showToast("error", "You must be logged in to upgrade.");
      return;
    }

    try {
      const { loadRazorpayScript } = await import("../utils/razorpay.js");
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded) {
        throw new Error("Razorpay SDK failed to load. Check your internet connection.");
      }

      const { createRazorpayOrder, verifyRazorpayPayment } = await import("../api/upgrade.api.js");

      const order = await createRazorpayOrder("pro");

      const options = {
        key: order.key_id,
        amount: order.amount,
        currency: order.currency,
        name: "TaskPilot",
        description: "Upgrade to Pro Plan",
        order_id: order.orderId,
        handler: async (response: any) => {
          try {
            await verifyRazorpayPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            showToast("success", "Payment successful! Your plan has been upgraded to Pro.");
          } catch (err: any) {
            showToast("error", err.message || "Payment verification failed.");
          }
        },
        prefill: {
          email: user?.email,
        },
        theme: {
          color: "#ffffff",
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (e: any) {
      showToast("error", e.message || "Failed to initiate upgrade");
    }
  };

  return { handleUpgrade };
}
