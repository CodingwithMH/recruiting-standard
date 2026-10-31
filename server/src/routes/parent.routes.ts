import { Router } from "express";
import {
  handleListGuardianLinks,
  handleRequestGuardianLink,
  handleRevokeGuardianLink,
} from "../controllers/guardian.controller.js";
import { authenticateToken } from "../middleware/auth.js";
import { requireGlobalRole } from "../middleware/roles.js";

export const parentRouter = Router();

parentRouter.use(authenticateToken, requireGlobalRole("PARENT"));

parentRouter.get("/links", handleListGuardianLinks);
parentRouter.post("/links", handleRequestGuardianLink);
parentRouter.delete("/links/:linkId", handleRevokeGuardianLink);

export default parentRouter;
