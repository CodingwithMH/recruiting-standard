import { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../types/index.js";
import {
  AthleteVerificationError,
  athleteVerificationQuerySchema,
  athleteVerificationReviewSchema,
  listAthleteProfilesForReview,
  reviewAthleteProfileVerification,
} from "../services/athleteVerification.service.js";

function getParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function handleVerificationError(
  err: unknown,
  res: Response,
  next: NextFunction
): void {
  if (err instanceof AthleteVerificationError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
      timestamp: new Date().toISOString(),
    });
    return;
  }
  next(err);
}

export async function handleListAthleteVerifications(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parsed = athleteVerificationQuerySchema.safeParse(req.query);

    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: "Invalid query parameters.",
        details: parsed.error.flatten().fieldErrors,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const result = await listAthleteProfilesForReview(parsed.data);

    res.status(200).json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    handleVerificationError(err, res, next);
  }
}

export async function handleReviewAthleteVerification(
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

    const parsed = athleteVerificationReviewSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: "Validation failed.",
        details: parsed.error.flatten().fieldErrors,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const profile = await reviewAthleteProfileVerification(
      req.user.userId,
      getParam(req.params.athleteProfileId),
      parsed.data
    );

    res.status(200).json({
      success: true,
      message:
        parsed.data.status === "APPROVED"
          ? "Athlete profile approved."
          : "Athlete profile rejected.",
      data: profile,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    handleVerificationError(err, res, next);
  }
}
