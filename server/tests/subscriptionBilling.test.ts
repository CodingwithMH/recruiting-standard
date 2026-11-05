import test from "node:test";
import assert from "node:assert/strict";

process.env.NODE_ENV = "test";
process.env.DATABASE_URL =
  "postgresql://postgres:postgres@localhost:5432/recruiting_standard_test?schema=public";
process.env.JWT_SECRET = "test-only-secret-value-not-used-in-production-min-32-chars";

import {
  MONTHLY_LATE_FEE_CENTS,
  MONTHLY_PRICE_CENTS,
  calculateSubscriptionBill,
  isMonthlyPaymentLate,
  nextBillingDate,
} from "../src/services/subscription.service.js";

const MONTHLY_LATE_FEE_TAX_CENTS = 156;
const MONTHLY_LATE_FEE_TOTAL_CENTS =
  MONTHLY_LATE_FEE_CENTS + MONTHLY_LATE_FEE_TAX_CENTS;

const NOW = new Date("2026-11-05T12:00:00.000Z");
const PAST = new Date("2026-10-01T12:00:00.000Z");
const FUTURE = new Date("2026-12-01T12:00:00.000Z");

test("monthly plan past its paid-through date is late and owes $25 plus 6.25% tax", () => {
  const bill = calculateSubscriptionBill(
    {
      plan: "MONTHLY_250",
      paymentStatus: "PAID",
      state: "ACTIVE",
      expirationDate: PAST,
    },
    NOW
  );

  assert.equal(bill.isLate, true);
  assert.equal(bill.lateFeeCents, MONTHLY_LATE_FEE_CENTS);
  assert.equal(bill.lateFeeTaxCents, MONTHLY_LATE_FEE_TAX_CENTS);
  assert.equal(bill.lateFeeTotalCents, MONTHLY_LATE_FEE_TOTAL_CENTS);
  assert.equal(
    bill.amountDueCents,
    MONTHLY_PRICE_CENTS + MONTHLY_LATE_FEE_TOTAL_CENTS
  );
  assert.equal(bill.effectivePaymentStatus, "OVERDUE");
});

test("monthly plan within its paid period has no late fee", () => {
  const bill = calculateSubscriptionBill(
    {
      plan: "MONTHLY_250",
      paymentStatus: "PAID",
      state: "ACTIVE",
      expirationDate: FUTURE,
    },
    NOW
  );

  assert.equal(bill.isLate, false);
  assert.equal(bill.lateFeeCents, 0);
  assert.equal(bill.amountDueCents, 0);
});

test("annual plans are never charged the monthly late fee", () => {
  const bill = calculateSubscriptionBill(
    {
      plan: "ANNUAL_1500",
      paymentStatus: "PAID",
      state: "ACTIVE",
      expirationDate: PAST,
    },
    NOW
  );

  assert.equal(bill.isLate, false);
  assert.equal(bill.lateFeeCents, 0);
  assert.equal(bill.amountDueCents, 150_000);
});

test("waived subscriptions have nothing due and no late fee", () => {
  const bill = calculateSubscriptionBill(
    {
      plan: "MONTHLY_250",
      paymentStatus: "WAIVED",
      state: "ACTIVE",
      expirationDate: PAST,
    },
    NOW
  );

  assert.equal(bill.isLate, false);
  assert.equal(bill.lateFeeCents, 0);
  assert.equal(bill.amountDueCents, 0);
});

test("waived and inactive subscriptions do not accrue late fees", () => {
  const waived = isMonthlyPaymentLate(
    {
      plan: "MONTHLY_250",
      paymentStatus: "WAIVED",
      state: "ACTIVE",
      expirationDate: PAST,
    },
    NOW
  );
  const pending = isMonthlyPaymentLate(
    {
      plan: "MONTHLY_250",
      paymentStatus: "PENDING",
      state: "PENDING",
      expirationDate: PAST,
    },
    NOW
  );

  assert.equal(waived, false);
  assert.equal(pending, false);
});

test("renewals extend from the current expiry when paid early", () => {
  const next = nextBillingDate(FUTURE, "MONTHLY_250", NOW);

  assert.equal(next.toISOString(), "2027-01-01T12:00:00.000Z");
});

test("late renewals start a new period from the payment date", () => {
  const next = nextBillingDate(PAST, "MONTHLY_250", NOW);

  assert.equal(next.toISOString(), "2026-12-05T12:00:00.000Z");
});

test("month-end renewals clamp to the last valid day of the next month", () => {
  const january31 = new Date(2027, 0, 31, 12);
  const january1 = new Date(2027, 0, 1, 12);
  const next = nextBillingDate(january31, "MONTHLY_250", january1);

  assert.equal(next.getFullYear(), 2027);
  assert.equal(next.getMonth(), 1);
  assert.equal(next.getDate(), 28);
});
