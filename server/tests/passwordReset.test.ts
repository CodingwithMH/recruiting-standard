import test from "node:test";
import assert from "node:assert/strict";

process.env.NODE_ENV = "test";
process.env.DATABASE_URL =
  "postgresql://postgres:postgres@localhost:5432/recruiting_standard_test?schema=public";
process.env.JWT_SECRET = "test-only-secret-value-not-used-in-production-min-32-chars";

import {
  generateResetToken,
  hashResetToken,
} from "../src/utils/resetToken.js";
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  PASSWORD_RESET_TTL_MS,
} from "../src/services/auth.service.js";

test("Reset tokens are unique and only stored as hashes", () => {
  const token1 = generateResetToken();
  const token2 = generateResetToken();

  assert.notEqual(token1, token2, "Each reset token must be unique");
  assert.equal(token1.length, 64, "Token must be 32 random bytes encoded as hex");

  const hash1 = hashResetToken(token1);
  assert.equal(hash1, hashResetToken(token1), "Hashing must be deterministic");
  assert.notEqual(hash1, token1, "Stored value must not be the raw token");
  assert.notEqual(hash1, hashResetToken(token2), "Hashes must differ per token");
});

test("Password reset links expire after one hour", () => {
  assert.equal(PASSWORD_RESET_TTL_MS, 60 * 60 * 1000);
});

test("forgotPasswordSchema requires a valid email", () => {
  assert.equal(forgotPasswordSchema.safeParse({ email: "coach@school.org" }).success, true);
  assert.equal(forgotPasswordSchema.safeParse({ email: "not-an-email" }).success, false);
});

test("resetPasswordSchema enforces token and password constraints", () => {
  const valid = resetPasswordSchema.safeParse({
    token: "a".repeat(64),
    password: "NewPassword123!",
  });
  assert.equal(valid.success, true);

  const missingToken = resetPasswordSchema.safeParse({
    token: "",
    password: "NewPassword123!",
  });
  assert.equal(missingToken.success, false);

  const shortPassword = resetPasswordSchema.safeParse({
    token: "a".repeat(64),
    password: "short",
  });
  assert.equal(shortPassword.success, false);
});
