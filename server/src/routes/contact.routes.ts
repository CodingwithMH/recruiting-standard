import { Router } from "express";
import { handleContactInquiry } from "../controllers/contact.controller.js";
import { contactRateLimiter } from "../middleware/rateLimiter.js";

export const contactRouter = Router();

contactRouter.post("/", contactRateLimiter, handleContactInquiry);

export default contactRouter;
