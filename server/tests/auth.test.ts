import test from "node:test";
import assert from "node:assert/strict";

process.env.NODE_ENV = "test";
process.env.DATABASE_URL =
  "postgresql://postgres:postgres@localhost:5432/recruiting_standard_test?schema=public";
process.env.JWT_SECRET = "test-only-secret-value-not-used-in-production-min-32-chars";

import { hashPassword, comparePassword } from "../src/utils/password.js";
import { signToken, verifyToken } from "../src/utils/jwt.js";
import { registerSchema, loginSchema } from "../src/services/auth.service.js";

test("Password utility hashes passwords with unique salts", async () => {
  const plainPassword = "SecurePassword2026!";
  const hash1 = await hashPassword(plainPassword);
  const hash2 = await hashPassword(plainPassword);

  assert.ok(hash1.startsWith("$2"), "Hash should follow bcrypt format");
  assert.notEqual(hash1, hash2, "Bcrypt should produce unique salts for identical inputs");

  const isMatch1 = await comparePassword(plainPassword, hash1);
  const isMatch2 = await comparePassword(plainPassword, hash2);
  assert.equal(isMatch1, true, "Valid password must match hash 1");
  assert.equal(isMatch2, true, "Valid password must match hash 2");
});

test("Password comparison strictly rejects incorrect passwords", async () => {
  const hash = await hashPassword("CorrectPassword123!");
  const isMatch = await comparePassword("WrongPassword123!", hash);
  assert.equal(isMatch, false, "Mismatched password must evaluate to false");
});

test("JWT utility signs valid token with user claims and verifies payload", () => {
  const userPayload = {
    userId: "uuid-1234-5678",
    email: "coach@lincolnhigh.edu",
    globalRole: "SCHOOL_STAFF" as const,
  };

  const token = signToken(userPayload);
  assert.ok(token && typeof token === "string", "Token must be a non-empty string");

  const decoded = verifyToken(token);
  assert.ok(decoded, "Token verification must succeed");
  assert.equal(decoded.userId, userPayload.userId);
  assert.equal(decoded.email, userPayload.email);
  assert.equal(decoded.globalRole, userPayload.globalRole);
});

test("JWT verifier rejects forged, invalid, or corrupted tokens", () => {
  assert.equal(verifyToken("invalid.token.signature"), null);
  assert.equal(verifyToken(""), null);
  assert.equal(verifyToken("Bearer some-token"), null);
});

test("Auth validation schemas enforce proper email and password constraints", () => {
  // Valid register input
  const validRegister = registerSchema.safeParse({
    email: "athleticdirector@school.org",
    password: "StrongPassword123!",
    firstName: "Sarah",
    lastName: "Jenkins",
    globalRole: "SCHOOL_STAFF",
  });
  assert.equal(validRegister.success, true);

  // Invalid email
  const invalidEmail = registerSchema.safeParse({
    email: "not-an-email",
    password: "StrongPassword123!",
    firstName: "Sarah",
    lastName: "Jenkins",
  });
  assert.equal(invalidEmail.success, false);

  // Short password (< 8 chars)
  const shortPassword = registerSchema.safeParse({
    email: "coach@school.org",
    password: "short",
    firstName: "Sarah",
    lastName: "Jenkins",
  });
  assert.equal(shortPassword.success, false);

  // Valid login input
  const validLogin = loginSchema.safeParse({
    email: "coach@school.org",
    password: "AnyPassword123!",
  });
  assert.equal(validLogin.success, true);
});
