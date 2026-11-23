import type { BillingInterval, SubscriptionPlan } from "@prisma/client";

export interface PlanOption {
  id: string;
  code: string;
  plan: SubscriptionPlan;
  name: string;
  amountCents: number;
  currency: string;
  billingInterval: BillingInterval;
  intervalCount: number;
  lateFeeCents: number;
  lateFeeTaxRate: number;
  isActive: boolean;
}

export const SUBSCRIPTION_PLAN_OPTIONS: readonly PlanOption[] = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    code: "SCHOOL_ANNUAL",
    plan: "ANNUAL_1500",
    name: "Annual School Subscription",
    amountCents: 150_000,
    currency: "USD",
    billingInterval: "ANNUAL",
    intervalCount: 12,
    lateFeeCents: 0,
    lateFeeTaxRate: 0,
    isActive: true,
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    code: "SCHOOL_MONTHLY",
    plan: "MONTHLY_250",
    name: "Monthly School Subscription",
    amountCents: 25_000,
    currency: "USD",
    billingInterval: "MONTHLY",
    intervalCount: 1,
    lateFeeCents: 2_500,
    lateFeeTaxRate: 0.0625,
    isActive: true,
  },
];

export const SUBSCRIPTION_PLAN_CODES = SUBSCRIPTION_PLAN_OPTIONS.map(
  (option) => option.plan
) as [SubscriptionPlan, ...SubscriptionPlan[]];

export function getPlanOption(plan: SubscriptionPlan): PlanOption {
  const option = SUBSCRIPTION_PLAN_OPTIONS.find((item) => item.plan === plan);

  if (!option) {
    throw new Error(`Unsupported subscription plan: ${plan}`);
  }

  return option;
}

export function listPlanOptions() {
  return SUBSCRIPTION_PLAN_OPTIONS.filter((option) => option.isActive).map(
    (option) => ({
      code: option.code,
      plan: option.plan,
      name: option.name,
      amountCents: option.amountCents,
      currency: option.currency,
      billingInterval: option.billingInterval,
      intervalCount: option.intervalCount,
      label: formatPlanPrice(option),
      automatedProcessing: false,
    })
  );
}

export function formatPlanPrice(option: PlanOption): string {
  const amount = `$${(option.amountCents / 100).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
  const period = option.billingInterval === "ANNUAL" ? "year" : "month";

  return `${amount} / ${period}`;
}

export function planPriceCents(plan: SubscriptionPlan): number {
  return getPlanOption(plan).amountCents;
}

export function planLateFeeCents(plan: SubscriptionPlan): number {
  return getPlanOption(plan).lateFeeCents;
}

export function planLateFeeTaxRate(plan: SubscriptionPlan): number {
  return getPlanOption(plan).lateFeeTaxRate;
}

export function planBillingInterval(plan: SubscriptionPlan): BillingInterval {
  return getPlanOption(plan).billingInterval;
}

export function planIntervalCount(plan: SubscriptionPlan): number {
  return getPlanOption(plan).intervalCount;
}

export function addBillingPeriod(date: Date, plan: SubscriptionPlan): Date {
  const next = new Date(date);
  const day = next.getDate();

  next.setDate(1);

  if (plan === "MONTHLY_250") {
    next.setMonth(next.getMonth() + 1);
  } else {
    next.setFullYear(next.getFullYear() + 1);
  }

  const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(day, lastDay));

  return next;
}

export function billingStatusFromAccess(
  state: string,
  paymentStatus: string,
  isOverdue: boolean
): string {
  if (state === "CANCELLED") return "CANCELED";
  if (state === "SUSPENDED") return "PAUSED";
  if (isOverdue || paymentStatus === "OVERDUE" || state === "EXPIRED") {
    return "PAST_DUE";
  }
  if (state === "ACTIVE") return paymentStatus === "PAID" ? "ACTIVE" : "INCOMPLETE";
  return "PENDING";
}
