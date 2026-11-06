import { Router } from "express";
import {
  handleListSubscriptions,
  handleRecordSubscriptionPayment,
  handleUpdateSubscriptionState,
  handleGetMySubscription,
} from "../controllers/subscription.controller.js";
import { authenticateToken } from "../middleware/auth.js";
import { requireGlobalRole } from "../middleware/roles.js";
import { requireSchoolTenant } from "../middleware/tenant.js";

export const subscriptionRouter = Router();

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

subscriptionRouter.get("/", handleListSubscriptions);
subscriptionRouter.patch("/:schoolId/state", handleUpdateSubscriptionState);
subscriptionRouter.post("/:schoolId/payments", handleRecordSubscriptionPayment);

export default subscriptionRouter;
