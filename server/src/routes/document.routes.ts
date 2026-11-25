import { Router } from "express";
import {
  handleGetDocumentAccess,
  handleRedirectDocumentAccess,
} from "../controllers/document.controller.js";
import { authenticateToken } from "../middleware/auth.js";
import { requireActiveSubscription } from "../middleware/subscriptionAccess.js";

export const documentRouter = Router();

// Authenticated users with an active school subscription may request a document,
// but the service applies the owner / linked-parent / platform-admin / verified-school
// policy and only then issues a short-lived signed URL.
documentRouter.use(authenticateToken, requireActiveSubscription);

documentRouter.get("/:documentId/access", handleGetDocumentAccess);
documentRouter.get("/:documentId/view", handleRedirectDocumentAccess);

export default documentRouter;
