import { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../types/index.js";
import { prisma } from "../config/prisma.js";
import {
  evaluateSubscriptionAccess,
  subscriptionAccessMessage,
} from "../utils/subscriptionAccess.js";

/**
 * Blocks recruiting features when the school's subscription is not active.
 * Subscription status is intentionally independent from school approval:
 * an APPROVED school can still be denied with HTTP 402 until it pays or is
 * explicitly activated by a Platform Admin.
 */
export async function requireActiveSubscription(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: "Authentication required.",
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Platform Admins have whole-platform oversight and bypass billing gates.
  if (req.user.globalRole === "PLATFORM_ADMIN") {
    next();
    return;
  }

  const schoolId = req.user.schoolId || req.schoolId;

  if (!schoolId) {
    res.status(403).json({
      success: false,
      error: "Access denied. User is not associated with a school subscription.",
      timestamp: new Date().toISOString(),
    });
    return;
  }

  try {
    const subscription = await prisma.subscription.findUnique({
      where: { schoolId },
      select: { state: true, expirationDate: true },
    });

    const decision = evaluateSubscriptionAccess(subscription);

    if (!decision.allowed) {
      res.status(402).json({
        success: false,
        error: subscriptionAccessMessage(decision),
        code: "SUBSCRIPTION_INACTIVE",
        subscriptionState: decision.effectiveState,
        expirationDate: decision.expirationDate,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    next();
  } catch (error) {
    next(error);
  }
}
