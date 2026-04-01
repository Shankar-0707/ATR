-- AlterTable
ALTER TABLE "UpgradeRequest" ADD COLUMN     "amount" INTEGER,
ADD COLUMN     "razorpay_order_id" TEXT,
ADD COLUMN     "razorpay_payment_id" TEXT;
