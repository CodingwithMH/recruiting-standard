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
import { requireSchoolTenant } from "../src/middleware/tenant.js";
import {
  getOrCreateRecruitingRecord,
  listProspects,
  listRecruitingRecords,
  removeProspect,
  saveProspect,
  updateProspectNotes,
  updateRecruitingRecord,
} from "../src/services/coach.service.js";
import { signToken } from "../src/utils/jwt.js";
import type { AuthenticatedRequest } from "../src/types/index.js";

const SCHOOL_A = "school-uuid-aaa";
const SCHOOL_B = "school-uuid-bbb";
const COACH_A = "coach-a";
const COACH_B = "coach-b";

function request(
  server: http.Server,
  path: string,
  token?: string
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
        method: "GET",
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

test("saved prospect queries and mutations are scoped to one school and coach", async () => {
  const originalFindMany = prisma.savedProspect.findMany;
  const originalUpdateMany = prisma.savedProspect.updateMany;
  const originalDeleteMany = prisma.savedProspect.deleteMany;
  const originalCreate = prisma.savedProspect.create;
  const originalAthleteFindFirst = prisma.athleteProfile.findFirst;

  let listWhere: Record<string, unknown> | undefined;
  let updateWhere: Record<string, unknown> | undefined;
  let deleteWhere: Record<string, unknown> | undefined;
  let createData: Record<string, unknown> | undefined;

  try {
    prisma.savedProspect.findMany = (async (args: {
      where?: Record<string, unknown>;
    }) => {
      listWhere = args.where;
      return [];
    }) as typeof prisma.savedProspect.findMany;

    prisma.savedProspect.updateMany = (async (args: {
      where?: Record<string, unknown>;
    }) => {
      updateWhere = args.where;
      return { count: 0 };
    }) as typeof prisma.savedProspect.updateMany;

    prisma.savedProspect.deleteMany = (async (args: {
      where?: Record<string, unknown>;
    }) => {
      deleteWhere = args.where;
      return { count: 0 };
    }) as typeof prisma.savedProspect.deleteMany;

    prisma.savedProspect.create = (async (args: {
      data?: Record<string, unknown>;
    }) => {
      createData = args.data;
      return { id: "prospect-a", notes: null, savedAt: new Date() };
    }) as typeof prisma.savedProspect.create;

    prisma.athleteProfile.findFirst = (async () => ({
      id: "athlete-profile-1",
    })) as typeof prisma.athleteProfile.findFirst;

    await listProspects(SCHOOL_A, COACH_A);
    assert.deepEqual(listWhere, { schoolId: SCHOOL_A, coachUserId: COACH_A });

    await assert.rejects(
      () =>
        updateProspectNotes(SCHOOL_A, COACH_A, "prospect-owned-by-b", {
          notes: "leak attempt",
        }),
      /Prospect not found/
    );
    assert.deepEqual(updateWhere, {
      id: "prospect-owned-by-b",
      schoolId: SCHOOL_A,
      coachUserId: COACH_A,
    });

    await assert.rejects(
      () => removeProspect(SCHOOL_A, COACH_A, "prospect-owned-by-b"),
      /Prospect not found/
    );
    assert.deepEqual(deleteWhere, {
      id: "prospect-owned-by-b",
      schoolId: SCHOOL_A,
      coachUserId: COACH_A,
    });

    await saveProspect(SCHOOL_A, COACH_A, {
      athleteProfileId: "athlete-profile-1",
    });
    assert.equal(createData?.schoolId, SCHOOL_A);
    assert.equal(createData?.coachUserId, COACH_A);
  } finally {
    prisma.savedProspect.findMany = originalFindMany;
    prisma.savedProspect.updateMany = originalUpdateMany;
    prisma.savedProspect.deleteMany = originalDeleteMany;
    prisma.savedProspect.create = originalCreate;
    prisma.athleteProfile.findFirst = originalAthleteFindFirst;
  }
});

test("recruiting records are read and written only within the calling school", async () => {
  const originalFindMany = prisma.recruitingRecord.findMany;
  const originalFindFirst = prisma.recruitingRecord.findFirst;
  const originalUpdate = prisma.recruitingRecord.update;
  const originalUpsert = prisma.recruitingRecord.upsert;
  const originalAthleteFindFirst = prisma.athleteProfile.findFirst;

  let listWhere: Record<string, unknown> | undefined;
  let findFirstWhere: Record<string, unknown> | undefined;
  let upsertWhere: Record<string, unknown> | undefined;
  let updateCalled = false;

  try {
    prisma.recruitingRecord.findMany = (async (args: {
      where?: Record<string, unknown>;
    }) => {
      listWhere = args.where;
      return [];
    }) as typeof prisma.recruitingRecord.findMany;

    prisma.recruitingRecord.findFirst = (async (args: {
      where?: Record<string, unknown>;
    }) => {
      findFirstWhere = args.where;
      return null;
    }) as typeof prisma.recruitingRecord.findFirst;

    prisma.recruitingRecord.update = (async () => {
      updateCalled = true;
      return {};
    }) as typeof prisma.recruitingRecord.update;

    prisma.recruitingRecord.upsert = (async (args: {
      where?: Record<string, unknown>;
    }) => {
      upsertWhere = args.where;
      return { id: "record-a" };
    }) as typeof prisma.recruitingRecord.upsert;

    prisma.athleteProfile.findFirst = (async () => ({
      id: "athlete-profile-1",
    })) as typeof prisma.athleteProfile.findFirst;

    await listRecruitingRecords(SCHOOL_A);
    assert.deepEqual(listWhere, { schoolId: SCHOOL_A });

    await assert.rejects(
      () =>
        updateRecruitingRecord(SCHOOL_A, "record-owned-by-b", {
          privateNotes: "cross-school write",
        }),
      /Recruiting record not found/
    );
    assert.deepEqual(findFirstWhere, {
      id: "record-owned-by-b",
      schoolId: SCHOOL_A,
    });
    assert.equal(updateCalled, false);

    await getOrCreateRecruitingRecord(SCHOOL_A, "athlete-profile-1");
    assert.deepEqual(upsertWhere, {
      schoolId_athleteProfileId: {
        schoolId: SCHOOL_A,
        athleteProfileId: "athlete-profile-1",
      },
    });
  } finally {
    prisma.recruitingRecord.findMany = originalFindMany;
    prisma.recruitingRecord.findFirst = originalFindFirst;
    prisma.recruitingRecord.update = originalUpdate;
    prisma.recruitingRecord.upsert = originalUpsert;
    prisma.athleteProfile.findFirst = originalAthleteFindFirst;
  }
});

test("two-school document direct links cannot cross tenant boundaries", async () => {
  const app = express();
  app.get(
    "/schools/:schoolId/documents/:documentId",
    authenticateToken,
    requireSchoolTenant,
    (req: AuthenticatedRequest, res: Response) => {
      res.status(200).json({ success: true, schoolId: req.schoolId });
    }
  );

  const server = app.listen(0);

  const schoolAToken = signToken({
    userId: COACH_A,
    email: "coach@school-a.edu",
    globalRole: "SCHOOL_STAFF",
    schoolId: SCHOOL_A,
    schoolRole: "COACH_RECRUITER",
  });
  const schoolBToken = signToken({
    userId: COACH_B,
    email: "coach@school-b.edu",
    globalRole: "SCHOOL_STAFF",
    schoolId: SCHOOL_B,
    schoolRole: "COACH_RECRUITER",
  });

  try {
    const ownDocument = await request(
      server,
      `/schools/${SCHOOL_A}/documents/document-a`,
      schoolAToken
    );
    assert.equal(ownDocument.status, 200);
    assert.equal(ownDocument.body.schoolId, SCHOOL_A);

    const crossSchoolDocument = await request(
      server,
      `/schools/${SCHOOL_A}/documents/document-b`,
      schoolBToken
    );
    assert.equal(crossSchoolDocument.status, 403);
    assert.ok(
      (crossSchoolDocument.body.error as string).includes(
        "Cross-school access is strictly prohibited"
      )
    );
  } finally {
    server.close();
  }
});
