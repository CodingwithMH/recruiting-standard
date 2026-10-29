import { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../types/index.js";
import { logger } from "../utils/logger.js";

/**
 * Middleware enforcing strict school-level data isolation (multi-tenancy).
 *
 * Rules:
 * 1. An authenticated user MUST have an associated `schoolId` unless they are a `PLATFORM_ADMIN`.
 * 2. If the request targets a specific school (via URL param `:schoolId`, `:id`, or query param),
 *    the target school ID MUST match `req.user.schoolId`.
 * 3. Cross-school access attempts are strictly blocked with HTTP 403 Forbidden.
 * 4. Injects `req.schoolId` into the request context for downstream Prisma query scoping.
 */
export function requireSchoolTenant(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: "Authentication required.",
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const resolveParam = (val: string | string[] | undefined): string | undefined =>
    Array.isArray(val) ? val[0] : val;

  // Platform Admins have whole-platform oversight
  if (req.user.globalRole === "PLATFORM_ADMIN") {
    req.schoolId =
      resolveParam(req.params.schoolId) ||
      resolveParam(req.params.id) ||
      req.user.schoolId;
    next();
    return;
  }

  const userSchoolId = req.user.schoolId;

  if (!userSchoolId) {
    res.status(403).json({
      success: false,
      error: "Access denied. User is not affiliated with any school.",
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Extract any target school identifier requested in URL params or query
  const targetSchoolId =
    resolveParam(req.params.schoolId) ||
    (req.params.id && req.baseUrl.includes("/schools") ? resolveParam(req.params.id) : undefined) ||
    (typeof req.query.schoolId === "string" ? req.query.schoolId : undefined);

  if (targetSchoolId && targetSchoolId !== userSchoolId) {
    logger.warn(
      "AUTH",
      `Blocked cross-tenant access attempt: User ${req.user.email} (School: ${userSchoolId}) attempted to access School: ${targetSchoolId}`
    );

    res.status(403).json({
      success: false,
      error: "Access denied. Cross-school access is strictly prohibited by institutional privacy rules.",
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Anchor verified tenant ID in request context
  req.schoolId = userSchoolId;
  next();
}
