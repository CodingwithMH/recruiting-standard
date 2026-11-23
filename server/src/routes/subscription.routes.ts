import { Router } from "express";
import {
  handleListSubscriptions,
  handleListOverdueSubscriptions,
  handleListUpcomingRenewals,
  handleRecordSubscriptionPayment,
  handleRenewSubscription,
  handleUpdateSubscriptionRecord,
  handleUpdateSubscriptionState,
  handleGetMySubscription,
  handleListPlanOptions,
  handleListSubscriptionBillingEvents,
} from "../controllers/subscription.controller.js";
import { authenticateToken } from "../middleware/auth.js";
import { requireGlobalRole } from "../middleware/roles.js";
import { requireSchoolTenant } from "../middleware/tenant.js";

export const subscriptionRouter = Router();

// Public plan catalog. No authentication or automated billing is required.
subscriptionRouter.get("/plans", handleListPlanOptions);

// School-staff-accessible endpoint (must come BEFORE the admin-only middleware)
subscriptionRouter.get(
  "/my",
  authenticateToken,
  requireGlobalRole("SCHOOL_STAFF"),
  requireSchoolTenant,
  handleGetMySubscription
);

// All remaining routes require Platform Admin
subscriptionRouter.use(authenticateToken, requireGlobalRole("PLATFORM_ADMIN"));

subscriptionRouter.get("/renewals", handleListUpcomingRenewals);
subscriptionRouter.get("/overdue", handleListOverdueSubscriptions);
subscriptionRouter.get("/:schoolId/events", handleListSubscriptionBillingEvents);
subscriptionRouter.get("/", handleListSubscriptions);
subscriptionRouter.patch("/:schoolId", handleUpdateSubscriptionRecord);
subscriptionRouter.put("/:schoolId", handleUpdateSubscriptionRecord);
subscriptionRouter.patch("/:schoolId/state", handleUpdateSubscriptionState);
subscriptionRouter.post("/:schoolId/renew", handleRenewSubscription);
subscriptionRouter.post("/:schoolId/renewals", handleRenewSubscription);
subscriptionRouter.post("/:schoolId/payments", handleRecordSubscriptionPayment);

export default subscriptionRouter;
