import type { SubscriptionState } from "@prisma/client";

export interface SubscriptionAccessRecord {
  state: SubscriptionState;
  expirationDate: Date | null;
}

export type SubscriptionAccessReason =
  | "ACTIVE"
  | "MISSING"
  | "PENDING"
  | "SUSPENDED"
  | "CANCELLED"
  | "EXPIRED";

export interface SubscriptionAccessDecision {
  allowed: boolean;
  effectiveState: SubscriptionState;
  reason: SubscriptionAccessReason;
  expirationDate: Date | null;
}

/**
 * Treats an ACTIVE subscription whose paid-through date has passed as EXPIRED.
 * This keeps automatic expiration independent from manual admin controls.
 */
export function effectiveSubscriptionState(
  subscription: SubscriptionAccessRecord,
  now: Date = new Date()
): SubscriptionState {
  if (
    subscription.state === "ACTIVE" &&
    subscription.expirationDate !== null &&
    subscription.expirationDate.getTime() <= now.getTime()
  ) {
    return "EXPIRED";
  }

  return subscription.state;
}

/**
 * Recruiting access requires an explicit ACTIVE subscription that has not
 * passed its expiration date. School approval alone is not sufficient.
 */
export function evaluateSubscriptionAccess(
  subscription: SubscriptionAccessRecord | null,
  now: Date = new Date()
): SubscriptionAccessDecision {
  if (!subscription) {
    return {
      allowed: false,
      effectiveState: "PENDING",
      reason: "MISSING",
      expirationDate: null,
    };
  }

  const effectiveState = effectiveSubscriptionState(subscription, now);
  const allowed = effectiveState === "ACTIVE";

  return {
    allowed,
    effectiveState,
    reason: allowed ? "ACTIVE" : effectiveState,
    expirationDate: subscription.expirationDate,
  };
}

export function subscriptionAccessMessage(
  decision: SubscriptionAccessDecision
): string {
  switch (decision.reason) {
    case "MISSING":
      return "An active school subscription is required to access recruiting features.";
    case "PENDING":
      return "Your school subscription is pending activation. Recruiting access will unlock after Platform Admin activation.";
    case "SUSPENDED":
      return "Your school subscription has been suspended. Recruiting access is unavailable until it is reactivated.";
    case "CANCELLED":
      return "Your school subscription has been cancelled. Recruiting access is unavailable.";
    case "EXPIRED":
      return "Your school subscription has expired. Recruiting access will unlock after renewal.";
    default:
      return "Recruiting access is available.";
  }
}
