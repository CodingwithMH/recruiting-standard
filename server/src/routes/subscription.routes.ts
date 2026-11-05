import { Router } from "express";
import {
  handleListSubscriptions,
  handleRecordSubscriptionPayment,
} from "../controllers/subscription.controller.js";
import { authenticateToken } from "../middleware/auth.js";
import { requireGlobalRole } from "../middleware/roles.js";

export const subscriptionRouter = Router();

subscriptionRouter.use(authenticateToken, requireGlobalRole("PLATFORM_ADMIN"));

subscriptionRouter.get("/", handleListSubscriptions);
subscriptionRouter.post("/:schoolId/payments", handleRecordSubscriptionPayment);

export default subscriptionRouter;
