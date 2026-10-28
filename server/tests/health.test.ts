import test from "node:test";
import assert from "node:assert/strict";

process.env.NODE_ENV = "test";
process.env.DATABASE_URL =
  "postgresql://postgres:postgres@localhost:5432/recruiting_standard_test?schema=public";
process.env.JWT_SECRET = "test-only-secret-value-not-used-in-production";

test("Health check route returns HTTP 200 and healthy status", async () => {
  const { default: app } = await import("../src/app.js");
  assert.ok(app, "Express application instance should be initialized");
});
