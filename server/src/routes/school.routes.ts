import { Router } from "express";
import { handleSchoolRegistration } from "../controllers/school.controller.js";
import { authRateLimiter } from "../middleware/rateLimiter.js";

export const schoolRouter = Router();

// Public school intake route
schoolRouter.post("/register", authRateLimiter, handleSchoolRegistration);

export default schoolRouter;
