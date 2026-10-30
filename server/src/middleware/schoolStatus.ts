import { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../types/index.js";
import { prisma } from "../config/prisma.js";

/**
 * Middleware that restricts recruiting portal access to schools that have been APPROVED.
 * Newly registered schools (PENDING) and SUSPENDED schools are strictly blocked.
 */
export async function requireApprovedSchool(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: "Authentication required.",
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Platform Admins have whole-platform review permissions
  if (req.user.globalRole === "PLATFORM_ADMIN") {
    next();
    return;
  }

  const schoolId = req.user.schoolId || req.schoolId;

  if (!schoolId) {
    res.status(403).json({
      success: false,
      error: "Access denied. User is not associated with an approved institution.",
      timestamp: new Date().toISOString(),
    });
    return;
  }

  try {
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { id: true, status: true, schoolId: true, name: true },
    });

    if (!school) {
      res.status(404).json({
        success: false,
        error: "Affiliated school record not found.",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (school.status === "PENDING") {
      res.status(403).json({
        success: false,
        error: "Your school registration is currently pending review by Platform Administration. Recruiting portal access will be unlocked upon approval and School ID issuance.",
        schoolStatus: "PENDING",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (school.status === "SUSPENDED") {
      res.status(403).json({
        success: false,
        error: "Your school's recruiting portal access has been suspended. Please contact institutional support.",
        schoolStatus: "SUSPENDED",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (school.status === "REJECTED") {
      res.status(403).json({
        success: false,
        error: "Your school registration was not approved. Please contact institutional support.",
        schoolStatus: "REJECTED",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Attach school verification details to request context
    req.user.schoolStatus = school.status;
    next();
  } catch (error) {
    next(error);
  }
}
