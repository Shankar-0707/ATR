import Razorpay from "razorpay";
import { logger } from "./logger.js";

const key_id = process.env.RAZORPAY_KEY_ID;
const key_secret = process.env.RAZORPAY_KEY_SECRET;

if (!key_id || !key_secret) {
  logger.warn(
    "Razorpay credentials are missing; payment integration will be disabled",
  );
}

export const razorpay = new Razorpay({
  key_id: key_id || "placeholder",
  key_secret: key_secret || "placeholder",
});
