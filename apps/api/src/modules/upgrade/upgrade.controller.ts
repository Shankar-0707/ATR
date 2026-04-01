import type { Request, Response } from "express";
import * as upgradeService from "./upgrade.service.js";

export async function createRequest(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    const { targetPlan } = req.body;
    if (!targetPlan || !["pro"].includes(targetPlan)) {
      return res.status(400).json({ error: "Invalid target plan" });
    }
    const request = await upgradeService.createUpgradeRequest(userId, targetPlan);
    res.status(201).json(request);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to create request";
    res.status(400).json({ error: msg });
  }
}

export async function listRequests(req: Request, res: Response) {
  try {
    const { status, take, skip } = req.query;
    const result = await upgradeService.listUpgradeRequests(
      status as string | undefined,
      take ? Number(take) : 20,
      skip ? Number(skip) : 0,
    );
    res.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to list requests";
    res.status(500).json({ error: msg });
  }
}

export async function reviewRequest(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { approve } = req.body;
    if (typeof approve !== "boolean") {
      return res.status(400).json({ error: "approve must be boolean" });
    }
    const adminId = req.user!.id;
    const result = await upgradeService.reviewUpgradeRequest(id, adminId, approve);
    res.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to review request";
    res.status(400).json({ error: msg });
  }
}

export async function myRequests(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    const requests = await upgradeService.getUserUpgradeRequests(userId);
    res.json(requests);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch requests";
    res.status(500).json({ error: msg });
  }
}

export async function createOrder(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    const { targetPlan } = req.body;
    const orderData = await upgradeService.createRazorpayOrder(userId, targetPlan);
    res.json(orderData);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to create payment order";
    res.status(400).json({ error: msg });
  }
}

export async function verifyPayment(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: "Missing payment verification details" });
    }

    const result = await upgradeService.verifyRazorpayPayment(
      userId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    );
    res.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Payment verification failed";
    res.status(400).json({ error: msg });
  }
}
