import { Router } from "express";
import {
  register,
  login,
  me,
  forgotPassword,
  resetPasswordHandler,
  logout,
  getGuardianAuthorization,
  confirmGuardianAuthorizationHandler,
} from "../controllers/auth.controller.js";
import { authenticateToken } from "../middleware/auth.js";
import { authRateLimiter } from "../middleware/rateLimiter.js";
import { requireActiveSubscription } from "../middleware/subscriptionAccess.js";

export const authRouter = Router();

authRouter.post("/register", authRateLimiter, register);
authRouter.post("/login", authRateLimiter, login);
authRouter.post("/forgot-password", authRateLimiter, forgotPassword);
authRouter.post("/reset-password", authRateLimiter, resetPasswordHandler);
authRouter.get("/guardian-authorization/:token", authRateLimiter, getGuardianAuthorization);
authRouter.post(
  "/guardian-authorization/confirm",
  authRateLimiter,
  confirmGuardianAuthorizationHandler
);
authRouter.post("/logout", authenticateToken, logout);
authRouter.get("/me", authenticateToken, requireActiveSubscription, me);

export default authRouter;
