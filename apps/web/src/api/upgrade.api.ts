import { http } from "./http.js";

export type UpgradeRequest = {
  id: string;
  user_id: string;
  status: "pending" | "approved" | "rejected";
  target_plan: string;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  amount: number | null;
  user?: { email: string; plan: string };
};

export async function createUpgradeRequest(targetPlan: string) {
  const res = await http.post<UpgradeRequest>("/api/upgrade", { targetPlan });
  return res.data;
}

export async function getMyUpgradeRequests() {
  const res = await http.get<UpgradeRequest[]>("/api/upgrade/my");
  return res.data;
}

export async function listUpgradeRequests(status?: string, take = 20, skip = 0) {
  const res = await http.get<{
    items: UpgradeRequest[];
    total: number;
    take: number;
    skip: number;
  }>("/api/upgrade", { params: { status, take, skip } });
  return res.data;
}

export async function reviewUpgradeRequest(requestId: string, approve: boolean) {
  const res = await http.post<UpgradeRequest>(`/api/upgrade/${requestId}/review`, { approve });
  return res.data;
}

export type RazorpayOrderResponse = {
  orderId: string;
  amount: number;
  currency: string;
  key_id: string;
};

export async function createRazorpayOrder(targetPlan: string) {
  const res = await http.post<RazorpayOrderResponse>("/api/upgrade/create-order", { targetPlan });
  return res.data;
}

export async function verifyRazorpayPayment(payload: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}) {
  const res = await http.post<{ success: boolean; plan: string }>("/api/upgrade/verify-payment", payload);
  return res.data;
}
