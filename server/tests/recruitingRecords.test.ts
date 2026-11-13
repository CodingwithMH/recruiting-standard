import test from "node:test";
import assert from "node:assert/strict";

process.env.NODE_ENV = "test";
process.env.DATABASE_URL =
  "postgresql://postgres:postgres@localhost:5432/recruiting_standard_test?schema=public";
process.env.JWT_SECRET = "test-only-secret-value-not-used-in-production-min-32-chars";

import { prisma } from "../src/config/prisma.js";
import {
  getOrCreateRecruitingRecord,
  listRecruitingRecords,
  updateRecruitingRecord,
  deleteRecruitingRecord,
} from "../src/services/coach.service.js";

test("getOrCreateRecruitingRecord creates or returns a school-scoped record", async () => {
  const originalFindFirst = prisma.athleteProfile.findFirst;
  const originalUpsert = prisma.recruitingRecord.upsert;

  let upsertWhere: Record<string, unknown> | undefined;

  try {
    prisma.athleteProfile.findFirst = (async () => ({
      id: "athlete-profile-1",
    })) as typeof prisma.athleteProfile.findFirst;

    prisma.recruitingRecord.upsert = (async (args: {
      where?: Record<string, unknown>;
    }) => {
      upsertWhere = args.where;
      return {
        id: "record-1",
        status: "EVALUATING",
        privateNotes: null,
        lastContactAt: null,
        contactLogs: [],
        offers: [],
        commitments: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        athleteProfile: { id: "athlete-profile-1" },
      };
    }) as typeof prisma.recruitingRecord.upsert;

    const record = await getOrCreateRecruitingRecord("school-a", "athlete-profile-1");

    assert.equal(record.id, "record-1");
    assert.deepEqual(upsertWhere, {
      schoolId_athleteProfileId: {
        schoolId: "school-a",
        athleteProfileId: "athlete-profile-1",
      },
    });
  } finally {
    prisma.athleteProfile.findFirst = originalFindFirst;
    prisma.recruitingRecord.upsert = originalUpsert;
  }
});

test("listRecruitingRecords strictly filters by the calling coach's school ID", async () => {
  const originalFindMany = prisma.recruitingRecord.findMany;
  let findManyWhere: Record<string, unknown> | undefined;

  try {
    prisma.recruitingRecord.findMany = (async (args: {
      where?: Record<string, unknown>;
    }) => {
      findManyWhere = args.where;
      return [];
    }) as typeof prisma.recruitingRecord.findMany;

    await listRecruitingRecords("school-isolated-x", "OFFERED");

    assert.equal(findManyWhere?.schoolId, "school-isolated-x");
    assert.equal(findManyWhere?.status, "OFFERED");
  } finally {
    prisma.recruitingRecord.findMany = originalFindMany;
  }
});

test("updateRecruitingRecord prevents cross-school modifications", async () => {
  const originalFindFirst = prisma.recruitingRecord.findFirst;
  const originalUpdate = prisma.recruitingRecord.update;
  let updateCalled = false;

  try {
    // Simulate record exists under school-b, but coach from school-a tries to update it
    prisma.recruitingRecord.findFirst = (async () =>
      null) as typeof prisma.recruitingRecord.findFirst;

    prisma.recruitingRecord.update = (async () => {
      updateCalled = true;
      return {};
    }) as typeof prisma.recruitingRecord.update;

    await assert.rejects(
      () =>
        updateRecruitingRecord("school-a", "record-of-school-b", {
          status: "COMMITTED",
          privateNotes: "Hacked notes",
        }),
      /Recruiting record not found/
    );

    assert.equal(updateCalled, false);
  } finally {
    prisma.recruitingRecord.findFirst = originalFindFirst;
    prisma.recruitingRecord.update = originalUpdate;
  }
});

test("updateRecruitingRecord updates status, private notes, contact logs, offers, and commitments", async () => {
  const originalFindFirst = prisma.recruitingRecord.findFirst;
  const originalUpdate = prisma.recruitingRecord.update;
  let updateData: Record<string, unknown> | undefined;

  try {
    prisma.recruitingRecord.findFirst = (async () => ({
      id: "record-1",
    })) as typeof prisma.recruitingRecord.findFirst;

    prisma.recruitingRecord.update = (async (args: {
      data?: Record<string, unknown>;
    }) => {
      updateData = args.data;
      return { id: "record-1" };
    }) as typeof prisma.recruitingRecord.update;

    const contactDate = "2026-11-13";
    await updateRecruitingRecord("school-a", "record-1", {
      status: "OFFERED",
      privateNotes: "Top tier point guard. Strong defensive instincts.",
      contactLogs: [
        {
          id: "log-1",
          date: contactDate,
          type: "Phone Call",
          notes: "Discussed academic fit and campus visit schedule.",
          coachName: "Coach Miller",
        },
      ],
      offers: [
        {
          id: "offer-1",
          date: contactDate,
          type: "Full Scholarship",
          details: "4-year full athletic grant-in-aid.",
          status: "Offered",
        },
      ],
      commitments: {
        committedDate: "2026-11-14",
        details: "Verbal commitment received.",
        transferStatus: "Direct High School",
      },
    });

    assert.equal(updateData?.status, "OFFERED");
    assert.equal(
      updateData?.privateNotes,
      "Top tier point guard. Strong defensive instincts."
    );
    assert.equal(Array.isArray(updateData?.contactLogs), true);
    assert.equal(Array.isArray(updateData?.offers), true);
    assert.equal(typeof updateData?.commitments, "object");
  } finally {
    prisma.recruitingRecord.findFirst = originalFindFirst;
    prisma.recruitingRecord.update = originalUpdate;
  }
});

test("deleteRecruitingRecord deletes records within school and rejects cross-school deletes", async () => {
  const originalFindFirst = prisma.recruitingRecord.findFirst;
  const originalDelete = prisma.recruitingRecord.delete;
  let deletedId: string | undefined;

  try {
    prisma.recruitingRecord.findFirst = (async () => ({
      id: "record-1",
    })) as typeof prisma.recruitingRecord.findFirst;

    prisma.recruitingRecord.delete = (async (args: {
      where?: { id: string };
    }) => {
      deletedId = args.where?.id;
      return {};
    }) as typeof prisma.recruitingRecord.delete;

    const result = await deleteRecruitingRecord("school-a", "record-1");
    assert.equal(result.success, true);
    assert.equal(deletedId, "record-1");

    // Cross-school delete test
    prisma.recruitingRecord.findFirst = (async () =>
      null) as typeof prisma.recruitingRecord.findFirst;

    await assert.rejects(
      () => deleteRecruitingRecord("school-other", "record-1"),
      /Recruiting record not found/
    );
  } finally {
    prisma.recruitingRecord.findFirst = originalFindFirst;
    prisma.recruitingRecord.delete = originalDelete;
  }
});

