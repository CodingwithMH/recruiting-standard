import {
  Prisma,
  type PaymentStatus,
  type SubscriptionBillingEventType,
  type SubscriptionPlan,
  type SubscriptionState,
} from "@prisma/client";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { logger } from "../utils/logger.js";
import { isValidSchoolId } from "../utils/schoolId.js";
import {
  effectiveSubscriptionState,
  evaluateSubscriptionAccess,
} from "../utils/subscriptionAccess.js";
import {
  SUBSCRIPTION_PLAN_CODES,
  addBillingPeriod,
  billingStatusFromAccess,
  getPlanOption,
  listPlanOptions,
  planLateFeeTaxRate,
  planPriceCents,
} from "./billingCatalog.js";

export { listPlanOptions, planPriceCents };

// ----------------------------------------------------
// Billing Constants
// ----------------------------------------------------

export const MONTHLY_PRICE_CENTS = planPriceCents("MONTHLY_250");
export const ANNUAL_PRICE_CENTS = planPriceCents("ANNUAL_1500");
export const MONTHLY_LATE_FEE_CENTS = getPlanOption("MONTHLY_250").lateFeeCents;
export const MONTHLY_LATE_FEE_TAX_RATE = planLateFeeTaxRate("MONTHLY_250");

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// ----------------------------------------------------
// Validation Schemas
// ----------------------------------------------------

const PAYMENT_STATUSES = ["PAID", "PENDING", "OVERDUE", "WAIVED"] as const;
const SUBSCRIPTION_STATES = [
  "ACTIVE",
  "SUSPENDED",
  "CANCELLED",
  "EXPIRED",
  "PENDING",
] as const;

export const subscriptionListQuerySchema = z.object({
  plan: z.enum(SUBSCRIPTION_PLAN_CODES).optional(),
  state: z.enum(SUBSCRIPTION_STATES).optional(),
  paymentStatus: z.enum(PAYMENT_STATUSES).optional(),
  view: z.enum(["ALL", "UPCOMING_RENEWALS", "OVERDUE"]).default("ALL"),
  renewalDays: z.coerce.number().int().min(1).max(365).default(30),
  schoolId: z.string().trim().min(1).max(100).optional(),
});

export const renewalDaysQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).default(30),
});

export const recordSubscriptionPaymentSchema = z.object({
  amountCents: z.number().int().positive().max(100_000_000).optional(),
  notes: z.string().max(1000).optional(),
});

export const subscriptionStateUpdateSchema = z
  .object({
    state: z.enum(["ACTIVE", "SUSPENDED", "EXPIRED", "CANCELLED"]),
    paymentStatus: z.enum(PAYMENT_STATUSES).optional(),
    startDate: z.coerce.date().optional(),
    expirationDate: z.coerce.date().nullable().optional(),
    notes: z.string().max(1000).optional(),
  })
  .refine(
    (data) =>
      data.state !== "ACTIVE" || data.expirationDate === undefined || data.expirationDate !== null,
    {
      message: "An active subscription requires an expiration date",
      path: ["expirationDate"],
    }
  );

export const manualSubscriptionUpdateSchema = z
  .object({
    plan: z.enum(SUBSCRIPTION_PLAN_CODES).optional(),
    paymentStatus: z.enum(PAYMENT_STATUSES).optional(),
    startDate: z.coerce.date().nullable().optional(),
    expirationDate: z.coerce.date().nullable().optional(),
    notes: z.string().max(1000).optional(),
  })
  .refine(
    (data) =>
      Object.keys(data).some((key) => key !== "notes") || Boolean(data.notes?.trim()),
    {
      message: "At least one subscription field or a note is required",
      path: [],
    }
  );

export const subscriptionRenewalSchema = z.object({
  startDate: z.coerce.date().optional(),
  expirationDate: z.coerce.date().optional(),
  paymentStatus: z.enum(PAYMENT_STATUSES).default("PAID"),
  amountCents: z.number().int().positive().max(100_000_000).optional(),
  notes: z.string().max(1000).optional(),
});

export type SubscriptionListQuery = z.input<typeof subscriptionListQuerySchema>;
export type RenewalDaysQuery = z.infer<typeof renewalDaysQuerySchema>;
export type RecordSubscriptionPaymentInput = z.infer<
  typeof recordSubscriptionPaymentSchema
>;
export type SubscriptionStateUpdateInput = z.infer<
  typeof subscriptionStateUpdateSchema
>;
export type ManualSubscriptionUpdateInput = z.infer<
  typeof manualSubscriptionUpdateSchema
>;
export type SubscriptionRenewalInput = z.infer<typeof subscriptionRenewalSchema>;

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

export class SubscriptionValidationError extends Error {
  statusCode: number;
  constructor(message: string) {
    super(message);
    this.name = "SubscriptionValidationError";
    this.statusCode = 400;
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

/**
 * A plan with a configured late fee is late once its paid-through date has
 * passed and the subscription is still active.
 */
export function isMonthlyPaymentLate(
  subscription: BillableSubscription,
  now: Date = new Date()
): boolean {
  const option = getPlanOption(subscription.plan);

  return (
    option.lateFeeCents > 0 &&
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

export function calculateLateFeeTax(
  lateFeeCents: number,
  plan: SubscriptionPlan = "MONTHLY_250"
): number {
  return Math.round(lateFeeCents * planLateFeeTaxRate(plan));
}

export function calculateSubscriptionBill(
  subscription: BillableSubscription,
  now: Date = new Date()
): SubscriptionBill {
  const option = getPlanOption(subscription.plan);
  const isLate = isMonthlyPaymentLate(subscription, now);
  const lateFeeCents = isLate ? option.lateFeeCents : 0;
  const lateFeeTaxCents = isLate
    ? Math.round(lateFeeCents * option.lateFeeTaxRate)
    : 0;
  const lateFeeTotalCents = lateFeeCents + lateFeeTaxCents;
  const basePriceCents = option.amountCents;

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

export function nextBillingDate(
  currentExpiration: Date | null,
  plan: SubscriptionPlan,
  now: Date = new Date()
): Date {
  const base =
    currentExpiration && currentExpiration.getTime() > now.getTime()
      ? currentExpiration
      : now;

  return addBillingPeriod(base, plan);
}

export function formatCents(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

// ----------------------------------------------------
// Internal Helpers
// ----------------------------------------------------

const subscriptionInclude = {
  school: {
    select: {
      id: true,
      schoolId: true,
      name: true,
      status: true,
      contactEmail: true,
    },
  },
} as const;

const subscriptionDetailSelect = {
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
  priceOptionId: true,
  priceOptionCode: true,
  billingProvider: true,
  billingInterval: true,
  intervalCount: true,
  currency: true,
  amountCents: true,
  currentPeriodStart: true,
  currentPeriodEnd: true,
  nextBillingDate: true,
  billingStatus: true,
  cancelAtPeriodEnd: true,
  canceledAt: true,
  autoCollectEnabled: true,
} as const;

type SubscriptionWithSchool = Prisma.SubscriptionGetPayload<{
  include: typeof subscriptionInclude;
}>;

async function findSubscription(
  identifier: string
): Promise<SubscriptionWithSchool | null> {
  if (isValidSchoolId(identifier)) {
    return prisma.subscription.findFirst({
      where: {
        OR: [
          { schoolCode: identifier },
          { school: { schoolId: identifier } },
        ],
      },
      include: subscriptionInclude,
    });
  }

  return prisma.subscription.findUnique({
    where: { schoolId: identifier },
    include: subscriptionInclude,
  });
}

function requireSubscription(
  subscription: SubscriptionWithSchool | null,
  identifier: string
): SubscriptionWithSchool {
  if (!subscription) {
    throw new SubscriptionNotFoundError(identifier);
  }

  return subscription;
}

function validateDateRange(startDate: Date | null, expirationDate: Date | null): void {
  if (startDate && expirationDate && expirationDate.getTime() <= startDate.getTime()) {
    throw new SubscriptionValidationError(
      "Expiration date must be after the subscription start date"
    );
  }
}

function appendNote(existing: string | null, entry: string): string {
  return existing ? `${existing}\n${entry}` : entry;
}

function dateLabel(value: Date | null): string {
  return value ? value.toISOString().slice(0, 10) : "none";
}

function daysUntil(value: Date | null, now: Date): number | null {
  if (!value) return null;
  return Math.ceil((value.getTime() - now.getTime()) / MS_PER_DAY);
}

function isOverdue(
  subscription: BillableSubscription,
  bill: SubscriptionBill,
  now: Date
): boolean {
  if (subscription.state === "CANCELLED") return false;
  if (bill.effectivePaymentStatus === "OVERDUE") return true;

  return (
    subscription.expirationDate !== null &&
    subscription.expirationDate.getTime() <= now.getTime() &&
    bill.amountDueCents > 0
  );
}

function isUpcomingRenewal(
  subscription: BillableSubscription,
  access: { effectiveState: SubscriptionState },
  windowDays: number,
  now: Date
): boolean {
  if (access.effectiveState !== "ACTIVE" || !subscription.expirationDate) {
    return false;
  }

  const remaining = subscription.expirationDate.getTime() - now.getTime();
  return remaining > 0 && remaining <= windowDays * MS_PER_DAY;
}

function billingSnapshot(
  plan: SubscriptionPlan,
  state: SubscriptionState,
  paymentStatus: PaymentStatus,
  startDate: Date | null,
  expirationDate: Date | null,
  now: Date = new Date()
) {
  const option = getPlanOption(plan);
  const bill = calculateSubscriptionBill(
    { plan, state, paymentStatus, expirationDate },
    now
  );
  const overdue = isOverdue(
    { plan, state, paymentStatus, expirationDate },
    bill,
    now
  );
  const billingStatus = billingStatusFromAccess(state, paymentStatus, overdue);

  return {
    billingStatus,
    priceOptionId: option.id,
    priceOptionCode: option.code,
    providerPriceRef: option.code,
    billingProvider: "MANUAL" as const,
    billingInterval: option.billingInterval,
    intervalCount: option.intervalCount,
    currency: option.currency,
    amountCents: option.amountCents,
    currentPeriodStart: startDate,
    currentPeriodEnd: expirationDate,
    nextBillingDate: expirationDate,
    autoCollectEnabled: false,
    billingMetadata: {
      source: "MANUAL_ADMIN",
      priceOptionCode: option.code,
      intervalCount: option.intervalCount,
      amountCents: option.amountCents,
      currency: option.currency,
      billingStatus,
    } satisfies Prisma.InputJsonValue,
  };
}

interface BillingEventInput {
  subscriptionId: string;
  schoolId: string;
  type: SubscriptionBillingEventType;
  description: string;
  amountCents?: number | null;
  currency?: string;
  periodStart?: Date | null;
  periodEnd?: Date | null;
  statusFrom?: string | null;
  statusTo?: string | null;
  metadata?: Prisma.InputJsonValue;
}

async function recordBillingEvent(input: BillingEventInput): Promise<void> {
  if (process.env.NODE_ENV === "test" && process.env.BILLING_EVENTS_IN_TESTS !== "true") {
    return;
  }

  try {
    await prisma.subscriptionBillingEvent.create({
      data: {
        subscriptionId: input.subscriptionId,
        schoolId: input.schoolId,
        type: input.type,
        provider: "MANUAL",
        amountCents: input.amountCents ?? null,
        currency: input.currency ?? "USD",
        periodStart: input.periodStart ?? null,
        periodEnd: input.periodEnd ?? null,
        statusFrom: input.statusFrom ?? null,
        statusTo: input.statusTo ?? null,
        description: input.description,
        metadata: input.metadata,
      },
    });
  } catch (error) {
    logger.warn(
      "BILLING",
      `Unable to append billing event ${input.type}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

// ----------------------------------------------------
// Service Functions
// ----------------------------------------------------

/**
 * Returns the subscription for a single school, including billing calculations.
 * Intended for school-staff-facing portal endpoints.
 */
export async function getSchoolSubscription(schoolId: string) {
  const subscription = requireSubscription(await findSubscription(schoolId), schoolId);

  const now = new Date();
  const bill = calculateSubscriptionBill(subscription, now);
  const access = evaluateSubscriptionAccess(subscription, now);

  return {
    id: subscription.id,
    schoolId: subscription.schoolId,
    schoolName: subscription.school.name,
    schoolCode: subscription.schoolCode || subscription.school.schoolId,
    plan: subscription.plan,
    planPriceCents: bill.basePriceCents,
    priceOptionId: subscription.priceOptionId,
    priceOptionCode: subscription.priceOptionCode,
    billingProvider: subscription.billingProvider,
    billingStatus: subscription.billingStatus,
    billingInterval: subscription.billingInterval,
    nextBillingDate: subscription.nextBillingDate,
    autoCollectEnabled: subscription.autoCollectEnabled,
    paymentStatus: subscription.paymentStatus,
    effectivePaymentStatus: bill.effectivePaymentStatus,
    state: subscription.state,
    effectiveState: access.effectiveState,
    accessAllowed: access.allowed,
    startDate: subscription.startDate,
    expirationDate: subscription.expirationDate,
    daysUntilExpiration: daysUntil(subscription.expirationDate, now),
    isOverdue: isOverdue(subscription, bill, now),
    isUpcomingRenewal: isUpcomingRenewal(
      subscription,
      access,
      30,
      now
    ),
    lastPaymentAt: subscription.lastPaymentAt,
    lastPaymentAmountCents: subscription.lastPaymentAmountCents,
    basePriceCents: bill.basePriceCents,
    amountDueCents: bill.amountDueCents,
    isLate: bill.isLate,
    updatedAt: subscription.updatedAt,
  };
}

export async function listSubscriptions(query: SubscriptionListQuery = {}) {
  const view = query.view ?? "ALL";
  const windowDays = query.renewalDays ?? 30;

  const subscriptions = await prisma.subscription.findMany({
    where: {
      ...(query.plan ? { plan: query.plan } : {}),
      ...(query.paymentStatus ? { paymentStatus: query.paymentStatus } : {}),
    },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      schoolId: true,
      schoolCode: true,
      plan: true,
      paymentStatus: true,
      state: true,
      startDate: true,
      expirationDate: true,
      lastPaymentAt: true,
      lastPaymentAmountCents: true,
      notes: true,
      updatedAt: true,
      priceOptionId: true,
      priceOptionCode: true,
      billingProvider: true,
      billingStatus: true,
      nextBillingDate: true,
      autoCollectEnabled: true,
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

  return subscriptions
    .map((subscription) => {
      const bill = calculateSubscriptionBill(subscription, now);
      const access = evaluateSubscriptionAccess(subscription, now);
      const overdue = isOverdue(subscription, bill, now);
      const upcoming = isUpcomingRenewal(subscription, access, windowDays, now);

      return {
        id: subscription.id,
        schoolId: subscription.schoolId,
        schoolName: subscription.school.name,
        schoolCode: subscription.schoolCode || subscription.school.schoolId,
        schoolStatus: subscription.school.status,
        contactEmail: subscription.school.contactEmail,
        plan: subscription.plan,
        planPriceCents: bill.basePriceCents,
        paymentStatus: subscription.paymentStatus,
        effectivePaymentStatus: bill.effectivePaymentStatus,
        state: subscription.state,
        effectiveState: access.effectiveState,
        accessAllowed: access.allowed,
        startDate: subscription.startDate,
        expirationDate: subscription.expirationDate,
        daysUntilExpiration: daysUntil(subscription.expirationDate, now),
        nextRenewalDate: nextBillingDate(
          subscription.expirationDate,
          subscription.plan,
          now
        ),
        isOverdue: overdue,
        isUpcomingRenewal: upcoming,
        lastPaymentAt: subscription.lastPaymentAt,
        lastPaymentAmountCents: subscription.lastPaymentAmountCents,
        notes: subscription.notes,
        isLate: bill.isLate,
        basePriceCents: bill.basePriceCents,
        lateFeeCents: bill.lateFeeCents,
        lateFeeTaxCents: bill.lateFeeTaxCents,
        lateFeeTotalCents: bill.lateFeeTotalCents,
        amountDueCents: bill.amountDueCents,
        priceOptionId: subscription.priceOptionId,
        priceOptionCode: subscription.priceOptionCode,
        billingProvider: subscription.billingProvider,
        billingStatus: subscription.billingStatus,
        nextBillingDate: subscription.nextBillingDate,
        autoCollectEnabled: subscription.autoCollectEnabled,
        updatedAt: subscription.updatedAt,
      };
    })
    .filter((subscription) => {
      if (
        query.schoolId &&
        subscription.schoolId !== query.schoolId &&
        subscription.schoolCode !== query.schoolId
      ) {
        return false;
      }

      if (query.state && subscription.effectiveState !== query.state) {
        return false;
      }

      if (view === "UPCOMING_RENEWALS") return subscription.isUpcomingRenewal;
      if (view === "OVERDUE") return subscription.isOverdue;
      return true;
    })
    .sort((a, b) => {
      if (view === "UPCOMING_RENEWALS" || view === "OVERDUE") {
        const aTime = a.expirationDate?.getTime() ?? Number.MAX_SAFE_INTEGER;
        const bTime = b.expirationDate?.getTime() ?? Number.MAX_SAFE_INTEGER;
        return aTime - bTime;
      }

      return b.updatedAt.getTime() - a.updatedAt.getTime();
    });
}

export async function listUpcomingRenewals(days: number = 30) {
  return listSubscriptions({ view: "UPCOMING_RENEWALS", renewalDays: days });
}

export async function listOverdueSubscriptions() {
  return listSubscriptions({ view: "OVERDUE" });
}

export async function recordSubscriptionPayment(
  schoolId: string,
  input: RecordSubscriptionPaymentInput = {}
) {
  const subscription = requireSubscription(
    await findSubscription(schoolId),
    schoolId
  );

  const now = new Date();
  const bill = calculateSubscriptionBill(subscription, now);
  const calculatedAmountCents = bill.basePriceCents + bill.lateFeeTotalCents;
  const amountPaidCents = input.amountCents ?? calculatedAmountCents;
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

  const nextStartDate = subscription.startDate ?? now;
  const billing = billingSnapshot(
    subscription.plan,
    "ACTIVE",
    "PAID",
    nextStartDate,
    expirationDate,
    now
  );

  const updated = await prisma.subscription.update({
    where: { schoolId: subscription.schoolId },
    data: {
      paymentStatus: "PAID",
      state: "ACTIVE",
      startDate: nextStartDate,
      expirationDate,
      lastPaymentAt: now,
      lastPaymentAmountCents: amountPaidCents,
      notes: appendNote(subscription.notes, logParts.join(" — ")),
      ...billing,
    },
    select: subscriptionDetailSelect,
  });

  await recordBillingEvent({
    subscriptionId: updated.id,
    schoolId: updated.schoolId,
    type: "PAYMENT_RECORDED",
    description: logParts.join(" — "),
    amountCents: amountPaidCents,
    currency: billing.currency,
    periodStart: nextStartDate,
    periodEnd: expirationDate,
    statusFrom:
      subscription.billingStatus ??
      billingStatusFromAccess(subscription.state, subscription.paymentStatus, bill.isLate),
    statusTo: billing.billingStatus,
    metadata: billing.billingMetadata,
  });

  logger.info(
    "BILLING",
    `Payment recorded for ${subscription.school.name} (${subscription.school.schoolId ?? subscription.schoolId}): ${formatCents(amountPaidCents)}${
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

/**
 * Applies an explicit Platform Admin state change. Activation without an
 * explicit expiration resumes an unexpired period or starts a new one.
 */
export async function setSubscriptionState(
  schoolId: string,
  input: SubscriptionStateUpdateInput
) {
  const subscription = requireSubscription(
    await findSubscription(schoolId),
    schoolId
  );

  const now = new Date();
  let expirationDate = subscription.expirationDate;

  if (input.state === "ACTIVE") {
    expirationDate =
      input.expirationDate !== undefined
        ? input.expirationDate
        : expirationDate && expirationDate.getTime() > now.getTime()
          ? expirationDate
          : nextBillingDate(expirationDate, subscription.plan, now);
  } else if (input.state === "EXPIRED") {
    expirationDate = input.expirationDate ?? now;
  } else if (input.expirationDate !== undefined) {
    expirationDate = input.expirationDate;
  }

  const startDate =
    input.startDate ??
    subscription.startDate ??
    (input.state === "ACTIVE" ? now : null);
  const paymentStatus = input.paymentStatus ?? subscription.paymentStatus;

  validateDateRange(startDate, expirationDate);

  const previousEffectiveState = effectiveSubscriptionState(subscription, now);
  const details = [
    input.paymentStatus && input.paymentStatus !== subscription.paymentStatus
      ? `payment ${subscription.paymentStatus} -> ${input.paymentStatus}`
      : null,
    input.startDate
      ? `start ${dateLabel(subscription.startDate)} -> ${dateLabel(input.startDate)}`
      : null,
    input.expirationDate !== undefined
      ? `expiration ${dateLabel(subscription.expirationDate)} -> ${dateLabel(input.expirationDate)}`
      : null,
    input.notes?.trim() ? `notes: ${input.notes.trim()}` : null,
  ].filter((part): part is string => part !== null);

  const entry = [
    `[${now.toISOString()}] Subscription state changed: ${previousEffectiveState} -> ${input.state}`,
    ...details,
  ].join(" - ");

  const billing = billingSnapshot(
    subscription.plan,
    input.state,
    paymentStatus,
    startDate,
    expirationDate,
    now
  );

  const updated = await prisma.subscription.update({
    where: { schoolId: subscription.schoolId },
    data: {
      state: input.state,
      paymentStatus,
      startDate,
      expirationDate,
      notes: appendNote(subscription.notes, entry),
      canceledAt: input.state === "CANCELLED" ? now : null,
      cancelAtPeriodEnd: false,
      ...billing,
    },
    select: {
      ...subscriptionDetailSelect,
      school: subscriptionInclude.school,
    },
  });

  await recordBillingEvent({
    subscriptionId: updated.id,
    schoolId: updated.schoolId,
    type:
      input.state === "ACTIVE"
        ? "ACTIVATED"
        : input.state === "SUSPENDED"
          ? "SUSPENDED"
          : input.state === "CANCELLED"
            ? "CANCELLED"
            : "EXPIRED",
    description: entry,
    periodStart: startDate,
    periodEnd: expirationDate,
    statusFrom: previousEffectiveState,
    statusTo: billing.billingStatus,
    metadata: billing.billingMetadata,
  });

  logger.info(
    "BILLING",
    `Subscription for ${subscription.school.name} (${subscription.school.schoolId ?? subscription.schoolId}) set to ${input.state}`
  );

  const access = evaluateSubscriptionAccess(updated, now);

  return {
    subscription: updated,
    effectiveState: access.effectiveState,
    accessAllowed: access.allowed,
  };
}

/**
 * Records the manually collected billing details for a school: plan, payment
 * status, start date, expiration date, and an audit note.
 */
export async function updateSubscriptionRecord(
  identifier: string,
  input: ManualSubscriptionUpdateInput
) {
  const subscription = requireSubscription(
    await findSubscription(identifier),
    identifier
  );

  const plan = input.plan ?? subscription.plan;
  const paymentStatus = input.paymentStatus ?? subscription.paymentStatus;
  const startDate =
    input.startDate === undefined ? subscription.startDate : input.startDate;
  const expirationDate =
    input.expirationDate === undefined
      ? subscription.expirationDate
      : input.expirationDate;

  validateDateRange(startDate, expirationDate);

  if (subscription.state === "ACTIVE" && !expirationDate) {
    throw new SubscriptionValidationError(
      "An active subscription requires an expiration date"
    );
  }

  const changes = [
    input.plan && input.plan !== subscription.plan
      ? `plan ${subscription.plan} -> ${input.plan}`
      : null,
    input.paymentStatus && input.paymentStatus !== subscription.paymentStatus
      ? `payment ${subscription.paymentStatus} -> ${input.paymentStatus}`
      : null,
    input.startDate !== undefined
      ? `start ${dateLabel(subscription.startDate)} -> ${dateLabel(startDate)}`
      : null,
    input.expirationDate !== undefined
      ? `expiration ${dateLabel(subscription.expirationDate)} -> ${dateLabel(expirationDate)}`
      : null,
  ].filter((part): part is string => part !== null);

  const now = new Date();
  const entry = [
    `[${now.toISOString()}] Subscription record updated`,
    changes.length > 0 ? changes.join(", ") : null,
    input.notes?.trim() ? `notes: ${input.notes.trim()}` : null,
  ]
    .filter((part): part is string => part !== null)
    .join(" - ");

  const billing = billingSnapshot(
    plan,
    subscription.state,
    paymentStatus,
    startDate,
    expirationDate,
    now
  );

  const updated = await prisma.subscription.update({
    where: { schoolId: subscription.schoolId },
    data: {
      plan,
      paymentStatus,
      startDate,
      expirationDate,
      notes: appendNote(subscription.notes, entry),
      ...billing,
    },
    select: {
      ...subscriptionDetailSelect,
      school: subscriptionInclude.school,
    },
  });

  await recordBillingEvent({
    subscriptionId: updated.id,
    schoolId: updated.schoolId,
    type:
      input.plan && input.plan !== subscription.plan
        ? "PLAN_CHANGED"
        : input.paymentStatus && input.paymentStatus !== subscription.paymentStatus
          ? "PAYMENT_STATUS_CHANGED"
          : "TERM_UPDATED",
    description: entry,
    periodStart: startDate,
    periodEnd: expirationDate,
    statusFrom:
      subscription.billingStatus ??
      billingStatusFromAccess(subscription.state, subscription.paymentStatus, false),
    statusTo: billing.billingStatus,
    metadata: billing.billingMetadata,
  });

  const bill = calculateSubscriptionBill(updated, now);
  const access = evaluateSubscriptionAccess(updated, now);

  logger.info(
    "BILLING",
    `Subscription record updated for ${subscription.school.name} (${subscription.school.schoolId ?? subscription.schoolId})`
  );

  return {
    subscription: updated,
    planPriceCents: bill.basePriceCents,
    effectivePaymentStatus: bill.effectivePaymentStatus,
    effectiveState: access.effectiveState,
    accessAllowed: access.allowed,
  };
}

/**
 * Manually renews a school subscription for one billing period. An explicit
 * expiration date lets the admin record a custom term agreed with the school.
 */
export async function renewSubscription(
  identifier: string,
  input: SubscriptionRenewalInput
) {
  const subscription = requireSubscription(
    await findSubscription(identifier),
    identifier
  );

  const now = new Date();
  const bill = calculateSubscriptionBill(subscription, now);
  const expirationDate =
    input.expirationDate ??
    nextBillingDate(subscription.expirationDate, subscription.plan, now);
  const startDate = input.startDate ?? subscription.startDate ?? now;

  validateDateRange(startDate, expirationDate);

  const amountPaidCents =
    input.paymentStatus === "PAID"
      ? (input.amountCents ?? bill.basePriceCents + bill.lateFeeTotalCents)
      : null;
  const recordedAmountCents = amountPaidCents ?? subscription.lastPaymentAmountCents;

  const entry = [
    `[${now.toISOString()}] Subscription renewed through ${dateLabel(expirationDate)}`,
    `payment ${input.paymentStatus}`,
    amountPaidCents !== null
      ? `amount recorded: ${formatCents(amountPaidCents)}`
      : null,
    input.notes?.trim() ? `notes: ${input.notes.trim()}` : null,
  ]
    .filter((part): part is string => part !== null)
    .join(" — ");

  const billing = billingSnapshot(
    subscription.plan,
    "ACTIVE",
    input.paymentStatus,
    startDate,
    expirationDate,
    now
  );

  const updated = await prisma.subscription.update({
    where: { schoolId: subscription.schoolId },
    data: {
      state: "ACTIVE",
      paymentStatus: input.paymentStatus,
      startDate,
      expirationDate,
      ...(amountPaidCents !== null
        ? { lastPaymentAt: now, lastPaymentAmountCents: amountPaidCents }
        : {}),
      notes: appendNote(subscription.notes, entry),
      canceledAt: null,
      cancelAtPeriodEnd: false,
      ...billing,
    },
    select: {
      ...subscriptionDetailSelect,
      school: subscriptionInclude.school,
    },
  });

  await recordBillingEvent({
    subscriptionId: updated.id,
    schoolId: updated.schoolId,
    type: "RENEWED",
    description: entry,
    amountCents: amountPaidCents,
    currency: billing.currency,
    periodStart: startDate,
    periodEnd: expirationDate,
    statusFrom:
      subscription.billingStatus ??
      billingStatusFromAccess(subscription.state, subscription.paymentStatus, bill.isLate),
    statusTo: billing.billingStatus,
    metadata: billing.billingMetadata,
  });

  logger.info(
    "BILLING",
    `Subscription renewed for ${subscription.school.name} (${subscription.school.schoolId ?? subscription.schoolId}) through ${dateLabel(expirationDate)}`
  );

  const access = evaluateSubscriptionAccess(updated, now);

  return {
    subscription: updated,
    amountPaidCents: recordedAmountCents,
    lateFeeCents: bill.lateFeeCents,
    lateFeeTaxCents: bill.lateFeeTaxCents,
    lateFeeTotalCents: bill.lateFeeTotalCents,
    effectiveState: access.effectiveState,
    accessAllowed: access.allowed,
  };
}

export async function listSubscriptionBillingEvents(
  identifier: string,
  limit: number = 50
) {
  const subscription = requireSubscription(await findSubscription(identifier), identifier);

  return prisma.subscriptionBillingEvent.findMany({
    where: { subscriptionId: subscription.id },
    orderBy: { occurredAt: "desc" },
    take: limit,
    select: {
      id: true,
      type: true,
      provider: true,
      amountCents: true,
      currency: true,
      periodStart: true,
      periodEnd: true,
      statusFrom: true,
      statusTo: true,
      description: true,
      metadata: true,
      occurredAt: true,
    },
  });
}
