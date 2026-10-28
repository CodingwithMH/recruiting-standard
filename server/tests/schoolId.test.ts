import test from "node:test";
import assert from "node:assert/strict";
import {
  formatSchoolId,
  generateCandidateSchoolId,
  isValidSchoolId,
  parseSchoolId,
} from "../src/utils/schoolId.js";

test("formatSchoolId produces the canonical permanent School ID format", () => {
  assert.equal(formatSchoolId(10492), "SCH-10492");
  assert.equal(formatSchoolId(10000), "SCH-10000");
  assert.equal(formatSchoolId(99999), "SCH-99999");
});

test("formatSchoolId rejects out-of-range and non-integer sequences", () => {
  assert.throws(() => formatSchoolId(9999), RangeError);
  assert.throws(() => formatSchoolId(100000), RangeError);
  assert.throws(() => formatSchoolId(10492.5), RangeError);
});

test("parseSchoolId round-trips valid School IDs", () => {
  assert.equal(parseSchoolId("SCH-10492"), 10492);
  assert.equal(parseSchoolId("SCH-00001"), null);
  assert.equal(parseSchoolId("10492"), null);
  assert.equal(parseSchoolId("SCH-ABCDE"), null);
});

test("isValidSchoolId enforces the SCH-##### pattern", () => {
  assert.equal(isValidSchoolId("SCH-10492"), true);
  assert.equal(isValidSchoolId("sch-10492"), false);
  assert.equal(isValidSchoolId("SCH-1049"), false);
  assert.equal(isValidSchoolId(""), false);
});

test("generateCandidateSchoolId stays within the permanent ID range", () => {
  assert.equal(generateCandidateSchoolId(() => 0), "SCH-10000");
  assert.equal(generateCandidateSchoolId(() => 1), "SCH-99999");
  assert.equal(isValidSchoolId(generateCandidateSchoolId()), true);
});
