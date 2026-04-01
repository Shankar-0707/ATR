import Razorpay from "razorpay";

const key_id = process.env.RAZORPAY_KEY_ID;
const key_secret = process.env.RAZORPAY_KEY_SECRET;

if (!key_id || !key_secret) {
  console.warn("RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET is not defined in environment variables. Razorpay integration will not work.");
}

export const razorpay = new Razorpay({
  key_id: key_id || "placeholder",
  key_secret: key_secret || "placeholder",
});
