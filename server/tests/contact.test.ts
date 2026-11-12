import test from "node:test";
import assert from "node:assert/strict";

process.env.NODE_ENV = "test";
process.env.DATABASE_URL =
  "postgresql://postgres:postgres@localhost:5432/recruiting_standard_test?schema=public";
process.env.JWT_SECRET = "test-only-secret-value-not-used-in-production-min-32-chars";

import {
  CONTACT_INQUIRY_LABELS,
  CONTACT_INQUIRY_TYPES,
  contactInquirySchema,
  getContactInquiryInbox,
  submitContactInquiry,
} from "../src/services/contact.service.js";
import type { ContactInquiryInput } from "../src/services/contact.service.js";
import type { ContactInquiryEmailInput } from "../src/utils/email.js";

const validInquiry: ContactInquiryInput = {
  name: "Jordan Blake",
  email: "jordan.blake@lincolnathletics.org",
  inquiryType: "SCHOOL_REGISTRATION",
  message: "We would like to register our school and learn about annual pricing.",
};

test("contactInquirySchema accepts every supported inquiry type", () => {
  for (const inquiryType of CONTACT_INQUIRY_TYPES) {
    const result = contactInquirySchema.safeParse({
      ...validInquiry,
      inquiryType,
    });
    assert.equal(result.success, true, `${inquiryType} should be accepted`);
  }
});

test("contactInquirySchema rejects invalid contact details", () => {
  const invalidEmail = contactInquirySchema.safeParse({
    ...validInquiry,
    email: "not-an-email",
  });
  assert.equal(invalidEmail.success, false);

  const missingType = contactInquirySchema.safeParse({
    ...validInquiry,
    inquiryType: undefined,
  });
  assert.equal(missingType.success, false);

  const shortMessage = contactInquirySchema.safeParse({
    ...validInquiry,
    message: "Hi",
  });
  assert.equal(shortMessage.success, false);

  const unsupportedType = contactInquirySchema.safeParse({
    ...validInquiry,
    inquiryType: "BILLING_REFUND",
  });
  assert.equal(unsupportedType.success, false);
});

test("every inquiry type is delivered to the same configured inbox", async () => {
  const expectedInbox = getContactInquiryInbox();

  for (const inquiryType of CONTACT_INQUIRY_TYPES) {
    let capturedTo = "";
    let capturedInquiry: ContactInquiryEmailInput | null = null;

    const result = await submitContactInquiry(
      { ...validInquiry, inquiryType },
      async (to, inquiry) => {
        capturedTo = to;
        capturedInquiry = inquiry;
        return true;
      }
    );

    assert.equal(result.delivered, true);
    assert.equal(result.inquiryType, inquiryType);
    assert.equal(result.recipient, expectedInbox);
    assert.equal(capturedTo, expectedInbox);

    assert.ok(capturedInquiry);
    const deliveredInquiry = capturedInquiry as ContactInquiryEmailInput;
    assert.equal(deliveredInquiry.inquiryLabel, CONTACT_INQUIRY_LABELS[inquiryType]);
    assert.equal(deliveredInquiry.email, validInquiry.email);
    assert.equal(deliveredInquiry.message, validInquiry.message);
  }
});

test("delivery failures are reported so the form can offer the backup email", async () => {
  const result = await submitContactInquiry(validInquiry, async () => false);

  assert.equal(result.delivered, false);
  assert.equal(result.recipient, getContactInquiryInbox());
});
