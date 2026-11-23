import { Request, Response, NextFunction } from "express";
import {
  listSubscriptions,
  listOverdueSubscriptions,
  listUpcomingRenewals,
  subscriptionListQuerySchema,
  renewalDaysQuerySchema,
  recordSubscriptionPayment,
  recordSubscriptionPaymentSchema,
  subscriptionStateUpdateSchema,
  setSubscriptionState,
  getSchoolSubscription,
  manualSubscriptionUpdateSchema,
  updateSubscriptionRecord,
  subscriptionRenewalSchema,
  renewSubscription,
  listPlanOptions,
  listSubscriptionBillingEvents,
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
 * GET /api/v1/subscriptions/plans
 * Public. Describes the manual per-school price options. No provider checkout
 * or automated collection is exposed.
 */
export function handleListPlanOptions(
  _req: Request,
  res: Response
): void {
  res.status(200).json({
    success: true,
    data: listPlanOptions(),
    timestamp: new Date().toISOString(),
  });
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
      paymentStatus:
        typeof req.query.paymentStatus === "string"
          ? req.query.paymentStatus.toUpperCase()
          : undefined,
      view:
        typeof req.query.view === "string"
          ? req.query.view.toUpperCase()
          : undefined,
      renewalDays: req.query.renewalDays,
      schoolId:
        typeof req.query.schoolId === "string"
          ? req.query.schoolId.trim()
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


export async function handleListUpcomingRenewals(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const days =
      typeof req.query.days === "string"
        ? req.query.days
        : typeof req.query.renewalDays === "string"
          ? req.query.renewalDays
          : undefined;

    const parsed = renewalDaysQuerySchema.safeParse({ days });

    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: "Invalid renewal window.",
        details: parsed.error.flatten().fieldErrors,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const subscriptions = await listUpcomingRenewals(parsed.data.days);

    res.status(200).json({
      success: true,
      data: subscriptions,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
}

export async function handleListOverdueSubscriptions(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const subscriptions = await listOverdueSubscriptions();

    res.status(200).json({
      success: true,
      data: subscriptions,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
}

export async function handleUpdateSubscriptionRecord(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parsed = manualSubscriptionUpdateSchema.safeParse(req.body ?? {});

    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: "Invalid subscription details.",
        details: parsed.error.flatten().fieldErrors,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const result = await updateSubscriptionRecord(
      getParam(req.params.schoolId),
      parsed.data
    );

    res.status(200).json({
      success: true,
      message: `Subscription record updated for ${result.subscription.school.name}.`,
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

export async function handleRenewSubscription(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parsed = subscriptionRenewalSchema.safeParse(req.body ?? {});

    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: "Invalid renewal details.",
        details: parsed.error.flatten().fieldErrors,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const result = await renewSubscription(
      getParam(req.params.schoolId),
      parsed.data
    );

    res.status(200).json({
      success: true,
      message: `Subscription renewed through ${new Date(
        result.subscription.expirationDate as Date
      ).toLocaleDateString("en-US")}.`,
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
 * GET /api/v1/subscriptions/:schoolId/events
 * Platform Admin only. Returns the provider-neutral billing event history.
 */
export async function handleListSubscriptionBillingEvents(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const rawLimit =
      typeof req.query.limit === "string" ? Number(req.query.limit) : 50;
    const limit = Number.isFinite(rawLimit)
      ? Math.min(Math.max(Math.trunc(rawLimit), 1), 100)
      : 50;

    const events = await listSubscriptionBillingEvents(
      getParam(req.params.schoolId),
      limit
    );

    res.status(200).json({
      success: true,
      data: events,
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
