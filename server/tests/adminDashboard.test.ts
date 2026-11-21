import test from "node:test";
import assert from "node:assert/strict";

process.env.NODE_ENV = "test";
process.env.DATABASE_URL =
  "postgresql://postgres:postgres@localhost:5432/recruiting_standard_test?schema=public";
process.env.JWT_SECRET = "test-only-secret-value-not-used-in-production-min-32-chars";

import { prisma } from "../src/config/prisma.js";
import { getPlatformDashboard } from "../src/services/adminDashboard.service.js";

const originals = {
  schoolGroupBy: prisma.school.groupBy,
  schoolFindMany: prisma.school.findMany,
  userGroupBy: prisma.user.groupBy,
  userFindMany: prisma.user.findMany,
  profileGroupBy: prisma.athleteProfile.groupBy,
  profileFindMany: prisma.athleteProfile.findMany,
  documentGroupBy: prisma.document.groupBy,
  documentFindMany: prisma.document.findMany,
  subscriptionFindMany: prisma.subscription.findMany,
  recruitingRecordCount: prisma.recruitingRecord.count,
  savedProspectCount: prisma.savedProspect.count,
};

function restorePrisma() {
  prisma.school.groupBy = originals.schoolGroupBy;
  prisma.school.findMany = originals.schoolFindMany;
  prisma.user.groupBy = originals.userGroupBy;
  prisma.user.findMany = originals.userFindMany;
  prisma.athleteProfile.groupBy = originals.profileGroupBy;
  prisma.athleteProfile.findMany = originals.profileFindMany;
  prisma.document.groupBy = originals.documentGroupBy;
  prisma.document.findMany = originals.documentFindMany;
  prisma.subscription.findMany = originals.subscriptionFindMany;
  prisma.recruitingRecord.count = originals.recruitingRecordCount;
  prisma.savedProspect.count = originals.savedProspectCount;
}

test("platform dashboard aggregates schools, users, queues, and derived activity", async () => {
  try {
    prisma.school.groupBy = (async () => [
      { status: "PENDING", _count: { _all: 2 } },
      { status: "APPROVED", _count: { _all: 1 } },
    ]) as typeof prisma.school.groupBy;

    prisma.school.findMany = (async () => [
      {
        id: "school-1",
        name: "School One",
        schoolId: "SCH-1001",
        status: "PENDING",
        createdAt: new Date("2026-11-20T10:00:00.000Z"),
      },
    ]) as typeof prisma.school.findMany;

    prisma.user.groupBy = (async (args: { by: string[] }) =>
      args.by[0] === "globalRole"
        ? [{ globalRole: "ATHLETE", _count: { _all: 4 } }]
        : [{ status: "PENDING", _count: { _all: 1 } }]) as typeof prisma.user.groupBy;

    prisma.user.findMany = (async () => [
      {
        id: "user-1",
        firstName: "New",
        lastName: "Coach",
        email: "coach@school-one.test",
        globalRole: "SCHOOL_STAFF",
        status: "ACTIVE",
        createdAt: new Date("2026-11-19T10:00:00.000Z"),
      },
    ]) as typeof prisma.user.findMany;

    prisma.athleteProfile.groupBy = (async () => [
      { verificationStatus: "PENDING", _count: { _all: 3 } },
    ]) as typeof prisma.athleteProfile.groupBy;

    prisma.athleteProfile.findMany = (async (args: {
      where?: Record<string, unknown>;
    }) => {
      if (args.where) {
        return [
          {
            id: "profile-1",
            primarySport: "Basketball",
            graduationYear: 2027,
            completionPercentage: 90,
            submittedForVerificationAt: new Date("2026-11-18T10:00:00.000Z"),
            user: {
              firstName: "Pending",
              lastName: "Athlete",
              email: "athlete@school-one.test",
            },
            documents: [{ status: "PENDING" }],
          },
        ];
      }
      return [
        {
          id: "profile-1",
          verificationStatus: "PENDING",
          submittedForVerificationAt: new Date("2026-11-18T10:00:00.000Z"),
          verifiedAt: null,
          user: { firstName: "Pending", lastName: "Athlete" },
        },
      ];
    }) as typeof prisma.athleteProfile.findMany;

    prisma.document.groupBy = (async () => [
      { status: "PENDING", _count: { _all: 4 } },
    ]) as typeof prisma.document.groupBy;

    prisma.document.findMany = (async (args: {
      where?: Record<string, unknown>;
    }) => {
      if (args.where) {
        return [
          {
            id: "document-1",
            title: "Transcript",
            type: "TRANSCRIPT",
            createdAt: new Date("2026-11-17T10:00:00.000Z"),
            athleteProfile: {
              user: { firstName: "Pending", lastName: "Athlete" },
            },
          },
        ];
      }
      return [
        {
          id: "document-1",
          title: "Transcript",
          status: "PENDING",
          createdAt: new Date("2026-11-17T10:00:00.000Z"),
          reviewedAt: null,
          athleteProfile: {
            user: { firstName: "Pending", lastName: "Athlete" },
          },
        },
      ];
    }) as typeof prisma.document.findMany;

    prisma.subscription.findMany = (async () => [
      {
        id: "subscription-1",
        state: "ACTIVE",
        expirationDate: null,
        updatedAt: new Date("2026-11-16T10:00:00.000Z"),
        school: { name: "School Two" },
      },
    ]) as typeof prisma.subscription.findMany;

    prisma.recruitingRecord.count = (async () => 12) as typeof prisma.recruitingRecord.count;
    prisma.savedProspect.count = (async () => 8) as typeof prisma.savedProspect.count;

    const dashboard = await getPlatformDashboard();

    assert.equal(dashboard.schools.total, 3);
    assert.equal(dashboard.schools.statusCounts.PENDING, 2);
    assert.equal(dashboard.schools.items[0]?.name, "School One");
    assert.equal(dashboard.users.total, 4);
    assert.equal(dashboard.users.roleCounts.ATHLETE, 4);
    assert.equal(dashboard.users.statusCounts.PENDING, 1);
    assert.equal(dashboard.verificationQueue.profilesPending, 3);
    assert.equal(dashboard.verificationQueue.documentsPending, 4);
    assert.equal(dashboard.verificationQueue.athletes[0]?.name, "Pending Athlete");
    assert.equal(dashboard.verificationQueue.documents[0]?.title, "Transcript");
    assert.equal(dashboard.platformActivity.activeSubscriptions, 1);
    assert.equal(dashboard.platformActivity.recruitingRecords, 12);
    assert.equal(dashboard.platformActivity.savedProspects, 8);

    const activityTypes = dashboard.platformActivity.events.map((event) => event.type);
    assert.ok(activityTypes.includes("SCHOOL"));
    assert.ok(activityTypes.includes("USER"));
    assert.ok(activityTypes.includes("PROFILE"));
    assert.ok(activityTypes.includes("DOCUMENT"));
    assert.ok(activityTypes.includes("SUBSCRIPTION"));

    const timestamps = dashboard.platformActivity.events.map((event) =>
      Date.parse(event.at)
    );
    assert.deepEqual(timestamps, [...timestamps].sort((a, b) => b - a));
  } finally {
    restorePrisma();
  }
});

test("platform dashboard returns zeroed counters when the platform is empty", async () => {
  try {
    prisma.school.groupBy = (async () => []) as typeof prisma.school.groupBy;
    prisma.school.findMany = (async () => []) as typeof prisma.school.findMany;
    prisma.user.groupBy = (async () => []) as typeof prisma.user.groupBy;
    prisma.user.findMany = (async () => []) as typeof prisma.user.findMany;
    prisma.athleteProfile.groupBy = (async () => []) as typeof prisma.athleteProfile.groupBy;
    prisma.athleteProfile.findMany = (async () => []) as typeof prisma.athleteProfile.findMany;
    prisma.document.groupBy = (async () => []) as typeof prisma.document.groupBy;
    prisma.document.findMany = (async () => []) as typeof prisma.document.findMany;
    prisma.subscription.findMany = (async () => []) as typeof prisma.subscription.findMany;
    prisma.recruitingRecord.count = (async () => 0) as typeof prisma.recruitingRecord.count;
    prisma.savedProspect.count = (async () => 0) as typeof prisma.savedProspect.count;

    const dashboard = await getPlatformDashboard();

    assert.equal(dashboard.schools.total, 0);
    assert.equal(dashboard.users.total, 0);
    assert.equal(dashboard.verificationQueue.profilesPending, 0);
    assert.equal(dashboard.verificationQueue.documentsPending, 0);
    assert.equal(dashboard.platformActivity.activeSubscriptions, 0);
    assert.deepEqual(dashboard.platformActivity.events, []);
  } finally {
    restorePrisma();
  }
});
