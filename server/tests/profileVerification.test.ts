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
import {
  evaluateVerificationRequirements,
  verificationRequirementsMessage,
} from "../src/services/verificationRequirements.service.js";

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

const yearsAgo = (years: number): Date => {
  const date = new Date();
  date.setFullYear(date.getFullYear() - years);
  return date;
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
    enrollmentDocumentCount: 1,
  });

  assert.equal(decision.allowed, true);
  assert.equal(decision.reason, "ALLOWED");
});

test("an incomplete profile cannot be submitted for verification", () => {
  const decision = evaluateVerificationSubmission({
    verificationStatus: "UNVERIFIED",
    completionPercentage: 70,
    missingItemCount: 3,
    enrollmentDocumentCount: 1,
  });

  assert.equal(decision.allowed, false);
  assert.equal(decision.reason, "PROFILE_INCOMPLETE");

  const message = verificationSubmissionMessage(decision);
  assert.match(message, new RegExp(`${MIN_SUBMISSION_COMPLETION}%`));
  assert.match(message, /3 checklist items still missing/);
});

test("submission requires an enrollment document that is pending or approved", () => {
  const decision = evaluateVerificationSubmission({
    verificationStatus: "UNVERIFIED",
    completionPercentage: 100,
    missingItemCount: 0,
    enrollmentDocumentCount: 0,
  });

  assert.equal(decision.allowed, false);
  assert.equal(decision.reason, "NO_ENROLLMENT_PROOF");
  assert.match(
    verificationSubmissionMessage(decision),
    /enrollment letter or current report card/i
  );
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
      enrollmentDocumentCount: 1,
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

test("under-18 athletes need approved enrollment proof and recorded guardian consent", () => {
  const withoutConsent = evaluateVerificationRequirements({
    dateOfBirth: yearsAgo(15),
    documents: [{ type: "ENROLLMENT_LETTER", status: "APPROVED" }],
    guardianConsentRecorded: false,
  });

  assert.equal(withoutConsent.isMinor, true);
  assert.equal(withoutConsent.guardianConsentRequired, true);
  assert.equal(withoutConsent.enrollmentProofApproved, true);
  assert.equal(withoutConsent.eligibleForApproval, false);
  assert.deepEqual(withoutConsent.missingRequirements, ["GUARDIAN_CONSENT"]);
  assert.match(
    verificationRequirementsMessage(withoutConsent),
    /guardian consent/i
  );

  const withConsent = evaluateVerificationRequirements({
    dateOfBirth: yearsAgo(15),
    documents: [{ type: "REPORT_CARD", status: "APPROVED" }],
    guardianConsentRecorded: true,
  });

  assert.equal(withConsent.eligibleForApproval, true);
  assert.deepEqual(withConsent.missingRequirements, []);
});

test("adults need approved enrollment proof but not guardian consent", () => {
  const requirements = evaluateVerificationRequirements({
    dateOfBirth: yearsAgo(20),
    documents: [{ type: "REPORT_CARD", status: "APPROVED" }],
    guardianConsentRecorded: false,
  });

  assert.equal(requirements.isMinor, false);
  assert.equal(requirements.guardianConsentRequired, false);
  assert.equal(requirements.guardianConsentRecorded, false);
  assert.equal(requirements.eligibleForApproval, true);
});

test("a missing date of birth conservatively requires guardian consent", () => {
  const requirements = evaluateVerificationRequirements({
    dateOfBirth: null,
    documents: [{ type: "ENROLLMENT_LETTER", status: "APPROVED" }],
    guardianConsentRecorded: false,
  });

  assert.equal(requirements.guardianConsentRequired, true);
  assert.equal(requirements.eligibleForApproval, false);
  assert.deepEqual(requirements.missingRequirements, ["GUARDIAN_CONSENT"]);
});

test("only an approved required document satisfies enrollment proof", () => {
  const missingProof = evaluateVerificationRequirements({
    dateOfBirth: yearsAgo(20),
    documents: [
      { type: "TRANSCRIPT", status: "APPROVED" },
      { type: "PHYSICAL", status: "REJECTED" },
    ],
    guardianConsentRecorded: false,
  });

  assert.equal(missingProof.enrollmentProofStatus, "MISSING");
  assert.equal(missingProof.eligibleForApproval, false);
  assert.deepEqual(missingProof.missingRequirements, ["ENROLLMENT_PROOF"]);

  const rejectedProof = evaluateVerificationRequirements({
    dateOfBirth: yearsAgo(20),
    documents: [
      { type: "ENROLLMENT_LETTER", status: "REJECTED" },
      { type: "TRANSCRIPT", status: "REJECTED" },
    ],
    guardianConsentRecorded: false,
  });

  assert.equal(rejectedProof.enrollmentProofStatus, "REJECTED");
  assert.equal(rejectedProof.eligibleForApproval, false);

  const approvedWithOptionalRejection = evaluateVerificationRequirements({
    dateOfBirth: yearsAgo(20),
    documents: [
      { type: "REPORT_CARD", status: "APPROVED" },
      { type: "TRANSCRIPT", status: "REJECTED" },
    ],
    guardianConsentRecorded: false,
  });

  assert.equal(approvedWithOptionalRejection.enrollmentProofStatus, "APPROVED");
  assert.equal(approvedWithOptionalRejection.eligibleForApproval, true);
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
