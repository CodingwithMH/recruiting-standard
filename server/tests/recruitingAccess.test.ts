import test from "node:test";
import assert from "node:assert/strict";
import express, { Response } from "express";
import http from "node:http";

process.env.NODE_ENV = "test";
process.env.DATABASE_URL =
  "postgresql://postgres:postgres@localhost:5432/recruiting_standard_test?schema=public";
process.env.JWT_SECRET = "test-only-secret-value-not-used-in-production-min-32-chars";

import { prisma } from "../src/config/prisma.js";
import { authenticateToken } from "../src/middleware/auth.js";
import { requireActiveSubscription } from "../src/middleware/subscriptionAccess.js";
import { requireApprovedSchool } from "../src/middleware/schoolStatus.js";
import { requireSchoolRole } from "../src/middleware/roles.js";
import { signToken } from "../src/utils/jwt.js";
import type { AuthenticatedRequest } from "../src/types/index.js";

type FakeUserStatus = "PENDING" | "ACTIVE" | "INACTIVE" | "SUSPENDED";
type FakeSchoolStatus = "PENDING" | "APPROVED" | "SUSPENDED" | "REJECTED";

function athleteUser(status: FakeUserStatus) {
  return {
    id: "athlete-1",
    email: "athlete@example.com",
    globalRole: "ATHLETE",
    tokenVersion: 0,
    status,
    memberships: [],
  };
}

function schoolUser(
  status: FakeUserStatus = "ACTIVE",
  schoolStatus: FakeSchoolStatus = "APPROVED",
  schoolId = "school-a"
) {
  return {
    id: "coach-1",
    email: "coach@school-a.edu",
    globalRole: "SCHOOL_STAFF",
    tokenVersion: 0,
    status,
    memberships: [
      {
        schoolId,
        role: "COACH_RECRUITER",
        school: {
          id: schoolId,
          name: "School A",
          schoolId: "SCH-10001",
          status: schoolStatus,
        },
      },
    ],
  };
}

function request(
  server: http.Server,
  path: string,
  token?: string,
  method = "GET"
): Promise<{ status: number; body: Record<string, unknown> }> {
  return new Promise((resolve, reject) => {
    const addr = server.address();
    if (!addr || typeof addr === "string") {
      reject(new Error("Server address not available"));
      return;
    }

    const req = http.request(
      {
        host: "127.0.0.1",
        port: addr.port,
        path,
        method,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode || 500, body: JSON.parse(data) });
          } catch {
            resolve({ status: res.statusCode || 500, body: { raw: data } });
          }
        });
      }
    );

    req.on("error", reject);
    req.end();
  });
}

function makePortalApp() {
  const app = express();
  app.use(express.json());

  const allow = (_req: AuthenticatedRequest, res: Response) => {
    res.status(200).json({ success: true });
  };

  // Direct-link targets an unapproved athlete might try to open manually.
  app.get("/portal/athlete", authenticateToken, allow);
  app.get("/portal/athlete/highlights", authenticateToken, allow);
  app.get("/portal/parent", authenticateToken, allow);

  return app;
}

function makeRecruitingApp() {
  const app = express();
  app.use(express.json());

  app.get(
    "/coach/athletes",
    authenticateToken,
    requireApprovedSchool,
    requireActiveSubscription,
    requireSchoolRole("SCHOOL_ADMIN", "COACH_RECRUITER"),
    (_req: AuthenticatedRequest, res: Response) => {
      res.status(200).json({ success: true });
    }
  );

  return app;
}

async function withMock<T>(
  mock: () => void,
  restore: () => void,
  fn: () => Promise<T>
): Promise<T> {
  mock();
  try {
    return await fn();
  } finally {
    restore();
  }
}

function athleteToken() {
  return signToken({
    userId: "athlete-1",
    email: "athlete@example.com",
    globalRole: "ATHLETE",
    schoolId: "school-a",
    tokenVersion: 0,
  });
}

function coachToken() {
  return signToken({
    userId: "coach-1",
    email: "coach@school-a.edu",
    globalRole: "SCHOOL_STAFF",
    schoolId: "school-a",
    schoolRole: "COACH_RECRUITER",
    tokenVersion: 0,
  });
}

test("pending student cannot open athlete portal direct links", async () => {
  const original = prisma.user.findUnique;
  const app = makePortalApp();
  const server = app.listen(0);

  try {
    await withMock(
      () => {
        prisma.user.findUnique = (async () =>
          athleteUser("PENDING")) as typeof prisma.user.findUnique;
      },
      () => {
        prisma.user.findUnique = original;
      },
      async () => {
        for (const path of ["/portal/athlete", "/portal/athlete/highlights", "/portal/parent"]) {
          const res = await request(server, path, athleteToken());
          assert.equal(res.status, 401, `${path} must reject pending students`);
          assert.equal(res.body.success, false);
        }
      }
    );
  } finally {
    server.close();
  }
});

test("rejected/deactivated student cannot open athlete portal direct links", async () => {
  const original = prisma.user.findUnique;
  const app = makePortalApp();
  const server = app.listen(0);

  try {
    await withMock(
      () => {
        prisma.user.findUnique = (async () =>
          athleteUser("INACTIVE")) as typeof prisma.user.findUnique;
      },
      () => {
        prisma.user.findUnique = original;
      },
      async () => {
        for (const path of ["/portal/athlete", "/portal/athlete/highlights", "/portal/parent"]) {
          const res = await request(server, path, athleteToken());
          assert.equal(res.status, 401, `${path} must reject rejected students`);
          assert.equal(res.body.success, false);
        }
      }
    );
  } finally {
    server.close();
  }
});

test("active student can open the same portal direct links", async () => {
  const original = prisma.user.findUnique;
  const app = makePortalApp();
  const server = app.listen(0);

  try {
    await withMock(
      () => {
        prisma.user.findUnique = (async () =>
          athleteUser("ACTIVE")) as typeof prisma.user.findUnique;
      },
      () => {
        prisma.user.findUnique = original;
      },
      async () => {
        const res = await request(server, "/portal/athlete", athleteToken());
        assert.equal(res.status, 200);
        assert.equal(res.body.success, true);
      }
    );
  } finally {
    server.close();
  }
});

test("approved school still gets 402 when its subscription is suspended", async () => {
  const originalUserFindUnique = prisma.user.findUnique;
  const originalSchoolFindUnique = prisma.school.findUnique;
  const originalSubscriptionFindUnique = prisma.subscription.findUnique;
  const app = makeRecruitingApp();
  const server = app.listen(0);

  try {
    await withMock(
      () => {
        prisma.user.findUnique = (async () =>
          schoolUser("ACTIVE", "APPROVED")) as typeof prisma.user.findUnique;
        prisma.school.findUnique = (async () => ({
          id: "school-a",
          status: "APPROVED",
          schoolId: "SCH-10001",
          name: "School A",
        })) as typeof prisma.school.findUnique;
        prisma.subscription.findUnique = (async () => ({
          state: "SUSPENDED",
          expirationDate: new Date("2027-01-01T00:00:00.000Z"),
        })) as typeof prisma.subscription.findUnique;
      },
      () => {
        prisma.user.findUnique = originalUserFindUnique;
        prisma.school.findUnique = originalSchoolFindUnique;
        prisma.subscription.findUnique = originalSubscriptionFindUnique;
      },
      async () => {
        const res = await request(server, "/coach/athletes", coachToken());
        assert.equal(res.status, 402);
        assert.equal(res.body.success, false);
        assert.equal(res.body.code, "SUBSCRIPTION_INACTIVE");
        assert.equal(res.body.subscriptionState, "SUSPENDED");
      }
    );
  } finally {
    server.close();
  }
});

test("approved school gets 402 when its active subscription has expired", async () => {
  const originalUserFindUnique = prisma.user.findUnique;
  const originalSchoolFindUnique = prisma.school.findUnique;
  const originalSubscriptionFindUnique = prisma.subscription.findUnique;
  const app = makeRecruitingApp();
  const server = app.listen(0);

  try {
    await withMock(
      () => {
        prisma.user.findUnique = (async () =>
          schoolUser("ACTIVE", "APPROVED")) as typeof prisma.user.findUnique;
        prisma.school.findUnique = (async () => ({
          id: "school-a",
          status: "APPROVED",
          schoolId: "SCH-10001",
          name: "School A",
        })) as typeof prisma.school.findUnique;
        prisma.subscription.findUnique = (async () => ({
          state: "ACTIVE",
          expirationDate: new Date("2020-01-01T00:00:00.000Z"),
        })) as typeof prisma.subscription.findUnique;
      },
      () => {
        prisma.user.findUnique = originalUserFindUnique;
        prisma.school.findUnique = originalSchoolFindUnique;
        prisma.subscription.findUnique = originalSubscriptionFindUnique;
      },
      async () => {
        const res = await request(server, "/coach/athletes", coachToken());
        assert.equal(res.status, 402);
        assert.equal(res.body.code, "SUBSCRIPTION_INACTIVE");
        assert.equal(res.body.subscriptionState, "EXPIRED");
      }
    );
  } finally {
    server.close();
  }
});

test("approved school with a missing subscription gets 402", async () => {
  const originalUserFindUnique = prisma.user.findUnique;
  const originalSchoolFindUnique = prisma.school.findUnique;
  const originalSubscriptionFindUnique = prisma.subscription.findUnique;
  const app = makeRecruitingApp();
  const server = app.listen(0);

  try {
    await withMock(
      () => {
        prisma.user.findUnique = (async () =>
          schoolUser("ACTIVE", "APPROVED")) as typeof prisma.user.findUnique;
        prisma.school.findUnique = (async () => ({
          id: "school-a",
          status: "APPROVED",
          schoolId: "SCH-10001",
          name: "School A",
        })) as typeof prisma.school.findUnique;
        prisma.subscription.findUnique = (async () =>
          null) as typeof prisma.subscription.findUnique;
      },
      () => {
        prisma.user.findUnique = originalUserFindUnique;
        prisma.school.findUnique = originalSchoolFindUnique;
        prisma.subscription.findUnique = originalSubscriptionFindUnique;
      },
      async () => {
        const res = await request(server, "/coach/athletes", coachToken());
        assert.equal(res.status, 402);
        assert.equal(res.body.code, "SUBSCRIPTION_INACTIVE");
        assert.equal(res.body.subscriptionState, "PENDING");
      }
    );
  } finally {
    server.close();
  }
});

test("approved school with an active subscription can access recruiting", async () => {
  const originalUserFindUnique = prisma.user.findUnique;
  const originalSchoolFindUnique = prisma.school.findUnique;
  const originalSubscriptionFindUnique = prisma.subscription.findUnique;
  const app = makeRecruitingApp();
  const server = app.listen(0);

  try {
    await withMock(
      () => {
        prisma.user.findUnique = (async () =>
          schoolUser("ACTIVE", "APPROVED")) as typeof prisma.user.findUnique;
        prisma.school.findUnique = (async () => ({
          id: "school-a",
          status: "APPROVED",
          schoolId: "SCH-10001",
          name: "School A",
        })) as typeof prisma.school.findUnique;
        prisma.subscription.findUnique = (async () => ({
          state: "ACTIVE",
          expirationDate: new Date("2099-01-01T00:00:00.000Z"),
        })) as typeof prisma.subscription.findUnique;
      },
      () => {
        prisma.user.findUnique = originalUserFindUnique;
        prisma.school.findUnique = originalSchoolFindUnique;
        prisma.subscription.findUnique = originalSubscriptionFindUnique;
      },
      async () => {
        const res = await request(server, "/coach/athletes", coachToken());
        assert.equal(res.status, 200);
        assert.equal(res.body.success, true);
      }
    );
  } finally {
    server.close();
  }
});
