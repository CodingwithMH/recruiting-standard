import test from "node:test";
import assert from "node:assert/strict";

process.env.NODE_ENV = "test";
process.env.DATABASE_URL =
  "postgresql://postgres:postgres@localhost:5432/recruiting_standard_test?schema=public";
process.env.JWT_SECRET = "test-only-secret-value-not-used-in-production-min-32-chars";

import {
  MAX_DOCUMENT_BYTES,
  documentMetadataSchema,
  evaluateDocumentAccess,
  getFileExtension,
  resolveDocumentExtension,
  type DocumentAccessContext,
  type DocumentRequester,
} from "../src/services/document.service.js";
import {
  PrivateStorageError,
  assertStorageKeyBelongsToProfile,
  buildDocumentStorageKey,
  documentStoragePrefix,
} from "../src/services/privateStorage.service.js";

const validDocument = {
  filename: "official-transcript.pdf",
  mimeType: "application/pdf",
  sizeBytes: 1024,
  type: "TRANSCRIPT" as const,
  title: "Official High School Transcript",
};

test("document metadata accepts PDF, JPEG, and PNG files within the size limit", () => {
  for (const sample of [
    validDocument,
    { ...validDocument, filename: "physical.JPG", mimeType: "image/jpeg" },
    { ...validDocument, filename: "report.png", mimeType: "image/png" },
  ]) {
    const parsed = documentMetadataSchema.safeParse(sample);
    assert.equal(parsed.success, true, JSON.stringify(parsed));
  }
});

test("document metadata rejects unsupported, mismatched, empty, and oversize files", () => {
  const unsupported = documentMetadataSchema.safeParse({
    ...validDocument,
    filename: "archive.zip",
    mimeType: "application/zip",
  });
  assert.equal(unsupported.success, false);

  const mismatched = documentMetadataSchema.safeParse({
    ...validDocument,
    filename: "transcript.exe",
  });
  assert.equal(mismatched.success, false);

  const noExtension = documentMetadataSchema.safeParse({
    ...validDocument,
    filename: "transcript",
  });
  assert.equal(noExtension.success, false);

  const empty = documentMetadataSchema.safeParse({
    ...validDocument,
    sizeBytes: 0,
  });
  assert.equal(empty.success, false);

  const oversize = documentMetadataSchema.safeParse({
    ...validDocument,
    sizeBytes: MAX_DOCUMENT_BYTES + 1,
  });
  assert.equal(oversize.success, false);

  const pathTraversal = documentMetadataSchema.safeParse({
    ...validDocument,
    filename: "../secret.pdf",
  });
  assert.equal(pathTraversal.success, false);
});

test("document extension resolution only trusts an allow-listed matching extension", () => {
  assert.equal(resolveDocumentExtension("Transcript.PDF", "application/pdf"), "pdf");
  assert.equal(resolveDocumentExtension("photo.jpeg", "image/jpeg"), "jpeg");
  assert.equal(getFileExtension("C:\\fakepath\\photo.png"), "png");
  assert.equal(getFileExtension("no-extension"), null);

  assert.throws(
    () => resolveDocumentExtension("photo.gif", "image/jpeg"),
    /does not match/
  );
  assert.throws(
    () => resolveDocumentExtension("photo.pdf", "application/zip"),
    /Unsupported document type/
  );
});

test("private storage keys are athlete-scoped, unique, and reject cross-profile reuse", () => {
  const profileA = "11111111-1111-4111-8111-111111111111";
  const profileB = "22222222-2222-4222-8222-222222222222";

  const first = buildDocumentStorageKey(profileA, "pdf");
  const second = buildDocumentStorageKey(profileA, "pdf");

  assert.ok(first.startsWith(documentStoragePrefix(profileA)));
  assert.ok(first.endsWith(".pdf"));
  assert.notEqual(first, second);
  assert.doesNotThrow(() =>
    assertStorageKeyBelongsToProfile(first, profileA)
  );

  assert.throws(
    () => assertStorageKeyBelongsToProfile(first, profileB),
    (err: unknown) =>
      err instanceof PrivateStorageError && err.statusCode === 403
  );

  assert.throws(
    () =>
      assertStorageKeyBelongsToProfile(
        `${documentStoragePrefix(profileA)}../another-athlete/file.pdf`,
        profileA
      ),
    (err: unknown) =>
      err instanceof PrivateStorageError && err.statusCode === 403
  );
});

const athleteUserId = "athlete-user";

function accessContext(
  overrides: Partial<DocumentAccessContext> = {}
): DocumentAccessContext {
  return {
    athleteUserId,
    athleteAccountActive: true,
    documentStatus: "APPROVED",
    athleteVerificationStatus: "APPROVED",
    parentLinkActive: false,
    schoolStatus: "APPROVED",
    subscriptionActive: true,
    ...overrides,
  };
}

const owner: DocumentRequester = {
  userId: athleteUserId,
  globalRole: "ATHLETE",
};
const admin: DocumentRequester = {
  userId: "admin-user",
  globalRole: "PLATFORM_ADMIN",
};
const linkedParent: DocumentRequester = {
  userId: "parent-user",
  globalRole: "PARENT",
};
const coach: DocumentRequester = {
  userId: "coach-user",
  globalRole: "SCHOOL_STAFF",
  schoolId: "school-a",
};

test("document owners and platform admins can always access their records", () => {
  assert.deepEqual(
    evaluateDocumentAccess(
      owner,
      accessContext({
        documentStatus: "PENDING",
        athleteVerificationStatus: "UNVERIFIED",
        athleteAccountActive: false,
      })
    ),
    { allowed: true, reason: "OWNER" }
  );

  assert.deepEqual(
    evaluateDocumentAccess(
      admin,
      accessContext({ athleteAccountActive: false })
    ),
    { allowed: true, reason: "PLATFORM_ADMIN" }
  );
});

test("parents require an active guardian link", () => {
  assert.deepEqual(
    evaluateDocumentAccess(linkedParent, accessContext({ parentLinkActive: true })),
    { allowed: true, reason: "PARENT_LINK" }
  );

  assert.deepEqual(
    evaluateDocumentAccess(linkedParent, accessContext({ parentLinkActive: false })),
    { allowed: false, reason: "PARENT_NOT_LINKED" }
  );
});

test("school staff can only read approved documents for approved athletes with an active subscription", () => {
  assert.deepEqual(evaluateDocumentAccess(coach, accessContext()), {
    allowed: true,
    reason: "SCHOOL_STAFF",
  });

  for (const [overrides, reason] of [
    [{ documentStatus: "PENDING" }, "DOCUMENT_NOT_APPROVED"],
    [{ documentStatus: "REJECTED" }, "DOCUMENT_NOT_APPROVED"],
    [{ athleteVerificationStatus: "PENDING" }, "ATHLETE_NOT_APPROVED"],
    [{ schoolStatus: "PENDING" }, "SCHOOL_NOT_APPROVED"],
    [{ schoolStatus: "SUSPENDED" }, "SCHOOL_NOT_APPROVED"],
    [{ subscriptionActive: false }, "SUBSCRIPTION_INACTIVE"],
  ] as const) {
    assert.deepEqual(evaluateDocumentAccess(coach, accessContext(overrides)), {
      allowed: false,
      reason,
    });
  }

  assert.deepEqual(
    evaluateDocumentAccess(
      { ...coach, schoolId: undefined },
      accessContext()
    ),
    { allowed: false, reason: "NO_SCHOOL" }
  );
});

test("inactive or unrelated accounts cannot access private documents", () => {
  assert.deepEqual(
    evaluateDocumentAccess(coach, accessContext({ athleteAccountActive: false })),
    { allowed: false, reason: "ATHLETE_INACTIVE" }
  );

  assert.deepEqual(
    evaluateDocumentAccess(
      { userId: "other", globalRole: "ATHLETE" },
      accessContext()
    ),
    { allowed: false, reason: "ROLE_NOT_ALLOWED" }
  );
});
