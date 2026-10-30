import { Router } from "express";
import {
  register,
  login,
  me,
  forgotPassword,
  resetPasswordHandler,
} from "../controllers/auth.controller.js";
import { authenticateToken } from "../middleware/auth.js";
import { authRateLimiter } from "../middleware/rateLimiter.js";

export const authRouter = Router();

authRouter.post("/register", authRateLimiter, register);
authRouter.post("/login", authRateLimiter, login);
authRouter.post("/forgot-password", authRateLimiter, forgotPassword);
authRouter.post("/reset-password", authRateLimiter, resetPasswordHandler);
authRouter.get("/me", authenticateToken, me);

export default authRouter;
