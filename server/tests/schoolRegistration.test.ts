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
    country: "United States",
    provinceRegion: "Nebraska",
    postalCode: "68508",
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
    country: "United States",
    provinceRegion: "Nebraska",
    postalCode: "68102",
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
    country: "United States",
    provinceRegion: "Nebraska",
    postalCode: "68102",
    password: "short",
  };
  const res2 = schoolRegistrationSchema.safeParse(shortPassword);
  assert.equal(res2.success, false);
});

test("schoolRegistrationSchema accepts international province and postal code formats", () => {
  const result = schoolRegistrationSchema.safeParse({
    schoolName: "Maple Leaf Preparatory Academy",
    athleticDirectorName: "Jordan Lee",
    contactEmail: "jordan.lee@mapleleaf.ca",
    contactPhone: "+1 416 555 0199",
    address: "100 Academy Way",
    city: "Toronto",
    country: "Canada",
    provinceRegion: "Ontario",
    postalCode: "M5V 2T6",
    password: "International2026!",
    plan: "ANNUAL_1500",
  });

  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.country, "Canada");
    assert.equal(result.data.provinceRegion, "Ontario");
    assert.equal(result.data.postalCode, "M5V 2T6");
  }
});

test("schoolRegistrationSchema defaults country and requires province/region and postal code", () => {
  const base = {
    schoolName: "North Shore Prep",
    athleticDirectorName: "Casey Morgan",
    contactEmail: "casey@northshore.edu",
    contactPhone: "555-333-2222",
    address: "12 Shore Road",
    city: "Vancouver",
    country: "Canada",
    provinceRegion: "British Columbia",
    postalCode: "V6B 1A1",
    password: "NorthShore2026!",
    plan: "ANNUAL_1500" as const,
  };

  assert.equal(schoolRegistrationSchema.safeParse(base).success, true);

  const { country: _country, ...withoutCountry } = base;
  assert.equal(schoolRegistrationSchema.safeParse(withoutCountry).success, true);

  const { provinceRegion: _provinceRegion, ...withoutProvince } = base;
  assert.equal(schoolRegistrationSchema.safeParse(withoutProvince).success, false);

  const { postalCode: _postalCode, ...withoutPostal } = base;
  assert.equal(schoolRegistrationSchema.safeParse(withoutPostal).success, false);
});

test("schoolRegistrationSchema supports both ANNUAL_1500 and MONTHLY_250 subscription tiers", () => {
  const base = {
    schoolName: "Oak Creek Prep",
    athleticDirectorName: "Coach Rivera",
    contactEmail: "rivera@oakcreek.edu",
    contactPhone: "555-888-9999",
    address: "456 Oak Lane",
    city: "Austin",
    country: "United States",
    provinceRegion: "Texas",
    postalCode: "78701",
    password: "OakCreekPassword2026!",
  };

  const annual = schoolRegistrationSchema.safeParse({ ...base, plan: "ANNUAL_1500" });
  assert.equal(annual.success, true);

  const monthly = schoolRegistrationSchema.safeParse({ ...base, plan: "MONTHLY_250" });
  assert.equal(monthly.success, true);

  const invalidPlan = schoolRegistrationSchema.safeParse({ ...base, plan: "FREE_TIER" });
  assert.equal(invalidPlan.success, false);
});
