import { Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt.js";
import type { AuthenticatedRequest } from "../types/index.js";

/**
 * Express middleware that validates a JWT Bearer token from the
 * Authorization header and populates `req.user` with the decoded payload.
 *
 * Responds with 401 if the token is missing, malformed, or expired.
 */
export function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({
      success: false,
      error: "Authentication required. Please provide a valid Bearer token.",
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const token = authHeader.slice(7).trim();
  const payload = verifyToken(token);

  if (!payload) {
    res.status(401).json({
      success: false,
      error: "Invalid or expired authentication token.",
      timestamp: new Date().toISOString(),
    });
    return;
  }

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
