-- CreateEnum
CREATE TYPE "BillingProvider" AS ENUM ('MANUAL', 'AUTOMATED');

-- CreateEnum
CREATE TYPE "BillingInterval" AS ENUM ('MONTHLY', 'ANNUAL');

-- CreateEnum
CREATE TYPE "SubscriptionBillingEventType" AS ENUM ('CREATED', 'PAYMENT_RECORDED', 'RENEWED', 'ACTIVATED', 'SUSPENDED', 'CANCELLED', 'EXPIRED', 'STATE_CHANGED', 'PLAN_CHANGED', 'PAYMENT_STATUS_CHANGED', 'TERM_UPDATED', 'INVOICE_CREATED', 'PAYMENT_SUCCEEDED', 'PAYMENT_FAILED', 'REFUNDED', 'WEBHOOK_RECEIVED');

-- CreateTable
CREATE TABLE "SubscriptionPriceOption" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "legacyPlan" "SubscriptionPlan" NOT NULL,
    "name" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "billingInterval" "BillingInterval" NOT NULL,
    "intervalCount" INTEGER NOT NULL DEFAULT 1,
    "lateFeeCents" INTEGER NOT NULL DEFAULT 0,
    "lateFeeTaxRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionPriceOption_pkey" PRIMARY KEY ("id")
);

-- Seed the manual, per-school price options. No automated billing is enabled.
INSERT INTO "SubscriptionPriceOption" ("id", "code", "legacyPlan", "name", "amountCents", "currency", "billingInterval", "intervalCount", "lateFeeCents", "lateFeeTaxRate", "isActive", "effectiveFrom", "createdAt", "updatedAt")
VALUES
    ('11111111-1111-4111-8111-111111111111', 'SCHOOL_ANNUAL', 'ANNUAL_1500', 'Annual School Subscription', 150000, 'USD', 'ANNUAL', 12, 0, 0, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('22222222-2222-4222-8222-222222222222', 'SCHOOL_MONTHLY', 'MONTHLY_250', 'Monthly School Subscription', 25000, 'USD', 'MONTHLY', 1, 2500, 0.0625, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionPriceOption_code_key" ON "SubscriptionPriceOption"("code");
CREATE UNIQUE INDEX "SubscriptionPriceOption_legacyPlan_key" ON "SubscriptionPriceOption"("legacyPlan");
CREATE INDEX "SubscriptionPriceOption_isActive_billingInterval_idx" ON "SubscriptionPriceOption"("isActive", "billingInterval");

-- AlterTable
ALTER TABLE "Subscription"
    ADD COLUMN "priceOptionId" TEXT,
    ADD COLUMN "priceOptionCode" TEXT,
    ADD COLUMN "billingProvider" "BillingProvider" NOT NULL DEFAULT 'MANUAL',
    ADD COLUMN "providerCustomerRef" TEXT,
    ADD COLUMN "providerSubscriptionRef" TEXT,
    ADD COLUMN "providerPriceRef" TEXT,
    ADD COLUMN "billingStatus" TEXT,
    ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'USD',
    ADD COLUMN "amountCents" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "billingInterval" "BillingInterval",
    ADD COLUMN "intervalCount" INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN "currentPeriodStart" TIMESTAMP(3),
    ADD COLUMN "currentPeriodEnd" TIMESTAMP(3),
    ADD COLUMN "nextBillingDate" TIMESTAMP(3),
    ADD COLUMN "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "canceledAt" TIMESTAMP(3),
    ADD COLUMN "autoCollectEnabled" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "billingMetadata" JSONB;

-- Backfill provider-neutral billing fields from the existing manual records.
UPDATE "Subscription" s
SET "priceOptionId" = p."id",
    "priceOptionCode" = p."code",
    "providerPriceRef" = p."code",
    "billingInterval" = p."billingInterval",
    "intervalCount" = p."intervalCount",
    "amountCents" = p."amountCents",
    "currency" = p."currency",
    "currentPeriodStart" = s."startDate",
    "currentPeriodEnd" = s."expirationDate",
    "nextBillingDate" = s."expirationDate",
    "billingStatus" = CASE
        WHEN s."state" = 'CANCELLED' THEN 'CANCELED'
        WHEN s."state" = 'SUSPENDED' THEN 'PAUSED'
        WHEN s."state" = 'EXPIRED' OR (s."state" = 'ACTIVE' AND s."expirationDate" <= CURRENT_TIMESTAMP) THEN 'PAST_DUE'
        WHEN s."state" = 'ACTIVE' THEN 'ACTIVE'
        ELSE 'PENDING'
    END
FROM "SubscriptionPriceOption" p
WHERE p."legacyPlan" = s."plan";

-- CreateTable
CREATE TABLE "SubscriptionBillingEvent" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "type" "SubscriptionBillingEventType" NOT NULL,
    "provider" "BillingProvider" NOT NULL DEFAULT 'MANUAL',
    "providerEventRef" TEXT,
    "idempotencyKey" TEXT,
    "amountCents" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "statusFrom" TEXT,
    "statusTo" TEXT,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubscriptionBillingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionBillingEvent_idempotencyKey_key" ON "SubscriptionBillingEvent"("idempotencyKey");
CREATE INDEX "SubscriptionBillingEvent_subscriptionId_occurredAt_idx" ON "SubscriptionBillingEvent"("subscriptionId", "occurredAt");
CREATE INDEX "SubscriptionBillingEvent_schoolId_occurredAt_idx" ON "SubscriptionBillingEvent"("schoolId", "occurredAt");
CREATE INDEX "SubscriptionBillingEvent_type_idx" ON "SubscriptionBillingEvent"("type");
CREATE INDEX "Subscription_billingProvider_idx" ON "Subscription"("billingProvider");
CREATE INDEX "Subscription_nextBillingDate_idx" ON "Subscription"("nextBillingDate");
CREATE INDEX "Subscription_priceOptionId_idx" ON "Subscription"("priceOptionId");

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_priceOptionId_fkey" FOREIGN KEY ("priceOptionId") REFERENCES "SubscriptionPriceOption"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SubscriptionBillingEvent" ADD CONSTRAINT "SubscriptionBillingEvent_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
