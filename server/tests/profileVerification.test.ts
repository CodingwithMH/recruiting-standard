import test from "node:test";
import assert from "node:assert/strict";

process.env.NODE_ENV = "test";
process.env.DATABASE_URL =
  "postgresql://postgres:postgres@localhost:5432/recruiting_standard_test?schema=public";
process.env.JWT_SECRET = "test-only-secret-value-not-used-in-production-min-32-chars";

import {
  MIN_SUBMISSION_COMPLETION,
  evaluateVerificationSubmission,
  getCompletionBreakdown,
  normalizeSportEntries,
  verificationSubmissionMessage,
} from "../src/services/athleteProfile.service.js";
import {
  athleteVerificationReviewSchema,
  evaluateVerificationReview,
} from "../src/services/athleteVerification.service.js";

const fullSports = () =>
  normalizeSportEntries([
    {
      sport: "Basketball",
      isPrimary: true,
      positions: ["Point Guard"],
      statistics: [{ label: "PPG", value: "18.4" }],
    },
  ]);

const completeAcademic = {
  gpa: 3.8,
  actScore: 30,
  satScore: 1400,
  highSchoolName: "Northside Prep",
  city: "Austin",
  state: "TX",
};

test("completion breakdown reports every checklist item for a complete profile", () => {
  const breakdown = getCompletionBreakdown({
    graduationYear: 2028,
    sports: fullSports(),
    heightInches: 72,
    weightLbs: 175,
    academic: completeAcademic,
    highlightLinks: ["https://www.hudl.com/video/1"],
  });

  assert.equal(breakdown.percentage, 100);
  assert.equal(breakdown.items.length, 10);
  assert.ok(breakdown.items.every((item) => item.complete));
  assert.deepEqual(
    breakdown.items.filter((item) => !item.complete),
    []
  );
});

test("completion breakdown flags exactly the missing items for a sparse profile", () => {
  const breakdown = getCompletionBreakdown({
    graduationYear: 2028,
    sports: fullSports(),
    academic: {
      gpa: null,
      actScore: null,
      satScore: undefined,
      highSchoolName: "",
      city: "Austin",
      state: null,
    },
    highlightLinks: [],
  });

  // Present: graduation year, sport, positions, statistics, city.
  // Missing: GPA, test score, high school, highlight link, measurements.
  assert.equal(breakdown.percentage, 50);
  assert.deepEqual(
    breakdown.items.filter((item) => !item.complete).map((item) => item.key),
    ["gpa", "testScore", "highSchoolName", "highlightLinks", "measurements"]
  );
});

test("stored null academic values count as missing, not complete", () => {
  const breakdown = getCompletionBreakdown({
    graduationYear: 2028,
    sports: fullSports(),
    heightInches: null,
    weightLbs: null,
    academic: null,
    highlightLinks: [],
  });

  assert.ok(
    breakdown.items
      .filter((item) =>
        ["gpa", "testScore", "highSchoolName", "location", "measurements"].includes(
          item.key
        )
      )
      .every((item) => item.complete === false)
  );
});

test("an unverified profile at the completion threshold can be submitted", () => {
  // 8 of 10 items complete -> 80%, the minimum submission threshold.
  const breakdown = getCompletionBreakdown({
    graduationYear: 2028,
    sports: fullSports(),
    academic: completeAcademic,
    highlightLinks: [],
    heightInches: undefined,
    weightLbs: undefined,
  });

  assert.equal(breakdown.percentage, MIN_SUBMISSION_COMPLETION);

  const decision = evaluateVerificationSubmission({
    verificationStatus: "UNVERIFIED",
    completionPercentage: breakdown.percentage,
    missingItemCount: 2,
  });

  assert.equal(decision.allowed, true);
  assert.equal(decision.reason, "ALLOWED");
});

test("an incomplete profile cannot be submitted for verification", () => {
  const decision = evaluateVerificationSubmission({
    verificationStatus: "UNVERIFIED",
    completionPercentage: 70,
    missingItemCount: 3,
  });

  assert.equal(decision.allowed, false);
  assert.equal(decision.reason, "PROFILE_INCOMPLETE");

  const message = verificationSubmissionMessage(decision);
  assert.match(message, new RegExp(`${MIN_SUBMISSION_COMPLETION}%`));
  assert.match(message, /3 checklist items still missing/);
});

test("profiles pending, approved, or rejected cannot be resubmitted directly", () => {
  const statuses = ["PENDING", "APPROVED", "REJECTED"] as const;
  const expectedReasons = [
    "ALREADY_PENDING",
    "ALREADY_APPROVED",
    "MUST_UPDATE_BEFORE_RESUBMIT",
  ];

  statuses.forEach((verificationStatus, index) => {
    const decision = evaluateVerificationSubmission({
      verificationStatus,
      completionPercentage: 100,
      missingItemCount: 0,
    });

    assert.equal(decision.allowed, false);
    assert.equal(decision.reason, expectedReasons[index]);
    assert.ok(verificationSubmissionMessage(decision).length > 0);
  });
});

test("only pending profiles can be reviewed by a platform admin", () => {
  assert.deepEqual(
    evaluateVerificationReview({ currentStatus: "PENDING" }),
    { allowed: true, reason: "ALLOWED" }
  );

  (["UNVERIFIED", "APPROVED", "REJECTED"] as const).forEach(
    (currentStatus) => {
      const decision = evaluateVerificationReview({ currentStatus });
      assert.equal(decision.allowed, false);
      assert.equal(decision.reason, "NOT_PENDING");
    }
  );
});

test("verification review schema only accepts approve or reject decisions", () => {
  assert.equal(
    athleteVerificationReviewSchema.safeParse({ status: "APPROVED" }).success,
    true
  );
  assert.equal(
    athleteVerificationReviewSchema.safeParse({
      status: "REJECTED",
      notes: "  GPA does not match the transcript.  ",
    }).success,
    true
  );
  assert.equal(
    athleteVerificationReviewSchema.safeParse({ status: "PENDING" }).success,
    false
  );
  assert.equal(
    athleteVerificationReviewSchema.safeParse({}).success,
    false
  );
});
