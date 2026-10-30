import crypto from "node:crypto";

/**
 * Generates a cryptographically random, URL-safe reset token.
 * Only the hash of this value is persisted in the database.
 */
export function generateResetToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Hashes a reset token before storage or lookup so a database leak does not
 * expose usable reset links.
 */
export function hashResetToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}
