import { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../types/index.js";
import { prisma } from "../config/prisma.js";
import {
  evaluateSubscriptionAccess,
  subscriptionAccessMessage,
} from "../utils/subscriptionAccess.js";

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

  if (req.user.globalRole === "PLATFORM_ADMIN") {
    next();
    return;
  }

  let schoolId = req.user.schoolId || req.schoolId;

  if (!schoolId && req.user.globalRole === "PARENT") {
    const link = await prisma.parentAthleteLink.findFirst({
      where: { parentUserId: req.user.userId, status: "ACTIVE" },
      select: {
        athlete: {
          select: {
            schoolId: true,
            memberships: {
              where: { status: "ACTIVE" },
              select: { schoolId: true },
              take: 1,
            },
          },
        },
      },
    });

    schoolId =
      link?.athlete.schoolId ||
      link?.athlete.memberships[0]?.schoolId ||
      undefined;
  }

  if (!schoolId) {
    res.status(403).json({
      success: false,
      error: "Access denied. User is not associated with a school subscription.",
      timestamp: new Date().toISOString(),
    });
    return;
  }

  try {
    let subscription = await prisma.subscription.findUnique({
      where: { schoolId },
      select: { state: true, expirationDate: true },
    });

    if (!subscription) {
      const school = await prisma.school.findUnique({
        where: { schoolId },
        select: {
          subscription: { select: { state: true, expirationDate: true } },
        },
      });
      subscription = school?.subscription ?? null;
    }

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
