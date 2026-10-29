import test from "node:test";
import assert from "node:assert/strict";

process.env.NODE_ENV = "test";
process.env.DATABASE_URL =
  "postgresql://postgres:postgres@localhost:5432/recruiting_standard_test?schema=public";
process.env.JWT_SECRET = "test-only-secret-value-not-used-in-production-min-32-chars";

import { schoolRegistrationSchema } from "../src/services/school.service.js";

test("schoolRegistrationSchema enforces all required institutional fields", () => {
  const validData = {
    schoolName: "Lincoln High School",
    athleticDirectorName: "Marcus Vance",
    contactEmail: "marcus.vance@lincolnathletics.org",
    contactPhone: "(555) 234-5678",
    address: "1234 Patriot Way",
    city: "Lincoln",
    state: "Nebraska",
    zipCode: "68508",
    password: "AthleticDirector2026!",
    plan: "ANNUAL_1500" as const,
  };

  const result = schoolRegistrationSchema.safeParse(validData);
  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.schoolName, "Lincoln High School");
    assert.equal(result.data.plan, "ANNUAL_1500");
  }
});

test("schoolRegistrationSchema rejects invalid emails and short passwords", () => {
  const invalidEmail = {
    schoolName: "West High School",
    athleticDirectorName: "John Doe",
    contactEmail: "not-an-email",
    contactPhone: "555-1234",
    address: "123 Main St",
    city: "Omaha",
    state: "NE",
    zipCode: "68102",
    password: "ValidPassword123!",
  };
  const res1 = schoolRegistrationSchema.safeParse(invalidEmail);
  assert.equal(res1.success, false);

  const shortPassword = {
    schoolName: "West High School",
    athleticDirectorName: "John Doe",
    contactEmail: "john@westhigh.edu",
    contactPhone: "555-1234",
    address: "123 Main St",
    city: "Omaha",
    state: "NE",
    zipCode: "68102",
    password: "short",
  };
  const res2 = schoolRegistrationSchema.safeParse(shortPassword);
  assert.equal(res2.success, false);
});

test("schoolRegistrationSchema supports both ANNUAL_1500 and MONTHLY_250 subscription tiers", () => {
  const base = {
    schoolName: "Oak Creek Prep",
    athleticDirectorName: "Coach Rivera",
    contactEmail: "rivera@oakcreek.edu",
    contactPhone: "555-888-9999",
    address: "456 Oak Lane",
    city: "Austin",
    state: "TX",
    zipCode: "78701",
    password: "OakCreekPassword2026!",
  };

  const annual = schoolRegistrationSchema.safeParse({ ...base, plan: "ANNUAL_1500" });
  assert.equal(annual.success, true);

  const monthly = schoolRegistrationSchema.safeParse({ ...base, plan: "MONTHLY_250" });
  assert.equal(monthly.success, true);

  const invalidPlan = schoolRegistrationSchema.safeParse({ ...base, plan: "FREE_TIER" });
  assert.equal(invalidPlan.success, false);
});
