import { Router } from "express";
import { register, login, me } from "../controllers/auth.controller.js";
import { authenticateToken } from "../middleware/auth.js";
import { authRateLimiter } from "../middleware/rateLimiter.js";

export const authRouter = Router();

authRouter.post("/register", authRateLimiter, register);
authRouter.post("/login", authRateLimiter, login);
authRouter.get("/me", authenticateToken, me);

export default authRouter;
