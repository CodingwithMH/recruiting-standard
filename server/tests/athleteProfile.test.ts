import test from "node:test";
import assert from "node:assert/strict";

process.env.NODE_ENV = "test";
process.env.DATABASE_URL =
  "postgresql://postgres:postgres@localhost:5432/recruiting_standard_test?schema=public";
process.env.JWT_SECRET = "test-only-secret-value-not-used-in-production-min-32-chars";

import {
  athleteProfileUpdateSchema,
  calculateCompletionPercentage,
  normalizeSportEntries,
} from "../src/services/athleteProfile.service.js";

test("athlete profile schema requires at least one sport and an expected graduation year", () => {
  const missingSports = athleteProfileUpdateSchema.safeParse({
    graduationYear: 2028,
    sports: [],
    highlightLinks: [],
  });

  assert.equal(missingSports.success, false);

  const valid = athleteProfileUpdateSchema.safeParse({
    graduationYear: 2028,
    sports: [
      {
        sport: "Basketball",
        positions: ["Point Guard"],
        statistics: [{ label: "PPG", value: "18.4" }],
      },
    ],
    highlightLinks: [],
  });

  assert.equal(valid.success, true);
});

test("multi-sport normalization dedupes positions and derives a primary sport", () => {
  const sports = normalizeSportEntries([
    {
      sport: "Basketball",
      isPrimary: false,
      positions: ["Point Guard", "point guard"],
      statistics: [{ label: "PPG", value: "18.4" }],
    },
    {
      sport: "Track & Field",
      isPrimary: true,
      positions: ["100m Dash"],
      statistics: [{ label: "100m", value: "10.9" }],
    },
  ]);

  assert.deepEqual(
    sports.map((sport) => sport.sport),
    ["Basketball", "Track & Field"]
  );
  assert.equal(sports.find((sport) => sport.isPrimary)?.sport, "Track & Field");
  assert.deepEqual(sports[0].positions, ["Point Guard"]);
  assert.deepEqual(sports[1].positions, ["100m Dash"]);
});

test("first sport becomes primary when none is explicitly selected", () => {
  const sports = normalizeSportEntries([
    {
      sport: "Soccer",
      positions: ["Midfielder"],
      statistics: [],
    },
    {
      sport: "Track & Field",
      positions: ["400m"],
      statistics: [],
    },
  ]);

  assert.equal(sports[0].isPrimary, true);
  assert.equal(sports[1].isPrimary, false);
});

test("completion percentage rewards filled multi-sport and academic sections", () => {
  const sports = normalizeSportEntries([
    {
      sport: "Basketball",
      isPrimary: true,
      positions: ["Point Guard"],
      statistics: [{ label: "PPG", value: "18.4" }],
    },
  ]);

  const empty = calculateCompletionPercentage({
    graduationYear: 2028,
    sports,
    highlightLinks: [],
  });

  const complete = calculateCompletionPercentage({
    graduationYear: 2028,
    sports,
    heightInches: 72,
    weightLbs: 175,
    academic: {
      gpa: 3.8,
      actScore: 30,
      satScore: 1400,
      highSchoolName: "Northside Prep",
      city: "Austin",
      state: "TX",
    },
    highlightLinks: ["https://www.hudl.com/video/1"],
  });

  assert.equal(complete, 100);
  assert.ok(empty < complete);
});
