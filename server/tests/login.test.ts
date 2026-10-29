import test from "node:test";
import assert from "node:assert/strict";
import { loginSchema } from "../src/services/auth.service.js";
import { signToken, verifyToken, type JwtPayload } from "../src/utils/jwt.js";

test("loginSchema enforces valid email format and non-empty password", () => {
  const valid = loginSchema.safeParse({
    email: "coach@lincoln-high.edu",
    password: "Password123!",
  });
  assert.equal(valid.success, true);

  const missingEmail = loginSchema.safeParse({
    email: "not-an-email",
    password: "Password123!",
  });
  assert.equal(missingEmail.success, false);

  const emptyPassword = loginSchema.safeParse({
    email: "coach@lincoln-high.edu",
    password: "",
  });
  assert.equal(emptyPassword.success, false);
});

test("JWT token carries schoolId and schoolRole claims on login", () => {
  const payload: JwtPayload = {
    userId: "user-uuid-1234",
    email: "ad@school.edu",
    globalRole: "SCHOOL_STAFF",
    schoolId: "school-uuid-5678",
    schoolRole: "SCHOOL_ADMIN",
  };

  const token = signToken(payload);
  assert.ok(token);

  const decoded = verifyToken(token);
  assert.ok(decoded);
  assert.equal(decoded.userId, "user-uuid-1234");
  assert.equal(decoded.schoolId, "school-uuid-5678");
  assert.equal(decoded.schoolRole, "SCHOOL_ADMIN");
  assert.equal(decoded.globalRole, "SCHOOL_STAFF");
});

test("JWT token properly signs PLATFORM_ADMIN without requiring schoolId", () => {
  const payload: JwtPayload = {
    userId: "admin-uuid-0001",
    email: "admin@therecruitingstandard.com",
    globalRole: "PLATFORM_ADMIN",
  };

  const token = signToken(payload);
  const decoded = verifyToken(token);
  assert.ok(decoded);
  assert.equal(decoded.globalRole, "PLATFORM_ADMIN");
  assert.equal(decoded.schoolId, undefined);
});
