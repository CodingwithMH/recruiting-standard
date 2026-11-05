import type {
  PaymentStatus,
  SubscriptionPlan,
  SubscriptionState,
} from "@prisma/client";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { logger } from "../utils/logger.js";

// ----------------------------------------------------
// Billing Constants
// ----------------------------------------------------

export const MONTHLY_PRICE_CENTS = 25_000;
export const ANNUAL_PRICE_CENTS = 150_000;
export const MONTHLY_LATE_FEE_CENTS = 2_500;
export const MONTHLY_LATE_FEE_TAX_RATE = 0.0625;

// ----------------------------------------------------
// Validation Schemas
// ----------------------------------------------------

export const subscriptionListQuerySchema = z.object({
  plan: z.enum(["ANNUAL_1500", "MONTHLY_250"]).optional(),
  state: z
    .enum(["ACTIVE", "SUSPENDED", "CANCELLED", "EXPIRED", "PENDING"])
    .optional(),
});

export const recordSubscriptionPaymentSchema = z.object({
  notes: z.string().max(1000).optional(),
});

export type SubscriptionListQuery = z.infer<typeof subscriptionListQuerySchema>;
export type RecordSubscriptionPaymentInput = z.infer<
  typeof recordSubscriptionPaymentSchema
>;

// ----------------------------------------------------
// Service Errors
// ----------------------------------------------------

export class SubscriptionNotFoundError extends Error {
  statusCode: number;
  constructor(schoolId: string) {
    super(`Subscription for school "${schoolId}" was not found`);
    this.name = "SubscriptionNotFoundError";
    this.statusCode = 404;
  }
}

// ----------------------------------------------------
// Billing Calculations
// ----------------------------------------------------

export interface BillableSubscription {
  plan: SubscriptionPlan;
  paymentStatus: PaymentStatus;
  state: SubscriptionState;
  expirationDate: Date | null;
}

export function planPriceCents(plan: SubscriptionPlan): number {
  return plan === "MONTHLY_250" ? MONTHLY_PRICE_CENTS : ANNUAL_PRICE_CENTS;
}

/**
 * A monthly plan is late once its paid-through date has passed and the
 * subscription is still active. Annual plans are never subject to the fee.
 */
export function isMonthlyPaymentLate(
  subscription: BillableSubscription,
  now: Date = new Date()
): boolean {
  return (
    subscription.plan === "MONTHLY_250" &&
    subscription.state === "ACTIVE" &&
    subscription.paymentStatus !== "WAIVED" &&
    subscription.expirationDate !== null &&
    subscription.expirationDate.getTime() < now.getTime()
  );
}

export interface SubscriptionBill {
  basePriceCents: number;
  lateFeeCents: number;
  lateFeeTaxCents: number;
  lateFeeTotalCents: number;
  amountDueCents: number;
  isLate: boolean;
  effectivePaymentStatus: PaymentStatus;
}

export function calculateLateFeeTax(lateFeeCents: number): number {
  return Math.round(lateFeeCents * MONTHLY_LATE_FEE_TAX_RATE);
}

export function calculateSubscriptionBill(
  subscription: BillableSubscription,
  now: Date = new Date()
): SubscriptionBill {
  const isLate = isMonthlyPaymentLate(subscription, now);
  const lateFeeCents = isLate ? MONTHLY_LATE_FEE_CENTS : 0;
  const lateFeeTaxCents = isLate ? calculateLateFeeTax(lateFeeCents) : 0;
  const lateFeeTotalCents = lateFeeCents + lateFeeTaxCents;
  const basePriceCents = planPriceCents(subscription.plan);

  // A subscription that has already been paid for the current period has
  // nothing due until that period ends. Once the period ends, the next term is
  // due; overdue monthly accounts also owe the late fee and its tax.
  const periodEnded =
    subscription.expirationDate !== null &&
    subscription.expirationDate.getTime() < now.getTime();
  const amountDueCents =
    subscription.paymentStatus === "WAIVED"
      ? 0
      : subscription.paymentStatus === "PAID" && !periodEnded
        ? 0
        : basePriceCents + lateFeeTotalCents;

  return {
    basePriceCents,
    lateFeeCents,
    lateFeeTaxCents,
    lateFeeTotalCents,
    amountDueCents,
    isLate,
    effectivePaymentStatus: isLate ? "OVERDUE" : subscription.paymentStatus,
  };
}

/**
 * Extends the paid-through date by one billing period. Early renewals extend
 * from the existing expiration date; late renewals start from the payment date.
 */
function addBillingPeriodToDate(date: Date, plan: SubscriptionPlan): Date {
  const next = new Date(date);
  const day = next.getDate();

  // Move to the first of the month before changing the month/year so dates
  // like Jan 31 do not overflow into March. The day is clamped to the last
  // valid day of the target month.
  next.setDate(1);

  if (plan === "MONTHLY_250") {
    next.setMonth(next.getMonth() + 1);
  } else {
    next.setFullYear(next.getFullYear() + 1);
  }

  const lastDay = new Date(
    next.getFullYear(),
    next.getMonth() + 1,
    0
  ).getDate();
  next.setDate(Math.min(day, lastDay));

  return next;
}

export function nextBillingDate(
  currentExpiration: Date | null,
  plan: SubscriptionPlan,
  now: Date = new Date()
): Date {
  const base =
    currentExpiration && currentExpiration.getTime() > now.getTime()
      ? currentExpiration
      : now;

  return addBillingPeriodToDate(base, plan);
}

export function formatCents(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

// ----------------------------------------------------
// Service Functions
// ----------------------------------------------------

export async function listSubscriptions(query: SubscriptionListQuery = {}) {
  const subscriptions = await prisma.subscription.findMany({
    where: {
      ...(query.plan ? { plan: query.plan } : {}),
      ...(query.state ? { state: query.state } : {}),
    },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      schoolId: true,
      plan: true,
      paymentStatus: true,
      state: true,
      startDate: true,
      expirationDate: true,
      lastPaymentAt: true,
      lastPaymentAmountCents: true,
      notes: true,
      updatedAt: true,
      school: {
        select: {
          id: true,
          schoolId: true,
          name: true,
          status: true,
          contactEmail: true,
        },
      },
    },
  });

  const now = new Date();

  return subscriptions.map((subscription) => {
    const bill = calculateSubscriptionBill(subscription, now);

    return {
      id: subscription.id,
      schoolId: subscription.schoolId,
      schoolName: subscription.school.name,
      schoolCode: subscription.school.schoolId,
      schoolStatus: subscription.school.status,
      contactEmail: subscription.school.contactEmail,
      plan: subscription.plan,
      paymentStatus: subscription.paymentStatus,
      effectivePaymentStatus: bill.effectivePaymentStatus,
      state: subscription.state,
      startDate: subscription.startDate,
      expirationDate: subscription.expirationDate,
      lastPaymentAt: subscription.lastPaymentAt,
      lastPaymentAmountCents: subscription.lastPaymentAmountCents,
      notes: subscription.notes,
      isLate: bill.isLate,
      basePriceCents: bill.basePriceCents,
      lateFeeCents: bill.lateFeeCents,
      lateFeeTaxCents: bill.lateFeeTaxCents,
      lateFeeTotalCents: bill.lateFeeTotalCents,
      amountDueCents: bill.amountDueCents,
      updatedAt: subscription.updatedAt,
    };
  });
}

export async function recordSubscriptionPayment(
  schoolId: string,
  input: RecordSubscriptionPaymentInput = {}
) {
  const subscription = await prisma.subscription.findUnique({
    where: { schoolId },
    include: { school: { select: { name: true } } },
  });

  if (!subscription) {
    throw new SubscriptionNotFoundError(schoolId);
  }

  const now = new Date();
  const bill = calculateSubscriptionBill(subscription, now);
  const amountPaidCents = bill.basePriceCents + bill.lateFeeTotalCents;
  const expirationDate = nextBillingDate(
    subscription.expirationDate,
    subscription.plan,
    now
  );

  const logParts = [
    `[${now.toISOString()}] Payment recorded: ${formatCents(amountPaidCents)}`,
    bill.lateFeeTotalCents > 0
      ? `includes ${formatCents(bill.lateFeeTotalCents)} late fee (${formatCents(
          bill.lateFeeCents
        )} + ${formatCents(bill.lateFeeTaxCents)} tax)`
      : null,
    input.notes?.trim() ? `notes: ${input.notes.trim()}` : null,
  ].filter((part): part is string => part !== null);

  const entry = logParts.join(" — ");

  const updated = await prisma.subscription.update({
    where: { schoolId },
    data: {
      paymentStatus: "PAID",
      state: "ACTIVE",
      startDate: subscription.startDate ?? now,
      expirationDate,
      lastPaymentAt: now,
      lastPaymentAmountCents: amountPaidCents,
      notes: subscription.notes
        ? `${subscription.notes}\n${entry}`
        : entry,
    },
    select: {
      id: true,
      schoolId: true,
      plan: true,
      paymentStatus: true,
      state: true,
      startDate: true,
      expirationDate: true,
      lastPaymentAt: true,
      lastPaymentAmountCents: true,
      notes: true,
      updatedAt: true,
    },
  });

  logger.info(
    "BILLING",
    `Payment recorded for ${subscription.school.name} (${schoolId}): ${formatCents(amountPaidCents)}${
      bill.lateFeeTotalCents > 0
        ? ` including ${formatCents(bill.lateFeeTotalCents)} late fee`
        : ""
    }`
  );

  return {
    subscription: updated,
    amountPaidCents,
    lateFeeCents: bill.lateFeeCents,
    lateFeeTaxCents: bill.lateFeeTaxCents,
    lateFeeTotalCents: bill.lateFeeTotalCents,
    isLate: bill.isLate,
  };
}
