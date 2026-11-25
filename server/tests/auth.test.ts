import test from "node:test";
import assert from "node:assert/strict";

process.env.NODE_ENV = "test";
process.env.DATABASE_URL =
  "postgresql://postgres:postgres@localhost:5432/recruiting_standard_test?schema=public";
process.env.JWT_SECRET = "test-only-secret-value-not-used-in-production-min-32-chars";

import { hashPassword, comparePassword } from "../src/utils/password.js";
import { signToken, verifyToken } from "../src/utils/jwt.js";
import { registerSchema, loginSchema } from "../src/services/auth.service.js";
import { LEGAL_VERSIONS } from "../src/config/legal.js";
import { guardianAuthorizationConfirmSchema } from "../src/services/guardianAuthorization.service.js";

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
  const match = await comparePassword("WrongPassword123!", hash);
  assert.equal(match, false, "Mismatched password must evaluate to false");
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

test("Auth validation schemas enforce proper email, password, and terms constraints", () => {
  const base = {
    email: "athleticdirector@school.org",
    password: "StrongPassword123!",
    firstName: "Sarah",
    lastName: "Jenkins",
    globalRole: "SCHOOL_STAFF" as const,
    acceptTerms: true,
  };

  assert.equal(registerSchema.safeParse(base).success, true);

  const invalidEmail = registerSchema.safeParse({ ...base, email: "not-an-email" });
  assert.equal(invalidEmail.success, false);

  const shortPassword = registerSchema.safeParse({ ...base, password: "short" });
  assert.equal(shortPassword.success, false);

  const withoutTerms = registerSchema.safeParse({
    ...base,
    acceptTerms: false,
  });
  assert.equal(withoutTerms.success, false);

  const validAthlete = registerSchema.safeParse({
    ...base,
    email: "athlete@school.org",
    globalRole: "ATHLETE" as const,
    schoolId: "SCH-10492",
    dateOfBirth: "2008-05-15",
    termsVersion: LEGAL_VERSIONS.TERMS_OF_USE,
    privacyPolicyVersion: LEGAL_VERSIONS.PRIVACY_POLICY,
    guardianAuthorization: {
      guardianName: "Parent One",
      guardianEmail: "parent@example.com",
      authorizationAccepted: true,
      version: LEGAL_VERSIONS.GUARDIAN_AUTHORIZATION,
    },
  });
  assert.equal(validAthlete.success, true);

  const missingGuardianAttestation = registerSchema.safeParse({
    ...base,
    email: "athlete@school.org",
    globalRole: "ATHLETE" as const,
    schoolId: "SCH-10492",
    dateOfBirth: "2008-05-15",
    guardianAuthorization: {
      guardianName: "Parent One",
      guardianEmail: "parent@example.com",
      authorizationAccepted: false,
    },
  });
  assert.equal(missingGuardianAttestation.success, false);

  const validLogin = loginSchema.safeParse({
    email: "coach@school.org",
    password: "AnyPassword123!",
  });
  assert.equal(validLogin.success, true);
});

test("Guardian authorization confirmation requires explicit acceptance", () => {
  const token = "a".repeat(64);

  assert.equal(
    guardianAuthorizationConfirmSchema.safeParse({
      token,
      authorizationAccepted: true,
      version: LEGAL_VERSIONS.GUARDIAN_AUTHORIZATION,
    }).success,
    true
  );

  assert.equal(
    guardianAuthorizationConfirmSchema.safeParse({
      token,
      authorizationAccepted: false,
    }).success,
    false
  );
});
