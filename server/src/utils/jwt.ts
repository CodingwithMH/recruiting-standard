import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "../config/env.js";

export interface JwtPayload {
  userId: string;
  email: string;
  globalRole: "PLATFORM_ADMIN" | "SCHOOL_STAFF" | "ATHLETE" | "PARENT";
  schoolId?: string;
  schoolRole?: "SCHOOL_ADMIN" | "COACH_RECRUITER";
}

/**
 * Signs a JWT token containing user identity claims.
 * Expiration defaults to the `JWT_EXPIRES_IN` environment variable (7d).
 */
export function signToken(payload: JwtPayload): string {
  const options: SignOptions = {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"],
  };

  return jwt.sign(payload, env.JWT_SECRET, options);
}

/**
 * Verifies and decodes a JWT token.
 * Returns the decoded payload or `null` if the token is invalid or expired.
 */
export function verifyToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    return decoded;
  } catch {
    return null;
  }
}
