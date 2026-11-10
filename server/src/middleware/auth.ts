import { Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt.js";
import { prisma } from "../config/prisma.js";
import type { AuthenticatedRequest } from "../types/index.js";

/**
 * Express middleware that validates a JWT Bearer token from the
 * Authorization header and populates `req.user` with the decoded payload.
 *
 * Responds with 401 if the token is missing, malformed, or expired.
 */
export async function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  let token: string | undefined;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.slice(7).trim();
  }

  if (!token) {
    res.status(401).json({
      success: false,
      error: "Authentication required. Please provide a valid Bearer token.",
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const payload = verifyToken(token);

  if (!payload) {
    res.status(401).json({
      success: false,
      error: "Invalid or expired authentication token.",
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Tokens issued after a password reset carry a version that must match the
  // current value on the user record. Mismatches revoke all older sessions.
  //
  // Real sessions also re-load the user's active membership on every request so
  // revoked memberships, role changes, and school status changes take effect
  // immediately instead of waiting for the JWT to expire.
  if (payload.tokenVersion !== undefined) {
    try {
      let user = null;
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          user = await prisma.user.findUnique({
            where: { id: payload.userId },
            select: {
              id: true,
              email: true,
              globalRole: true,
              tokenVersion: true,
              status: true,
              memberships: {
                where: { status: "ACTIVE" },
                orderBy: { createdAt: "asc" },
                select: {
                  schoolId: true,
                  role: true,
                  school: {
                    select: { id: true, name: true, schoolId: true, status: true },
                  },
                },
              },
            },
          });
          break;
        } catch (dbErr: unknown) {
          const errMessage = dbErr instanceof Error ? dbErr.message : String(dbErr);
          if (
            attempt === 1 &&
            (errMessage.includes("Can't reach database server") ||
              (typeof dbErr === "object" && dbErr !== null && "code" in dbErr && (dbErr as { code: string }).code === "P1001"))
          ) {
            // Neon serverless database cold-start recovery: retry once after 1s
            await new Promise((resolve) => setTimeout(resolve, 1000));
            continue;
          }
          throw dbErr;
        }
      }

      if (
        !user ||
        user.status !== "ACTIVE" ||
        user.tokenVersion !== payload.tokenVersion
      ) {
        res.status(401).json({
          success: false,
          error: "Invalid or expired authentication token.",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const primaryMembership =
        user.memberships.find((m) => m.schoolId === payload.schoolId) ||
        user.memberships[0];

      req.user = {
        userId: user.id,
        email: user.email,
        globalRole: user.globalRole as typeof payload.globalRole,
        schoolId: primaryMembership?.schoolId,
        schoolRole: primaryMembership?.role,
        schoolStatus: primaryMembership?.school.status,
      };

      // School staff may only access the portal while their school is approved.
      if (req.user.globalRole === "SCHOOL_STAFF") {
        if (!primaryMembership) {
          res.status(403).json({
            success: false,
            error:
              "Access denied. Your account is not linked to an active school membership.",
            timestamp: new Date().toISOString(),
          });
          return;
        }

        if (primaryMembership.school.status !== "APPROVED") {
          res.status(403).json({
            success: false,
            error:
              primaryMembership.school.status === "PENDING"
                ? "Your school registration is pending Platform Admin approval. Recruiting portal access will unlock after approval."
                : primaryMembership.school.status === "SUSPENDED"
                  ? "Your school's recruiting portal access has been suspended. Please contact institutional support."
                  : "Your school registration was not approved. Please contact institutional support.",
            schoolStatus: primaryMembership.school.status,
            schoolName: primaryMembership.school.name,
            timestamp: new Date().toISOString(),
          });
          return;
        }
      }

      if (req.user.schoolId) {
        req.schoolId = req.user.schoolId;
      }

      next();
      return;
    } catch (error) {
      next(error);
      return;
    }
  }

  // Legacy/test tokens without a tokenVersion fall back to the signed claims.
  req.user = {
    userId: payload.userId,
    email: payload.email,
    globalRole: payload.globalRole,
    schoolId: payload.schoolId,
    schoolRole: payload.schoolRole,
  };

  if (payload.schoolId) {
    req.schoolId = payload.schoolId;
  }

  next();
}
