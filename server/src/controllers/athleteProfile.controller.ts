import { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../types/index.js";
import {
  AthleteProfileError,
  athleteProfileUpdateSchema,
  getAthleteProfile,
  getAthleteProfileById,
  updateAthleteProfile,
} from "../services/athleteProfile.service.js";

function getParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function handleProfileError(
  err: unknown,
  res: Response,
  next: NextFunction
): void {
  if (err instanceof AthleteProfileError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
      timestamp: new Date().toISOString(),
    });
    return;
  }
  next(err);
}

export async function handleGetAthleteProfile(
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

    const profile = await getAthleteProfile(req.user.userId);

    res.status(200).json({
      success: true,
      data: profile,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    handleProfileError(err, res, next);
  }
}

export async function handleUpdateAthleteProfile(
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

    const parsed = athleteProfileUpdateSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: "Validation failed. Please verify all required fields.",
        details: parsed.error.flatten().fieldErrors,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const profile = await updateAthleteProfile(
      req.user.userId,
      parsed.data
    );

    res.status(200).json({
      success: true,
      message: "Athlete profile saved.",
      data: profile,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    handleProfileError(err, res, next);
  }
}

export async function handleGetAthleteProfileDetail(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const profile = await getAthleteProfileById(
      getParam(req.params.athleteProfileId)
    );

    res.status(200).json({
      success: true,
      data: profile,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    handleProfileError(err, res, next);
  }
}
