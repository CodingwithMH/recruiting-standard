import test from "node:test";
import assert from "node:assert/strict";

process.env.NODE_ENV = "test";
process.env.DATABASE_URL =
  "postgresql://postgres:postgres@localhost:5432/recruiting_standard_test?schema=public";
process.env.JWT_SECRET = "test-only-secret-value-not-used-in-production-min-32-chars";

import { prisma } from "../src/config/prisma.js";
import {
  SubscriptionValidationError,
  listPlanOptions,
  listSubscriptions,
  manualSubscriptionUpdateSchema,
  renewSubscription,
  setSubscriptionState,
  updateSubscriptionRecord,
} from "../src/services/subscription.service.js";

const DAY = 24 * 60 * 60 * 1000;

function baseSubscription(overrides: Record<string, unknown> = {}) {
  return {
    id: "sub-1",
    schoolId: "school-a",
    plan: "MONTHLY_250",
    paymentStatus: "PAID",
    state: "ACTIVE",
    startDate: new Date(Date.now() - 20 * DAY),
    expirationDate: new Date(Date.now() + 10 * DAY),
    lastPaymentAt: null,
    lastPaymentAmountCents: null,
    notes: "Existing note",
    createdAt: new Date(Date.now() - 30 * DAY),
    updatedAt: new Date(Date.now() - DAY),
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
  fn: (calls: {
    findUnique: unknown[];
    findFirst: unknown[];
    update: Array<{ data: Record<string, unknown> }>;
  }) => Promise<T>
): Promise<T> {
  const originalFindUnique = prisma.subscription.findUnique;
  const originalFindFirst = prisma.subscription.findFirst;
  const originalUpdate = prisma.subscription.update;
  const calls: {
    findUnique: unknown[];
    findFirst: unknown[];
    update: Array<{ data: Record<string, unknown> }>;
  } = { findUnique: [], findFirst: [], update: [] };

  prisma.subscription.findUnique = (async (args: unknown) => {
    calls.findUnique.push(args);
    return subscription;
  }) as typeof prisma.subscription.findUnique;
  prisma.subscription.findFirst = (async (args: unknown) => {
    calls.findFirst.push(args);
    return subscription;
  }) as typeof prisma.subscription.findFirst;
  prisma.subscription.update = (async (args: { data: Record<string, unknown> }) => {
    calls.update.push(args);
    return { ...subscription, ...args.data, updatedAt: new Date() };
  }) as typeof prisma.subscription.update;

  try {
    return await fn(calls);
  } finally {
    prisma.subscription.findUnique = originalFindUnique;
    prisma.subscription.findFirst = originalFindFirst;
    prisma.subscription.update = originalUpdate;
  }
}

test("manual subscription schema requires at least one billing field", () => {
  assert.equal(manualSubscriptionUpdateSchema.safeParse({}).success, false);
  assert.equal(manualSubscriptionUpdateSchema.safeParse({ notes: "Note" }).success, true);

  const parsed = manualSubscriptionUpdateSchema.parse({
    plan: "ANNUAL_1500",
    paymentStatus: "OVERDUE",
    startDate: "2026-01-01",
    expirationDate: "2026-12-31",
    notes: "Invoice 88",
  });

  assert.equal(parsed.plan, "ANNUAL_1500");
  assert.equal(parsed.paymentStatus, "OVERDUE");
  assert.equal(parsed.startDate instanceof Date, true);
  assert.equal(parsed.expirationDate instanceof Date, true);
});

test("admin can record plan, payment status, dates, and an audit note", async () => {
  const startDate = new Date(Date.now() + DAY);
  const expirationDate = new Date(Date.now() + 365 * DAY);

  await withSubscriptionMock(baseSubscription(), async (calls) => {
    const result = await updateSubscriptionRecord("school-a", {
      plan: "ANNUAL_1500",
      paymentStatus: "PENDING",
      startDate,
      expirationDate,
      notes: "Invoice 88",
    });

    const data = calls.update[0]?.data;
    assert.equal(data?.plan, "ANNUAL_1500");
    assert.equal(data?.paymentStatus, "PENDING");
    assert.equal(data?.startDate, startDate);
    assert.equal(data?.expirationDate, expirationDate);
    assert.match(String(data?.notes), /MONTHLY_250 -> ANNUAL_1500/);
    assert.match(String(data?.notes), /Invoice 88/);
    assert.equal(result.planPriceCents, 150_000);
    assert.equal(result.accessAllowed, true);
  });
});

test("subscription record rejects an expiration before the start date", async () => {
  await withSubscriptionMock(baseSubscription(), async (calls) => {
    await assert.rejects(
      updateSubscriptionRecord("school-a", {
        startDate: new Date(Date.now() + 10 * DAY),
        expirationDate: new Date(Date.now() + DAY),
      }),
      (error: SubscriptionValidationError) => {
        assert.equal(error.statusCode, 400);
        assert.match(error.message, /Expiration date must be after/);
        return true;
      }
    );

    assert.equal(calls.update.length, 0);
  });
});

test("admin can find a subscription by the permanent School ID", async () => {
  await withSubscriptionMock(baseSubscription(), async (calls) => {
    await updateSubscriptionRecord("SCH-10001", { paymentStatus: "WAIVED" });

    assert.equal(calls.findFirst.length, 1);
    assert.deepEqual(calls.findFirst[0], {
      where: { school: { schoolId: "SCH-10001" } },
      include: {
        school: {
          select: {
            id: true,
            schoolId: true,
            name: true,
            status: true,
            contactEmail: true,
          },
        },
      },
    });
    assert.equal(calls.findUnique.length, 0);
    assert.equal(calls.update[0]?.data.paymentStatus, "WAIVED");
  });
});

test("renewal reactivates the subscription and extends one billing period", async () => {
  const originalExpiration = new Date(Date.now() + 10 * DAY);

  await withSubscriptionMock(
    baseSubscription({ expirationDate: originalExpiration }),
    async (calls) => {
      const result = await renewSubscription("school-a", {
        paymentStatus: "PAID",
        notes: "Check 1042",
      });

      const data = calls.update[0]?.data;
      assert.equal(data?.state, "ACTIVE");
      assert.equal(data?.paymentStatus, "PAID");
      assert.ok((data?.expirationDate as Date).getTime() > originalExpiration.getTime());
      assert.equal(data?.lastPaymentAmountCents, 25_000);
      assert.match(String(data?.notes), /Subscription renewed through/);
      assert.match(String(data?.notes), /Check 1042/);
      assert.equal(result.accessAllowed, true);
    }
  );
});

test("admin cancellation preserves the paid-through date and blocks access", async () => {
  const expirationDate = new Date(Date.now() + 30 * DAY);

  await withSubscriptionMock(baseSubscription({ expirationDate }), async (calls) => {
    const result = await setSubscriptionState("school-a", { state: "CANCELLED" });

    assert.equal(calls.update[0]?.data.state, "CANCELLED");
    assert.equal(calls.update[0]?.data.expirationDate, expirationDate);
    assert.equal(result.subscription.state, "CANCELLED");
    assert.equal(result.accessAllowed, false);
  });
});

test("renewal and overdue views classify accounts and expose the permanent School ID", async () => {
  const originalFindMany = prisma.subscription.findMany;
  const updatedAt = new Date(Date.now() - DAY);
  prisma.subscription.findMany = (async () => [
    {
      id: "sub-upcoming",
      schoolId: "school-upcoming",
      plan: "ANNUAL_1500",
      paymentStatus: "PAID",
      state: "ACTIVE",
      startDate: new Date(Date.now() - 355 * DAY),
      expirationDate: new Date(Date.now() + 10 * DAY),
      lastPaymentAt: new Date(Date.now() - 355 * DAY),
      lastPaymentAmountCents: 150_000,
      notes: null,
      updatedAt,
      school: {
        id: "school-upcoming",
        schoolId: "SCH-10002",
        name: "Upcoming School",
        status: "APPROVED",
        contactEmail: "admin@upcoming.edu",
      },
    },
    {
      id: "sub-overdue",
      schoolId: "school-overdue",
      plan: "MONTHLY_250",
      paymentStatus: "PAID",
      state: "ACTIVE",
      startDate: new Date(Date.now() - 40 * DAY),
      expirationDate: new Date(Date.now() - 5 * DAY),
      lastPaymentAt: new Date(Date.now() - 40 * DAY),
      lastPaymentAmountCents: 25_000,
      notes: null,
      updatedAt,
      school: {
        id: "school-overdue",
        schoolId: "SCH-10003",
        name: "Overdue School",
        status: "APPROVED",
        contactEmail: "admin@overdue.edu",
      },
    },
    {
      id: "sub-current",
      schoolId: "school-current",
      plan: "ANNUAL_1500",
      paymentStatus: "PAID",
      state: "ACTIVE",
      startDate: new Date(Date.now() - DAY),
      expirationDate: new Date(Date.now() + 300 * DAY),
      lastPaymentAt: new Date(Date.now() - DAY),
      lastPaymentAmountCents: 150_000,
      notes: null,
      updatedAt,
      school: {
        id: "school-current",
        schoolId: "SCH-10004",
        name: "Current School",
        status: "APPROVED",
        contactEmail: "admin@current.edu",
      },
    },
  ]) as typeof prisma.subscription.findMany;

  try {
    const upcoming = await listSubscriptions({
      view: "UPCOMING_RENEWALS",
      renewalDays: 30,
    });
    assert.deepEqual(
      upcoming.map((item) => item.schoolCode),
      ["SCH-10002"]
    );
    assert.equal(upcoming[0]?.isUpcomingRenewal, true);
    assert.equal(upcoming[0]?.isOverdue, false);
    assert.equal(upcoming[0]?.planPriceCents, 150_000);

    const overdue = await listSubscriptions({ view: "OVERDUE" });
    assert.deepEqual(
      overdue.map((item) => item.schoolCode),
      ["SCH-10003"]
    );
    assert.equal(overdue[0]?.isOverdue, true);
    assert.equal(overdue[0]?.effectivePaymentStatus, "OVERDUE");
    assert.equal(overdue[0]?.lateFeeTotalCents, 2_656);

    const byPermanentId = await listSubscriptions({ schoolId: "SCH-10002" });
    assert.equal(byPermanentId.length, 1);
    assert.equal(byPermanentId[0]?.schoolId, "school-upcoming");
  } finally {
    prisma.subscription.findMany = originalFindMany;
  }
});

test("plan catalog exposes only the manual per-school price options", () => {
  const options = listPlanOptions();

  assert.deepEqual(
    options.map((option) => [
      option.plan,
      option.amountCents,
      option.label,
      option.automatedProcessing,
    ]),
    [
      ["ANNUAL_1500", 150_000, "$1,500 / year", false],
      ["MONTHLY_250", 25_000, "$250 / month", false],
    ]
  );
});

test("manual record updates write provider-neutral billing fields", async () => {
  await withSubscriptionMock(baseSubscription(), async (calls) => {
    await updateSubscriptionRecord("school-a", {
      plan: "ANNUAL_1500",
      paymentStatus: "PAID",
    });

    const data = calls.update[0]?.data;
    assert.equal(data?.priceOptionCode, "SCHOOL_ANNUAL");
    assert.equal(data?.billingProvider, "MANUAL");
    assert.equal(data?.billingInterval, "ANNUAL");
    assert.equal(data?.amountCents, 150_000);
    assert.equal(data?.currency, "USD");
    assert.equal(data?.billingStatus, "ACTIVE");
    assert.equal(data?.autoCollectEnabled, false);
  });
});

test("manual state changes append provider-neutral billing events when enabled", async () => {
  const originalFlag = process.env.BILLING_EVENTS_IN_TESTS;
  const originalCreate = prisma.subscriptionBillingEvent.create;
  const events: Array<Record<string, unknown>> = [];

  process.env.BILLING_EVENTS_IN_TESTS = "true";
  prisma.subscriptionBillingEvent.create = (async (args: {
    data: Record<string, unknown>;
  }) => {
    events.push(args.data);
    return args.data;
  }) as typeof prisma.subscriptionBillingEvent.create;

  try {
    await withSubscriptionMock(baseSubscription(), async () => {
      await setSubscriptionState("school-a", { state: "SUSPENDED" });
    });

    assert.equal(events.length, 1);
    assert.equal(events[0]?.type, "SUSPENDED");
    assert.equal(events[0]?.provider, "MANUAL");
    assert.equal(events[0]?.statusFrom, "ACTIVE");
    assert.equal(events[0]?.statusTo, "PAUSED");
    assert.equal(events[0]?.schoolId, "school-a");
  } finally {
    prisma.subscriptionBillingEvent.create = originalCreate;
    if (originalFlag === undefined) {
      delete process.env.BILLING_EVENTS_IN_TESTS;
    } else {
      process.env.BILLING_EVENTS_IN_TESTS = originalFlag;
    }
  }
});
