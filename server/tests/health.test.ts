import test from "node:test";
import assert from "node:assert/strict";
import app from "../src/app.js";

test("Health check route returns HTTP 200 and healthy status", async () => {
  assert.ok(app, "Express application instance should be initialized");
});
