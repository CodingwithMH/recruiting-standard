import test from "node:test";
import assert from "node:assert/strict";
import express, { Response } from "express";
import http from "node:http";

process.env.NODE_ENV = "test";
process.env.DATABASE_URL =
  "postgresql://postgres:postgres@localhost:5432/recruiting_standard_test?schema=public";
process.env.JWT_SECRET = "test-only-secret-value-not-used-in-production-min-32-chars";

import { authenticateToken } from "../src/middleware/auth.js";
import { requireGlobalRole, requireSchoolRole } from "../src/middleware/roles.js";
import { requireSchoolTenant } from "../src/middleware/tenant.js";
import { requireApprovedSchool } from "../src/middleware/schoolStatus.js";
import { signToken } from "../src/utils/jwt.js";
import type { AuthenticatedRequest } from "../src/types/index.js";

// Helper to launch test server and perform request
function makeApp() {
  const app = express();
  app.use(express.json());

  // Test Route: Protected by authenticateToken
  app.get("/test/protected", authenticateToken, (req: AuthenticatedRequest, res: Response) => {
    res.status(200).json({ success: true, user: req.user });
  });

  // Test Route: Platform Admin Only
  app.get(
    "/test/admin-only",
    authenticateToken,
    requireGlobalRole("PLATFORM_ADMIN"),
    (_req: AuthenticatedRequest, res: Response) => {
      res.status(200).json({ success: true, message: "Welcome Admin" });
    }
  );

  // Test Route: School Admin Only
  app.get(
    "/test/school-admin-only",
    authenticateToken,
    requireSchoolRole("SCHOOL_ADMIN"),
    (_req: AuthenticatedRequest, res: Response) => {
      res.status(200).json({ success: true, message: "Welcome School Admin" });
    }
  );

  // Test Route: Tenant Isolated (targets /schools/:schoolId/records)
  app.get(
    "/test/schools/:schoolId/records",
    authenticateToken,
    requireSchoolTenant,
    (req: AuthenticatedRequest, res: Response) => {
      res.status(200).json({ success: true, schoolId: req.schoolId });
    }
  );

  return app;
}

function request(
  server: http.Server,
  path: string,
  headers: Record<string, string> = {}
): Promise<{ status: number; body: Record<string, unknown> }> {
  return new Promise((resolve, reject) => {
    const addr = server.address();
    if (!addr || typeof addr === "string") return reject(new Error("Server address not available"));

    const req = http.request(
      {
        host: "127.0.0.1",
        port: addr.port,
        path,
        method: "GET",
        headers,
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            resolve({
              status: res.statusCode || 500,
              body: JSON.parse(data),
            });
          } catch {
            resolve({
              status: res.statusCode || 500,
              body: { raw: data },
            });
          }
        });
      }
    );

    req.on("error", reject);
    req.end();
  });
}

test("authenticateToken rejects requests without Authorization header (401)", async () => {
  const app = makeApp();
  const server = app.listen(0);

  try {
    const res = await request(server, "/test/protected");
    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
  } finally {
    server.close();
  }
});

test("authenticateToken rejects requests with invalid or malformed token (401)", async () => {
  const app = makeApp();
  const server = app.listen(0);

  try {
    const res = await request(server, "/test/protected", {
      Authorization: "Bearer invalid.jwt.token",
    });
    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
  } finally {
    server.close();
  }
});

test("authenticateToken accepts valid JWT and attaches user context (200)", async () => {
  const app = makeApp();
  const server = app.listen(0);

  const token = signToken({
    userId: "user-123",
    email: "coach@school.edu",
    globalRole: "SCHOOL_STAFF",
    schoolId: "school-abc",
    schoolRole: "COACH_RECRUITER",
  });

  try {
    const res = await request(server, "/test/protected", {
      Authorization: `Bearer ${token}`,
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal((res.body.user as { email: string }).email, "coach@school.edu");
  } finally {
    server.close();
  }
});

test("requireGlobalRole blocks non-admin users from admin-only routes (403)", async () => {
  const app = makeApp();
  const server = app.listen(0);

  const coachToken = signToken({
    userId: "coach-456",
    email: "coach@school.edu",
    globalRole: "SCHOOL_STAFF",
  });

  const adminToken = signToken({
    userId: "admin-001",
    email: "admin@platform.com",
    globalRole: "PLATFORM_ADMIN",
  });

  try {
    // Coach attempt -> 403 Forbidden
    const coachRes = await request(server, "/test/admin-only", {
      Authorization: `Bearer ${coachToken}`,
    });
    assert.equal(coachRes.status, 403);
    assert.equal(coachRes.body.success, false);

    // Admin attempt -> 200 OK
    const adminRes = await request(server, "/test/admin-only", {
      Authorization: `Bearer ${adminToken}`,
    });
    assert.equal(adminRes.status, 200);
    assert.equal(adminRes.body.success, true);
  } finally {
    server.close();
  }
});

test("requireSchoolRole verifies school-level role privileges (403 vs 200)", async () => {
  const app = makeApp();
  const server = app.listen(0);

  const recruiterToken = signToken({
    userId: "coach-111",
    email: "assistant@school.edu",
    globalRole: "SCHOOL_STAFF",
    schoolId: "school-1",
    schoolRole: "COACH_RECRUITER",
  });

  const schoolAdminToken = signToken({
    userId: "director-222",
    email: "director@school.edu",
    globalRole: "SCHOOL_STAFF",
    schoolId: "school-1",
    schoolRole: "SCHOOL_ADMIN",
  });

  try {
    // Recruiter trying to access School Admin route -> 403
    const res1 = await request(server, "/test/school-admin-only", {
      Authorization: `Bearer ${recruiterToken}`,
    });
    assert.equal(res1.status, 403);

    // School Admin accessing School Admin route -> 200
    const res2 = await request(server, "/test/school-admin-only", {
      Authorization: `Bearer ${schoolAdminToken}`,
    });
    assert.equal(res2.status, 200);
  } finally {
    server.close();
  }
});

test("requireSchoolTenant strictly blocks cross-school access attempts (403)", async () => {
  const app = makeApp();
  const server = app.listen(0);

  const schoolAToken = signToken({
    userId: "coach-school-a",
    email: "coach@school-a.edu",
    globalRole: "SCHOOL_STAFF",
    schoolId: "school-uuid-aaa",
    schoolRole: "COACH_RECRUITER",
  });

  try {
    // Coach from School A attempts to access School A records -> 200 OK
    const allowedRes = await request(server, "/test/schools/school-uuid-aaa/records", {
      Authorization: `Bearer ${schoolAToken}`,
    });
    assert.equal(allowedRes.status, 200);
    assert.equal(allowedRes.body.schoolId, "school-uuid-aaa");

    // Coach from School A attempts to access School B records -> 403 FORBIDDEN
    const blockedRes = await request(server, "/test/schools/school-uuid-bbb/records", {
      Authorization: `Bearer ${schoolAToken}`,
    });
    assert.equal(blockedRes.status, 403);
    assert.equal(blockedRes.body.success, false);
    assert.ok(
      (blockedRes.body.error as string).includes("Cross-school access is strictly prohibited"),
      "Error must explicitly cite cross-school isolation violation"
    );
  } finally {
    server.close();
  }
});
