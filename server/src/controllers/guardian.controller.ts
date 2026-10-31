import { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../types/index.js";
import {
  GuardianLinkError,
  listAthleteGuardianLinks,
  listGuardianLinks,
  requestGuardianLink,
  requestGuardianLinkSchema,
  respondToGuardianLink,
  revokeAthleteGuardianLink,
  revokeGuardianLink,
} from "../services/guardian.service.js";

function getParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function handleGuardianError(
  err: unknown,
  res: Response,
  next: NextFunction
): void {
  if (err instanceof GuardianLinkError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
      timestamp: new Date().toISOString(),
    });
    return;
  }
  next(err);
}

export async function handleListGuardianLinks(
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

    const links = await listGuardianLinks(req.user.userId);

    res.status(200).json({
      success: true,
      data: links,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    handleGuardianError(err, res, next);
  }
}

export async function handleRequestGuardianLink(
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

    const parsed = requestGuardianLinkSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: "Validation failed.",
        details: parsed.error.flatten().fieldErrors,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const link = await requestGuardianLink(req.user.userId, parsed.data);

    res.status(201).json({
      success: true,
      message:
        "Link request sent. The athlete will receive an email invitation and must approve it before access is granted.",
      data: link,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    handleGuardianError(err, res, next);
  }
}

export async function handleRevokeGuardianLink(
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

    const result = await revokeGuardianLink(
      req.user.userId,
      getParam(req.params.linkId)
    );

    res.status(200).json({
      success: true,
      message: "Guardian link revoked.",
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    handleGuardianError(err, res, next);
  }
}

export async function handleListAthleteGuardianLinks(
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

    const links = await listAthleteGuardianLinks(req.user.userId);

    res.status(200).json({
      success: true,
      data: links,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    handleGuardianError(err, res, next);
  }
}

export async function handleRespondToGuardianLink(
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

    const action = req.path.endsWith("/reject") ? "reject" : "approve";
    const link = await respondToGuardianLink(
      req.user.userId,
      getParam(req.params.linkId),
      action
    );

    res.status(200).json({
      success: true,
      message:
        action === "approve"
          ? "Guardian link approved."
          : "Guardian link rejected.",
      data: link,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    handleGuardianError(err, res, next);
  }
}

export async function handleRevokeAthleteGuardianLink(
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

    const result = await revokeAthleteGuardianLink(
      req.user.userId,
      getParam(req.params.linkId)
    );

    res.status(200).json({
      success: true,
      message: "Guardian link revoked.",
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    handleGuardianError(err, res, next);
  }
}
