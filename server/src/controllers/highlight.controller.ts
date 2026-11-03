import { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../types/index.js";
import {
  HighlightError,
  createVideoUploadCredentials,
  deleteHighlight,
  listHighlights,
  saveHighlight,
  saveHighlightSchema,
} from "../services/highlight.service.js";

function getParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function handleHighlightError(
  err: unknown,
  res: Response,
  next: NextFunction
): void {
  if (err instanceof HighlightError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
      timestamp: new Date().toISOString(),
    });
    return;
  }
  next(err);
}

export async function handleListHighlights(
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

    const highlights = await listHighlights(req.user.userId);

    res.status(200).json({
      success: true,
      data: highlights,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    handleHighlightError(err, res, next);
  }
}

export async function handleCreateUploadCredentials(
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

    const credentials = await createVideoUploadCredentials(req.user.userId);

    res.status(200).json({
      success: true,
      data: credentials,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    handleHighlightError(err, res, next);
  }
}

export async function handleSaveHighlight(
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

    const parsed = saveHighlightSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: "Validation failed.",
        details: parsed.error.flatten().fieldErrors,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const highlight = await saveHighlight(req.user.userId, parsed.data);

    res.status(201).json({
      success: true,
      message: "Highlight video published.",
      data: highlight,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    handleHighlightError(err, res, next);
  }
}

export async function handleDeleteHighlight(
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

    await deleteHighlight(req.user.userId, getParam(req.params.highlightId));

    res.status(200).json({
      success: true,
      message: "Highlight video removed.",
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    handleHighlightError(err, res, next);
  }
}
