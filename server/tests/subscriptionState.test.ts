import test from "node:test";
import assert from "node:assert/strict";

process.env.NODE_ENV = "test";
process.env.DATABASE_URL =
  "postgresql://postgres:postgres@localhost:5432/recruiting_standard_test?schema=public";
process.env.JWT_SECRET = "test-only-secret-value-not-used-in-production-min-32-chars";

import { prisma } from "../src/config/prisma.js";
import { setSubscriptionState } from "../src/services/subscription.service.js";

const FUTURE = new Date("2099-01-01T00:00:00.000Z");

function baseSubscription(overrides: Record<string, unknown> = {}) {
  return {
    id: "sub-1",
    schoolId: "school-a",
    plan: "MONTHLY_250",
    paymentStatus: "PAID",
    state: "ACTIVE",
    startDate: new Date("2026-01-01T00:00:00.000Z"),
    expirationDate: FUTURE,
    lastPaymentAt: null,
    lastPaymentAmountCents: null,
    notes: "Existing note",
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    school: {
      id: "school-a",
      schoolId: "SCH-10001",
      name: "School A",
      status: "APPROVED",
      contactEmail: "admin@school-a.edu",
    },
    ...overrides,
  };
}

async function withSubscriptionMock<T>(
  subscription: ReturnType<typeof baseSubscription>,
  fn: (updates: Record<string, unknown>[]) => Promise<T>
): Promise<T> {
  const originalFindUnique = prisma.subscription.findUnique;
  const originalUpdate = prisma.subscription.update;
  const updates: Record<string, unknown>[] = [];

  prisma.subscription.findUnique = (async () =>
    subscription) as typeof prisma.subscription.findUnique;
  prisma.subscription.update = (async (args: { data: Record<string, unknown> }) => {
    updates.push(args.data);
    return {
      ...subscription,
      ...args.data,
      updatedAt: new Date(),
    };
  }) as typeof prisma.subscription.update;

  try {
    return await fn(updates);
  } finally {
    prisma.subscription.findUnique = originalFindUnique;
    prisma.subscription.update = originalUpdate;
  }
}

test("admin suspension keeps the paid-through date but blocks access", async () => {
  await withSubscriptionMock(baseSubscription(), async (updates) => {
    const result = await setSubscriptionState("school-a", {
      state: "SUSPENDED",
      notes: "Payment dispute",
    });

    assert.equal(updates[0]?.state, "SUSPENDED");
    assert.equal(updates[0]?.expirationDate, FUTURE);
    assert.equal(result.subscription.state, "SUSPENDED");
    assert.equal(result.subscription.expirationDate, FUTURE);
    assert.equal(result.effectiveState, "SUSPENDED");
    assert.equal(result.accessAllowed, false);
    assert.match(String(updates[0]?.notes), /Existing note/);
    assert.match(String(updates[0]?.notes), /ACTIVE -> SUSPENDED/);
    assert.match(String(updates[0]?.notes), /Payment dispute/);
  });
});

test("admin expiration sets the paid-through date to now and blocks access", async () => {
  const before = Date.now();

  await withSubscriptionMock(baseSubscription(), async (updates) => {
    const result = await setSubscriptionState("school-a", {
      state: "EXPIRED",
    });

    const expirationDate = updates[0]?.expirationDate as Date;
    assert.equal(updates[0]?.state, "EXPIRED");
    assert.ok(expirationDate instanceof Date);
    assert.ok(expirationDate.getTime() >= before);
    assert.ok(expirationDate.getTime() <= Date.now());
    assert.equal(result.effectiveState, "EXPIRED");
    assert.equal(result.accessAllowed, false);
  });
});

test("admin activation without a date starts a new paid period and allows access", async () => {
  const before = Date.now();

  await withSubscriptionMock(
    baseSubscription({ state: "SUSPENDED", paymentStatus: "PENDING" }),
    async (updates) => {
      const result = await setSubscriptionState("school-a", {
        state: "ACTIVE",
      });

      const expirationDate = updates[0]?.expirationDate as Date;
      assert.equal(updates[0]?.state, "ACTIVE");
      assert.ok(expirationDate.getTime() > before);
      assert.equal(result.subscription.state, "ACTIVE");
      assert.equal(result.effectiveState, "ACTIVE");
      assert.equal(result.accessAllowed, true);
    }
  );
});

test("admin activation accepts an explicit expiration date", async () => {
  const explicitDate = new Date("2030-06-15T00:00:00.000Z");

  await withSubscriptionMock(baseSubscription({ state: "EXPIRED" }), async (updates) => {
    const result = await setSubscriptionState("school-a", {
      state: "ACTIVE",
      expirationDate: explicitDate,
    });

    assert.equal(updates[0]?.expirationDate, explicitDate);
    assert.equal(result.subscription.expirationDate, explicitDate);
    assert.equal(result.accessAllowed, true);
  });
});

test("admin state changes for a missing subscription return a 404 error", async () => {
  const originalFindUnique = prisma.subscription.findUnique;
  prisma.subscription.findUnique = (async () =>
    null) as typeof prisma.subscription.findUnique;

  try {
    await assert.rejects(
      setSubscriptionState("missing-school", { state: "ACTIVE" }),
      (error: Error & { statusCode?: number }) => {
        assert.equal(error.statusCode, 404);
        return true;
      }
    );
  } finally {
    prisma.subscription.findUnique = originalFindUnique;
  }
});
