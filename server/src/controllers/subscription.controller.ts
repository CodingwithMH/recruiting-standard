import { Request, Response, NextFunction } from "express";
import {
  listSubscriptions,
  subscriptionListQuerySchema,
  recordSubscriptionPayment,
  recordSubscriptionPaymentSchema,
  subscriptionStateUpdateSchema,
  setSubscriptionState,
  getSchoolSubscription,
  SubscriptionNotFoundError,
} from "../services/subscription.service.js";
import type { AuthenticatedRequest } from "../types/index.js";

function getParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }
  return value ?? "";
}

/**
 * GET /api/v1/subscriptions
 * Platform Admin only. Lists school subscriptions with current amounts due,
 * including the $25 late fee for overdue monthly plans.
 */
export async function handleListSubscriptions(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parsed = subscriptionListQuerySchema.safeParse({
      plan:
        typeof req.query.plan === "string"
          ? req.query.plan.toUpperCase()
          : undefined,
      state:
        typeof req.query.state === "string"
          ? req.query.state.toUpperCase()
          : undefined,
    });

    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: "Invalid subscription filter.",
        details: parsed.error.flatten().fieldErrors,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const subscriptions = await listSubscriptions(parsed.data);

    res.status(200).json({
      success: true,
      data: subscriptions,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/subscriptions/:schoolId/payments
 * Platform Admin only. Records a manual payment, automatically applying the
 * $25 late fee when a monthly subscription is past its paid-through date.
 */
export async function handleRecordSubscriptionPayment(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parsed = recordSubscriptionPaymentSchema.safeParse(req.body ?? {});

    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: "Invalid payment details.",
        details: parsed.error.flatten().fieldErrors,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const result = await recordSubscriptionPayment(
      getParam(req.params.schoolId),
      parsed.data
    );

    res.status(200).json({
      success: true,
      message: result.isLate
        ? `Payment recorded with the $25 late fee plus 6.25% tax applied. Amount received: $${(
            result.amountPaidCents / 100
          ).toFixed(2)}.`
        : `Payment recorded successfully. Amount received: $${(
            result.amountPaidCents / 100
          ).toFixed(2)}.`,
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    if (err instanceof SubscriptionNotFoundError) {
      res.status(err.statusCode).json({
        success: false,
        error: err.message,
        timestamp: new Date().toISOString(),
      });
      return;
    }
    next(err);
  }
}

/**
 * PATCH /api/v1/subscriptions/:schoolId/state
 * Platform Admin only. Explicitly activates, suspends, expires, or cancels a
 * school subscription. Activation unlocks recruiting access independently of
 * the school's approval status.
 */
export async function handleUpdateSubscriptionState(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parsed = subscriptionStateUpdateSchema.safeParse(req.body ?? {});

    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: "Invalid subscription state update.",
        details: parsed.error.flatten().fieldErrors,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const result = await setSubscriptionState(
      getParam(req.params.schoolId),
      parsed.data
    );

    res.status(200).json({
      success: true,
      message: `Subscription state updated to ${result.effectiveState}.`,
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    if (err instanceof SubscriptionNotFoundError) {
      res.status(err.statusCode).json({
        success: false,
        error: err.message,
        timestamp: new Date().toISOString(),
      });
      return;
    }
    next(err);
  }
}


/**
 * GET /api/v1/subscriptions/my
 * School staff only. Returns the subscription for the authenticated user's school.
 */
export async function handleGetMySubscription(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const schoolId = req.schoolId;

    if (!schoolId) {
      res.status(400).json({
        success: false,
        error: "No school association found for this account.",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const subscription = await getSchoolSubscription(schoolId);

    res.status(200).json({
      success: true,
      data: subscription,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    if (err instanceof SubscriptionNotFoundError) {
      res.status(err.statusCode).json({
        success: false,
        error: err.message,
        timestamp: new Date().toISOString(),
      });
      return;
    }
    next(err);
  }
}
