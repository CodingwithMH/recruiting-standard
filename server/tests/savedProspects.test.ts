import test from "node:test";
import assert from "node:assert/strict";

process.env.NODE_ENV = "test";
process.env.DATABASE_URL =
  "postgresql://postgres:postgres@localhost:5432/recruiting_standard_test?schema=public";
process.env.JWT_SECRET = "test-only-secret-value-not-used-in-production-min-32-chars";

import { prisma } from "../src/config/prisma.js";
import { saveProspect } from "../src/services/coach.service.js";

test("prospects can only be saved from approved, active athlete profiles", async () => {
  const originalFindFirst = prisma.athleteProfile.findFirst;
  const originalCreate = prisma.savedProspect.create;

  let athleteWhere: Record<string, unknown> | undefined;
  let createData: Record<string, unknown> | undefined;

  try {
    prisma.athleteProfile.findFirst = (async (args: {
      where?: Record<string, unknown>;
    }) => {
      athleteWhere = args.where;
      return { id: "athlete-profile-approved" };
    }) as typeof prisma.athleteProfile.findFirst;

    prisma.savedProspect.create = (async (args: {
      data?: Record<string, unknown>;
    }) => {
      createData = args.data;
      return {
        id: "prospect-1",
        notes: null,
        savedAt: new Date(),
        athleteProfile: { id: "athlete-profile-approved" },
      };
    }) as typeof prisma.savedProspect.create;

    await saveProspect("school-a", "coach-a", {
      athleteProfileId: "athlete-profile-approved",
      notes: "Priority evaluation",
    });

    assert.deepEqual(athleteWhere, {
      id: "athlete-profile-approved",
      verificationStatus: "APPROVED",
      user: { status: "ACTIVE", globalRole: "ATHLETE" },
    });
    assert.equal(createData?.schoolId, "school-a");
    assert.equal(createData?.coachUserId, "coach-a");
    assert.equal(createData?.athleteProfileId, "athlete-profile-approved");
    assert.equal(createData?.notes, "Priority evaluation");
  } finally {
    prisma.athleteProfile.findFirst = originalFindFirst;
    prisma.savedProspect.create = originalCreate;
  }
});

test("saving a non-approved or missing athlete is rejected", async () => {
  const originalFindFirst = prisma.athleteProfile.findFirst;
  const originalCreate = prisma.savedProspect.create;
  let createCalled = false;

  try {
    prisma.athleteProfile.findFirst = (async () =>
      null) as typeof prisma.athleteProfile.findFirst;
    prisma.savedProspect.create = (async () => {
      createCalled = true;
      return {};
    }) as typeof prisma.savedProspect.create;

    await assert.rejects(
      () =>
        saveProspect("school-a", "coach-a", {
          athleteProfileId: "athlete-profile-unapproved",
        }),
      /Approved athlete profile not found/
    );

    assert.equal(createCalled, false);
  } finally {
    prisma.athleteProfile.findFirst = originalFindFirst;
    prisma.savedProspect.create = originalCreate;
  }
});
