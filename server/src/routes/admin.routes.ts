import { Router } from "express";
import {
  handleListDocumentsForReview,
  handleReviewDocument,
} from "../controllers/document.controller.js";
import {
  handleListAthleteVerifications,
  handleReviewAthleteVerification,
} from "../controllers/athleteVerification.controller.js";
import { authenticateToken } from "../middleware/auth.js";
import { requireGlobalRole } from "../middleware/roles.js";

export const adminRouter = Router();

adminRouter.use(authenticateToken, requireGlobalRole("PLATFORM_ADMIN"));

adminRouter.get("/documents", handleListDocumentsForReview);
adminRouter.patch("/documents/:documentId/review", handleReviewDocument);

adminRouter.get("/athlete-verifications", handleListAthleteVerifications);
adminRouter.patch(
  "/athlete-verifications/:athleteProfileId/review",
  handleReviewAthleteVerification
);

export default adminRouter;
