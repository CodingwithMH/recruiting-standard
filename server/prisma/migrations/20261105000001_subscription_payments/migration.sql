-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN "lastPaymentAt" TIMESTAMP(3),
ADD COLUMN "lastPaymentAmountCents" INTEGER;
