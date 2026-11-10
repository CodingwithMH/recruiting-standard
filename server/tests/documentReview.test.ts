import test from "node:test";
import assert from "node:assert/strict";

process.env.NODE_ENV = "test";
process.env.DATABASE_URL =
  "postgresql://postgres:postgres@localhost:5432/recruiting_standard_test?schema=public";
process.env.JWT_SECRET = "test-only-secret-value-not-used-in-production-min-32-chars";

import {
  assertDocumentReviewNotes,
  DocumentError,
  evaluateDocumentReview,
  reviewDocumentSchema,
} from "../src/services/document.service.js";
import {
  assertVerificationReviewNotes,
  AthleteVerificationError,
} from "../src/services/athleteVerification.service.js";

test("pending documents can be approved or rejected", () => {
  assert.deepEqual(
    evaluateDocumentReview({
      currentStatus: "PENDING",
      requestedStatus: "APPROVED",
    }),
    { allowed: true, reason: "ALLOWED" }
  );
  assert.deepEqual(
    evaluateDocumentReview({
      currentStatus: "PENDING",
      requestedStatus: "REJECTED",
    }),
    { allowed: true, reason: "ALLOWED" }
  );
});

test("reviewers may reverse a previous document decision", () => {
  assert.equal(
    evaluateDocumentReview({
      currentStatus: "APPROVED",
      requestedStatus: "REJECTED",
    }).allowed,
    true
  );
  assert.equal(
    evaluateDocumentReview({
      currentStatus: "REJECTED",
      requestedStatus: "APPROVED",
    }).allowed,
    true
  );
});

test("re-reviewing a document into its current status is a blocked no-op", () => {
  const approved = evaluateDocumentReview({
    currentStatus: "APPROVED",
    requestedStatus: "APPROVED",
  });
  assert.equal(approved.allowed, false);
  assert.equal(approved.reason, "NO_CHANGE");

  const rejected = evaluateDocumentReview({
    currentStatus: "REJECTED",
    requestedStatus: "REJECTED",
  });
  assert.equal(rejected.allowed, false);
  assert.equal(rejected.reason, "NO_CHANGE");
});

test("document rejections require reviewer notes, approvals do not", () => {
  assert.throws(
    () => assertDocumentReviewNotes("REJECTED", null),
    DocumentError
  );
  assert.throws(
    () => assertDocumentReviewNotes("REJECTED", ""),
    DocumentError
  );
  assert.doesNotThrow(() =>
    assertDocumentReviewNotes("REJECTED", "GPA does not match the transcript")
  );
  assert.doesNotThrow(() => assertDocumentReviewNotes("APPROVED", null));
  assert.doesNotThrow(() =>
    assertDocumentReviewNotes("APPROVED", "Transcript matches the profile")
  );
});

test("profile verification rejections require reviewer notes, approvals do not", () => {
  assert.throws(
    () => assertVerificationReviewNotes("REJECTED", null),
    AthleteVerificationError
  );
  assert.throws(
    () => assertVerificationReviewNotes("REJECTED", ""),
    AthleteVerificationError
  );
  assert.doesNotThrow(() =>
    assertVerificationReviewNotes("REJECTED", "Statistics need a source link")
  );
  assert.doesNotThrow(() => assertVerificationReviewNotes("APPROVED", null));
});

test("document review schema accepts optional notes with an approve or reject status", () => {
  assert.equal(
    reviewDocumentSchema.safeParse({ status: "APPROVED" }).success,
    true
  );
  assert.equal(
    reviewDocumentSchema.safeParse({
      status: "REJECTED",
      reviewerNotes: "  Illegible scan, re-upload a clear copy.  ",
    }).success,
    true
  );
  assert.equal(
    reviewDocumentSchema.safeParse({ status: "PENDING" }).success,
    false
  );
  assert.equal(
    reviewDocumentSchema.safeParse({}).success,
    false
  );
  assert.equal(
    reviewDocumentSchema.safeParse({
      status: "REJECTED",
      reviewerNotes: "x".repeat(2001),
    }).success,
    false
  );
});
