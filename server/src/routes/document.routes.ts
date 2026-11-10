import { Router } from "express";
import {
  handleGetDocumentAccess,
  handleRedirectDocumentAccess,
} from "../controllers/document.controller.js";
import { authenticateToken } from "../middleware/auth.js";

export const documentRouter = Router();

// Any authenticated user may request a document, but the service applies the
// owner / linked-parent / platform-admin / verified-school policy and only then
// issues a short-lived signed URL.
documentRouter.use(authenticateToken);

documentRouter.get("/:documentId/access", handleGetDocumentAccess);
documentRouter.get("/:documentId/view", handleRedirectDocumentAccess);

export default documentRouter;
