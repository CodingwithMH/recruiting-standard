import { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../types/index.js";
import {
  DocumentError,
  authorizeDocumentAccess,
  confirmDocumentUpload,
  deleteAthleteDocument,
  documentConfirmSchema,
  documentMetadataSchema,
  documentReviewQuerySchema,
  getDocumentAccessUrl,
  initiateDocumentUpload,
  listApprovedDocumentsForAthlete,
  listAthleteDocuments,
  listDocumentsForReview,
  listParentAthleteDocuments,
  reviewDocument,
  reviewDocumentSchema,
} from "../services/document.service.js";
import {
  PrivateStorageError,
  streamDocument,
} from "../services/privateStorage.service.js";

function getParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function handleDocumentError(
  err: unknown,
  res: Response,
  next: NextFunction
): void {
  if (err instanceof DocumentError || err instanceof PrivateStorageError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  next(err);
}

export async function handleCreateDocumentUploadUrl(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: "Authentication required.",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const parsed = documentMetadataSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: "Validation failed. Please verify the document details.",
        details: parsed.error.flatten().fieldErrors,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const upload = await initiateDocumentUpload(req.user.userId, parsed.data);

    res.status(200).json({
      success: true,
      data: upload,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    handleDocumentError(err, res, next);
  }
}

export async function handleConfirmDocumentUpload(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: "Authentication required.",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const parsed = documentConfirmSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: "Validation failed. Please verify the document details.",
        details: parsed.error.flatten().fieldErrors,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const document = await confirmDocumentUpload(
      req.user.userId,
      parsed.data
    );

    res.status(201).json({
      success: true,
      message: "Document uploaded and submitted for verification.",
      data: document,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    handleDocumentError(err, res, next);
  }
}

export async function handleListAthleteDocuments(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: "Authentication required.",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const documents = await listAthleteDocuments(req.user.userId);

    res.status(200).json({
      success: true,
      data: documents,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    handleDocumentError(err, res, next);
  }
}

export async function handleDeleteAthleteDocument(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: "Authentication required.",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    await deleteAthleteDocument(
      req.user.userId,
      getParam(req.params.documentId)
    );

    res.status(200).json({
      success: true,
      message: "Document removed.",
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    handleDocumentError(err, res, next);
  }
}

export async function handleGetDocumentAccess(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: "Authentication required.",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const access = await getDocumentAccessUrl(
      req.user,
      getParam(req.params.documentId)
    );

    res.status(200).json({
      success: true,
      data: access,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    handleDocumentError(err, res, next);
  }
}

export async function handleRedirectDocumentAccess(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: "Authentication required.",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // 1. Authorize — throws DocumentError (403/404) if the caller is not allowed.
    const { storageKey, mimeType, title } = await authorizeDocumentAccess(
      req.user,
      getParam(req.params.documentId)
    );

    // 2. Fetch the object body from Backblaze B2 / S3 on the server side.
    const { body, contentLength } = await streamDocument(storageKey);

    // 3. Set response headers so the browser renders / downloads the file.
    res.setHeader("Content-Type", mimeType || "application/octet-stream");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${encodeURIComponent(title)}"`
    );
    if (contentLength !== undefined) {
      res.setHeader("Content-Length", contentLength);
    }
    // Prevent the browser from caching the authenticated stream.
    res.setHeader(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate"
    );

    // 4. Pipe the S3 body stream directly to the HTTP response.
    //    If the client disconnects, destroy the upstream to avoid memory leaks.
    req.on("close", () => {
      if (typeof (body as NodeJS.ReadableStream & { destroy?: () => void }).destroy === "function") {
        (body as NodeJS.ReadableStream & { destroy: () => void }).destroy();
      }
    });

    (body as NodeJS.ReadableStream).pipe(res);
  } catch (err) {
    handleDocumentError(err, res, next);
  }
}

export async function handleListDocumentsForReview(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parsed = documentReviewQuerySchema.safeParse(req.query);

    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: "Invalid query parameters.",
        details: parsed.error.flatten().fieldErrors,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const result = await listDocumentsForReview(parsed.data);

    res.status(200).json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    handleDocumentError(err, res, next);
  }
}

export async function handleReviewDocument(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: "Authentication required.",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const parsed = reviewDocumentSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: "Validation failed.",
        details: parsed.error.flatten().fieldErrors,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const document = await reviewDocument(
      req.user.userId,
      getParam(req.params.documentId),
      parsed.data
    );

    res.status(200).json({
      success: true,
      message:
        parsed.data.status === "APPROVED"
          ? "Document approved."
          : "Document rejected.",
      data: document,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    handleDocumentError(err, res, next);
  }
}

export async function handleListParentAthleteDocuments(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: "Authentication required.",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const documents = await listParentAthleteDocuments(
      req.user.userId,
      getParam(req.params.linkId)
    );

    res.status(200).json({
      success: true,
      data: documents,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    handleDocumentError(err, res, next);
  }
}

export async function handleListCoachAthleteDocuments(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const documents = await listApprovedDocumentsForAthlete(
      getParam(req.params.athleteProfileId)
    );

    res.status(200).json({
      success: true,
      data: documents,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    handleDocumentError(err, res, next);
  }
}
