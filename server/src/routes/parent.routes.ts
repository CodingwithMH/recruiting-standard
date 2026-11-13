import { Router } from "express";
import {
  handleGrantGuardianConsent,
  handleListGuardianLinks,
  handleRequestGuardianLink,
  handleRevokeGuardianLink,
  handleWithdrawGuardianConsent,
} from "../controllers/guardian.controller.js";
import { handleListParentAthleteDocuments } from "../controllers/document.controller.js";
import { authenticateToken } from "../middleware/auth.js";
import { requireGlobalRole } from "../middleware/roles.js";

export const parentRouter = Router();

parentRouter.use(authenticateToken, requireGlobalRole("PARENT"));

parentRouter.get("/links", handleListGuardianLinks);
parentRouter.post("/links", handleRequestGuardianLink);
parentRouter.delete("/links/:linkId", handleRevokeGuardianLink);
parentRouter.post("/links/:linkId/consent", handleGrantGuardianConsent);
parentRouter.delete("/links/:linkId/consent", handleWithdrawGuardianConsent);
parentRouter.get("/links/:linkId/documents", handleListParentAthleteDocuments);

export default parentRouter;
