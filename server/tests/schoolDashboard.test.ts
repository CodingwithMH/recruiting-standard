import test from "node:test";
import assert from "node:assert/strict";

process.env.NODE_ENV = "test";
process.env.DATABASE_URL =
  "postgresql://postgres:postgres@localhost:5432/recruiting_standard_test?schema=public";
process.env.JWT_SECRET = "test-only-secret-value-not-used-in-production-min-32-chars";

import { prisma } from "../src/config/prisma.js";
import { getSchoolDashboard } from "../src/services/schoolDashboard.service.js";

const schoolFindUnique = prisma.school.findUnique;
const userFindMany = prisma.user.findMany;
const prospectCount = prisma.savedProspect.count;
const prospectFindMany = prisma.savedProspect.findMany;
const recordFindMany = prisma.recruitingRecord.findMany;

function restorePrisma() {
  prisma.school.findUnique = schoolFindUnique;
  prisma.user.findMany = userFindMany;
  prisma.savedProspect.count = prospectCount;
  prisma.savedProspect.findMany = prospectFindMany;
  prisma.recruitingRecord.findMany = recordFindMany;
}

test("school dashboard aggregates only the requesting tenant's data", async () => {
  let rosterWhere: Record<string, unknown> | undefined;
  let prospectWhere: Record<string, unknown> | undefined;
  let recordWhere: Record<string, unknown> | undefined;

  try {
    prisma.school.findUnique = (async () => ({
      id: "school-a",
      schoolId: "SCH-1001",
      name: "School A",
    })) as typeof prisma.school.findUnique;

    prisma.user.findMany = (async (args: { where?: Record<string, unknown> }) => {
      rosterWhere = args.where;
      return [
        {
          id: "user-1",
          firstName: "Active",
          lastName: "Athlete",
          email: "active@school-a.test",
          status: "ACTIVE",
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
          athleteProfile: {
            id: "profile-1",
            graduationYear: 2027,
            primarySport: "Basketball",
            sports: ["Basketball"],
            completionPercentage: 100,
            verificationStatus: "APPROVED",
          },
        },
        {
          id: "user-2",
          firstName: "Incomplete",
          lastName: "Athlete",
          email: "incomplete@school-a.test",
          status: "PENDING",
          createdAt: new Date("2026-02-01T00:00:00.000Z"),
          athleteProfile: {
            id: "profile-2",
            graduationYear: 2028,
            primarySport: "Football",
            sports: ["Football"],
            completionPercentage: 60,
            verificationStatus: "PENDING",
          },
        },
        {
          id: "user-3",
          firstName: "No",
          lastName: "Profile",
          email: "none@school-a.test",
          status: "ACTIVE",
          createdAt: new Date("2026-03-01T00:00:00.000Z"),
          athleteProfile: null,
        },
      ];
    }) as typeof prisma.user.findMany;

    prisma.savedProspect.count = (async (args: {
      where?: Record<string, unknown>;
    }) => {
      prospectWhere = args.where;
      return 1;
    }) as typeof prisma.savedProspect.count;

    prisma.savedProspect.findMany = (async () => [
      {
        id: "prospect-1",
        savedAt: new Date("2026-10-01T00:00:00.000Z"),
        athleteProfile: {
          id: "profile-1",
          primarySport: "Basketball",
          sports: ["Basketball"],
          graduationYear: 2027,
          user: { firstName: "Active", lastName: "Athlete" },
        },
      },
    ]) as typeof prisma.savedProspect.findMany;

    prisma.recruitingRecord.findMany = (async (args: {
      where?: Record<string, unknown>;
    }) => {
      recordWhere = args.where;
      return [
        {
          id: "record-1",
          status: "OFFERED",
          createdAt: new Date("2026-09-01T00:00:00.000Z"),
          updatedAt: new Date("2026-10-05T00:00:00.000Z"),
          contactLogs: [
            { id: "contact-1", date: "2026-10-02T00:00:00.000Z", type: "Phone Call" },
          ],
          offers: [
            { id: "offer-1", date: "2026-10-04T00:00:00.000Z", type: "Full Scholarship" },
          ],
          commitments: null,
          athleteProfile: {
            id: "profile-1",
            user: { firstName: "Active", lastName: "Athlete" },
          },
        },
      ];
    }) as typeof prisma.recruitingRecord.findMany;

    const dashboard = await getSchoolDashboard("school-a");

    assert.deepEqual(prospectWhere, { schoolId: "school-a" });
    assert.deepEqual(recordWhere, { schoolId: "school-a" });
    assert.deepEqual(rosterWhere?.OR, [
      { schoolId: { in: ["school-a", "SCH-1001"] } },
      { schoolId: { equals: "SCH-1001", mode: "insensitive" } },
    ]);

    assert.equal(dashboard.athletes.total, 3);
    assert.equal(dashboard.athletes.active, 2);
    assert.equal(dashboard.athletes.pendingApproval, 1);
    assert.equal(dashboard.athletes.verified, 1);
    assert.equal(dashboard.incompleteProfiles.total, 2);
    assert.equal(dashboard.incompleteProfiles.items[0]?.name, "No Profile");
    assert.equal(dashboard.savedProspects.total, 1);
    assert.equal(dashboard.savedProspects.items[0]?.name, "Active Athlete");
    assert.equal(dashboard.recruitingActivity.totalRecords, 1);
    assert.equal(dashboard.recruitingActivity.statusCounts.OFFERED, 1);
    assert.equal(dashboard.recruitingActivity.contactCount, 1);
    assert.equal(dashboard.recruitingActivity.offerCount, 1);
    assert.ok(
      dashboard.recruitingActivity.items.some((item) => item.type === "CONTACT")
    );
    assert.ok(
      dashboard.recruitingActivity.items.some((item) => item.type === "OFFER")
    );
  } finally {
    restorePrisma();
  }
});

test("school dashboard returns empty collections when there is no data", async () => {
  try {
    prisma.school.findUnique = (async () => ({
      id: "school-b",
      schoolId: "SCH-1002",
      name: "School B",
    })) as typeof prisma.school.findUnique;

    prisma.user.findMany = (async () => []) as typeof prisma.user.findMany;
    prisma.savedProspect.count = (async () => 0) as typeof prisma.savedProspect.count;
    prisma.savedProspect.findMany = (async () => []) as typeof prisma.savedProspect.findMany;
    prisma.recruitingRecord.findMany = (async () => []) as typeof prisma.recruitingRecord.findMany;

    const dashboard = await getSchoolDashboard("school-b");

    assert.equal(dashboard.athletes.total, 0);
    assert.equal(dashboard.incompleteProfiles.total, 0);
    assert.equal(dashboard.savedProspects.total, 0);
    assert.equal(dashboard.recruitingActivity.totalRecords, 0);
    assert.deepEqual(dashboard.recruitingActivity.items, []);
  } finally {
    restorePrisma();
  }
});
