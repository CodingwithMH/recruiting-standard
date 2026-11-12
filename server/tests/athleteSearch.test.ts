import test from "node:test";
import assert from "node:assert/strict";

process.env.NODE_ENV = "test";
process.env.DATABASE_URL =
  "postgresql://postgres:postgres@localhost:5432/recruiting_standard_test?schema=public";
process.env.JWT_SECRET = "test-only-secret-value-not-used-in-production-min-32-chars";

import { prisma } from "../src/config/prisma.js";
import {
  athleteSearchQuerySchema,
  buildAthleteSearchWhere,
  searchAthletes,
} from "../src/services/coach.service.js";

test("search query schema accepts only the agreed filter set", () => {
  const parsed = athleteSearchQuerySchema.safeParse({
    sport: "Basketball",
    graduationYear: "2028",
    position: "Point Guard",
    location: "Austin, TX",
    verificationStatus: "UNVERIFIED",
  });

  assert.equal(parsed.success, true);
  if (!parsed.success) return;

  assert.equal(parsed.data.sport, "Basketball");
  assert.equal(parsed.data.graduationYear, 2028);
  assert.equal(parsed.data.position, "Point Guard");
  assert.equal(parsed.data.location, "Austin, TX");
  assert.equal(
    "verificationStatus" in parsed.data,
    false,
    "verification status must never be client-selectable"
  );
});

test("search is always scoped to approved, active athlete profiles", () => {
  const where = buildAthleteSearchWhere({ page: 1, limit: 20 });

  assert.equal(where.verificationStatus, "APPROVED");
  assert.deepEqual(where.user, {
    status: "ACTIVE",
    globalRole: "ATHLETE",
  });
  assert.equal(where.AND, undefined);
});

test("agreed filters map to the athlete profile fields", () => {
  const where = buildAthleteSearchWhere({
    sport: "Basketball",
    graduationYear: 2028,
    position: "Point Guard",
    location: "Austin, TX",
    page: 1,
    limit: 20,
  });

  assert.equal(where.graduationYear, 2028);

  const filters = where.AND as Array<Record<string, unknown>>;
  assert.equal(filters.length, 3);

  const sportFilter = filters[0] as {
    OR: Array<Record<string, unknown>>;
  };
  assert.ok(sportFilter.OR.length > 0);
  assert.deepEqual(sportFilter.OR[0], {
    primarySport: { contains: "Basketball", mode: "insensitive" },
  });

  assert.deepEqual(filters[1], {
    positions: {
      hasSome: ["Point Guard", "point guard", "POINT GUARD"],
    },
  });

  assert.deepEqual(filters[2], {
    city: { contains: "Austin", mode: "insensitive" },
    state: { equals: "TX", mode: "insensitive" },
  });
});

test("location without a state is matched against city or state", () => {
  const where = buildAthleteSearchWhere({
    location: "Texas",
    page: 1,
    limit: 20,
  });

  const filters = where.AND as Array<Record<string, unknown>>;
  assert.equal(filters.length, 1);
  assert.deepEqual(filters[0], {
    OR: [
      { city: { contains: "Texas", mode: "insensitive" } },
      { state: { contains: "Texas", mode: "insensitive" } },
    ],
  });
});

test("searchAthletes applies the approved-only where clause and pagination", async () => {
  const originalCount = prisma.athleteProfile.count;
  const originalFindMany = prisma.athleteProfile.findMany;

  let countWhere: Record<string, unknown> | undefined;
  let findArgs:
    | {
        where?: Record<string, unknown>;
        skip?: number;
        take?: number;
      }
    | undefined;

  try {
    prisma.athleteProfile.count = (async (args: {
      where?: Record<string, unknown>;
    }) => {
      countWhere = args.where;
      return 0;
    }) as typeof prisma.athleteProfile.count;

    prisma.athleteProfile.findMany = (async (args: {
      where?: Record<string, unknown>;
      skip?: number;
      take?: number;
    }) => {
      findArgs = args;
      return [];
    }) as typeof prisma.athleteProfile.findMany;

    const result = await searchAthletes({
      sport: "Basketball",
      graduationYear: 2028,
      page: 2,
      limit: 10,
    });

    assert.equal(countWhere?.verificationStatus, "APPROVED");
    assert.equal(findArgs?.where?.verificationStatus, "APPROVED");
    assert.equal(findArgs?.where?.graduationYear, 2028);
    assert.equal(findArgs?.skip, 10);
    assert.equal(findArgs?.take, 10);
    assert.deepEqual(result.pagination, {
      total: 0,
      page: 2,
      limit: 10,
      totalPages: 0,
    });
  } finally {
    prisma.athleteProfile.count = originalCount;
    prisma.athleteProfile.findMany = originalFindMany;
  }
});
