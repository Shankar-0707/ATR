import { UPGRADE_REQUEST_CHANNEL } from "@ai-task-runner/shared";
import type { UpgradeRequestUpdatePayload } from "@ai-task-runner/shared";
import { razorpay } from "../../core/lib/razorpay.js";
import crypto from "crypto";
import { prisma } from "../../core/lib/prisma.js";
import { redis } from "../../core/lib/redis.js";


export async function createUpgradeRequest(userId: string, targetPlan: string) {
  // Check if user already has a pending request
  const existing = await prisma.upgradeRequest.findFirst({
    where: { user_id: userId, status: "pending" },
  });
  if (existing) {
    throw new Error("You already have a pending upgrade request");
  }

  const request = await prisma.upgradeRequest.create({
    data: {
      user_id: userId,
      target_plan: targetPlan,
      status: "pending",
    },
    include: { user: { select: { email: true, plan: true } } },
  });

  // Notify admins via Redis pub/sub
  const payload: UpgradeRequestUpdatePayload = {
    requestId: request.id,
    userId: request.user_id,
    status: "pending",
    targetPlan: request.target_plan,
  };
  await redis.publish(UPGRADE_REQUEST_CHANNEL, JSON.stringify(payload));

  return request;
}

export async function listUpgradeRequests(status?: string, take = 20, skip = 0) {
  const where = status ? { status } : {};
  const [items, total] = await Promise.all([
    prisma.upgradeRequest.findMany({
      where,
      take,
      skip,
      orderBy: { created_at: "desc" },
      include: { user: { select: { email: true, plan: true } } },
    }),
    prisma.upgradeRequest.count({ where }),
  ]);
  return { items, total, take, skip };
}

export async function reviewUpgradeRequest(
  requestId: string,
  adminId: string,
  approve: boolean,
) {
  const request = await prisma.upgradeRequest.findUnique({
    where: { id: requestId },
    include: { user: true },
  });

  if (!request) throw new Error("Request not found");
  if (request.status !== "pending") throw new Error("Request already reviewed");

  const newStatus = approve ? "approved" : "rejected";

  // Update request and user plan in transaction
  const [updated] = await prisma.$transaction([
    prisma.upgradeRequest.update({
      where: { id: requestId },
      data: {
        status: newStatus,
        reviewed_at: new Date(),
        reviewed_by: adminId,
      },
      include: { user: { select: { email: true, plan: true } } },
    }),
    ...(approve
      ? [
          prisma.user.update({
            where: { id: request.user_id },
            data: { plan: request.target_plan },
          }),
        ]
      : []),
  ]);

  // Notify user via Redis pub/sub
  const payload: UpgradeRequestUpdatePayload = {
    requestId: updated.id,
    userId: updated.user_id,
    status: newStatus as "approved" | "rejected",
    targetPlan: updated.target_plan,
  };
  await redis.publish(UPGRADE_REQUEST_CHANNEL, JSON.stringify(payload));

  return updated;
}

export async function getUserUpgradeRequests(userId: string) {
  return prisma.upgradeRequest.findMany({
    where: { user_id: userId },
    orderBy: { created_at: "desc" },
    take: 10,
  });
}

export async function createRazorpayOrder(userId: string, targetPlan: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");
  if (user.plan === targetPlan) throw new Error(`User is already on ${targetPlan} plan`);

  const amount = 1 * 100; // ₹1.00 in paise
  const currency = "INR";

  const order = await razorpay.orders.create({
    amount,
    currency,
    receipt: `receipt_${Date.now()}`,
    notes: {
      userId,
      targetPlan,
    },
  });

  // Create a pending request with the order ID
  await prisma.upgradeRequest.create({
    data: {
      user_id: userId,
      target_plan: targetPlan,
      status: "pending",
      razorpay_order_id: order.id,
      amount: amount / 100,
    },
  });

  return {
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    key_id: process.env.RAZORPAY_KEY_ID,
  };
}

export async function verifyRazorpayPayment(
  userId: string,
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string,
) {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) throw new Error("Razorpay secret not configured");

  const generated_signature = crypto
    .createHmac("sha256", secret)
    .update(razorpayOrderId + "|" + razorpayPaymentId)
    .digest("hex");

  if (generated_signature !== razorpaySignature) {
    throw new Error("Invalid payment signature");
  }

  const request = await prisma.upgradeRequest.findFirst({
    where: { razorpay_order_id: razorpayOrderId, user_id: userId },
  });

  if (!request) throw new Error("Upgrade request not found for this order");
  if (request.status !== "pending") throw new Error("Request already processed");

  // Success! Update plan and request status
  const [updatedRequest] = await prisma.$transaction([
    prisma.upgradeRequest.update({
      where: { id: request.id },
      data: {
        status: "approved",
        razorpay_payment_id: razorpayPaymentId,
        reviewed_at: new Date(),
      },
    }),
    prisma.user.update({
      where: { id: userId },
      data: { plan: request.target_plan },
    }),
  ]);

  // Notify via Redis for real-time UI update
  const payload: UpgradeRequestUpdatePayload = {
    requestId: updatedRequest.id,
    userId: userId,
    status: "approved",
    targetPlan: updatedRequest.target_plan,
  };
  await redis.publish(UPGRADE_REQUEST_CHANNEL, JSON.stringify(payload));

  return { success: true, plan: updatedRequest.target_plan };
}
