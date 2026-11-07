import { Router } from "express";
import {
  handleListAthleteGuardianLinks,
  handleRespondToGuardianLink,
  handleRevokeAthleteGuardianLink,
} from "../controllers/guardian.controller.js";
import {
  handleCreateUploadCredentials,
  handleDeleteHighlight,
  handleListHighlights,
  handleSaveHighlight,
} from "../controllers/highlight.controller.js";
import {
  handleGetAthleteProfile,
  handleUpdateAthleteProfile,
} from "../controllers/athleteProfile.controller.js";
import { authenticateToken } from "../middleware/auth.js";
import { requireGlobalRole } from "../middleware/roles.js";

export const athleteRouter = Router();

athleteRouter.use(authenticateToken, requireGlobalRole("ATHLETE"));

athleteRouter.get("/profile", handleGetAthleteProfile);
athleteRouter.put("/profile", handleUpdateAthleteProfile);

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

athleteRouter.get("/highlights", handleListHighlights);
athleteRouter.post(
  "/highlights/upload-credentials",
  handleCreateUploadCredentials
);
athleteRouter.post("/highlights", handleSaveHighlight);
athleteRouter.delete("/highlights/:highlightId", handleDeleteHighlight);

export default athleteRouter;
