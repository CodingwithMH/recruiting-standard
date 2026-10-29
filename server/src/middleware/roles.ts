import { Response, NextFunction } from "express";
import type { AuthenticatedRequest, GlobalRole, SchoolRole } from "../types/index.js";

/**
 * Middleware that restricts route access to users with one of the specified global roles.
 * Must be preceded by `authenticateToken`.
 */
export function requireGlobalRole(...allowedRoles: GlobalRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: "Authentication required.",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (!allowedRoles.includes(req.user.globalRole)) {
      res.status(403).json({
        success: false,
        error: "Access denied. Insufficient permissions for this resource.",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    next();
  };
}

/**
 * Middleware that restricts route access to school staff with one of the specified school roles.
 * Platform Admin accounts have bypass access for administrative oversight.
 */
export function requireSchoolRole(...allowedSchoolRoles: SchoolRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: "Authentication required.",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (req.user.globalRole === "PLATFORM_ADMIN") {
      next();
      return;
    }

    if (
      req.user.globalRole !== "SCHOOL_STAFF" ||
      !req.user.schoolRole ||
      !allowedSchoolRoles.includes(req.user.schoolRole)
    ) {
      res.status(403).json({
        success: false,
        error: "Access denied. Specific school staff privileges required.",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    next();
  };
}
