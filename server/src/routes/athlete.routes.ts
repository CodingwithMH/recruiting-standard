import { Router } from "express";
import {
  handleListAthleteGuardianLinks,
  handleRespondToGuardianLink,
  handleRevokeAthleteGuardianLink,
} from "../controllers/guardian.controller.js";
import { authenticateToken } from "../middleware/auth.js";
import { requireGlobalRole } from "../middleware/roles.js";

export const athleteRouter = Router();

athleteRouter.use(authenticateToken, requireGlobalRole("ATHLETE"));

athleteRouter.get("/guardian-links", handleListAthleteGuardianLinks);
athleteRouter.post(
  "/guardian-links/:linkId/approve",
  handleRespondToGuardianLink
);
athleteRouter.post(
  "/guardian-links/:linkId/reject",
  handleRespondToGuardianLink
);
athleteRouter.delete(
  "/guardian-links/:linkId",
  handleRevokeAthleteGuardianLink
);

export default athleteRouter;
