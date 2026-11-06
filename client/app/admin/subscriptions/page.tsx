"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  CreditCard,
  PauseCircle,
  Play,
  RefreshCw,
  X,
  XCircle,
} from "lucide-react";
import { apiRequest } from "@/lib/api";

type SubscriptionPlan = "ANNUAL_1500" | "MONTHLY_250";
type PaymentStatus = "PAID" | "PENDING" | "OVERDUE" | "WAIVED";
type SubscriptionState =
  | "ACTIVE"
  | "SUSPENDED"
  | "CANCELLED"
  | "EXPIRED"
  | "PENDING";

interface SubscriptionRow {
  id: string;
  schoolId: string;
  schoolName: string;
  schoolCode: string | null;
  schoolStatus: string;
  contactEmail: string;
  plan: SubscriptionPlan;
  paymentStatus: PaymentStatus;
  effectivePaymentStatus: PaymentStatus;
  state: SubscriptionState;
  effectiveState: SubscriptionState;
  accessAllowed: boolean;
  startDate: string | null;
  expirationDate: string | null;
  lastPaymentAt: string | null;
  lastPaymentAmountCents: number | null;
  notes: string | null;
  isLate: boolean;
  basePriceCents: number;
  lateFeeCents: number;
  lateFeeTaxCents: number;
  lateFeeTotalCents: number;
  amountDueCents: number;
  updatedAt: string;
}

const PLAN_LABELS: Record<SubscriptionPlan, string> = {
  ANNUAL_1500: "Annual · $1,500/yr",
  MONTHLY_250: "Monthly · $250/mo",
};

const PAYMENT_STYLES: Record<PaymentStatus, string> = {
  PAID: "bg-emerald-50 text-emerald-800 border-emerald-200/80",
  PENDING: "bg-amber-50 text-amber-800 border-amber-200/80",
  OVERDUE: "bg-red-50 text-red-800 border-red-200/80",
  WAIVED: "bg-slate-100 text-slate-700 border-slate-200",
};

const STATE_STYLES: Record<SubscriptionState, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-800 border-emerald-200/80",
  PENDING: "bg-amber-50 text-amber-800 border-amber-200/80",
  SUSPENDED: "bg-red-50 text-red-800 border-red-200/80",
  CANCELLED: "bg-slate-100 text-slate-700 border-slate-200",
  EXPIRED: "bg-red-50 text-red-800 border-red-200/80",
};

function formatCents(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value: string | null): string {
  if (!value) return "Not set";
  return new Date(value).toLocaleDateString();
}

export default function AdminSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<SubscriptionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [selected, setSelected] = useState<SubscriptionRow | null>(null);
  const [notes, setNotes] = useState("");
  const [busySchoolId, setBusySchoolId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const res = await apiRequest<SubscriptionRow[]>("/subscriptions");

    if (res.success && res.data) {
      setSubscriptions(res.data);
    } else {
      setSubscriptions([]);
      setError(res.error || "Unable to load school subscriptions.");
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const summary = useMemo(() => {
    return subscriptions.reduce(
      (acc, item) => {
        acc.total += 1;
        if (item.plan === "MONTHLY_250") acc.monthly += 1;
        if (item.effectivePaymentStatus === "OVERDUE") {
          acc.overdue += 1;
          acc.lateFeesCents += item.lateFeeTotalCents;
        }
        return acc;
      },
      { total: 0, monthly: 0, overdue: 0, lateFeesCents: 0 }
    );
  }, [subscriptions]);

  const openPayment = (subscription: SubscriptionRow) => {
    setSelected(subscription);
    setNotes("");
    setError(null);
    setNotice(null);
  };

  const closePayment = () => {
    if (busySchoolId) return;
    setSelected(null);
    setNotes("");
  };

  const recordPayment = async () => {
    if (!selected) return;

    setBusySchoolId(selected.schoolId);
    setError(null);
    setNotice(null);

    const res = await apiRequest(
      `/subscriptions/${selected.schoolId}/payments`,
      {
        method: "POST",
        body: JSON.stringify({ notes: notes.trim() || undefined }),
      }
    );

    setBusySchoolId(null);

    if (res.success) {
      setNotice(res.message || "Payment recorded successfully.");
      setSelected(null);
      setNotes("");
      await load();
    } else {
      setError(res.error || "Unable to record this payment.");
    }
  };

  const changeState = async (
    subscription: SubscriptionRow,
    state: "ACTIVE" | "SUSPENDED" | "EXPIRED"
  ) => {
    if (
      state !== "ACTIVE" &&
      !window.confirm(
        `Set the subscription for ${subscription.schoolName} to ${state}? Recruiting access will be blocked immediately.`
      )
    ) {
      return;
    }

    setBusySchoolId(subscription.schoolId);
    setError(null);
    setNotice(null);

    const res = await apiRequest(
      `/subscriptions/${subscription.schoolId}/state`,
      {
        method: "PATCH",
        body: JSON.stringify({ state }),
      }
    );

    setBusySchoolId(null);

    if (res.success) {
      setNotice(res.message || "Subscription state updated.");
      await load();
    } else {
      setError(res.error || "Unable to update this subscription.");
    }
  };

  const selectedAmountCents = selected
    ? selected.basePriceCents + selected.lateFeeTotalCents
    : 0;

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-900 text-xs font-semibold uppercase tracking-wider mb-3">
            <CreditCard className="w-3.5 h-3.5 text-emerald-700" />
            <span>Subscription Administration</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#102341]">
            School Subscriptions
          </h1>
          <p className="text-xs sm:text-sm text-[#65748a] mt-1 leading-relaxed">
            Record manual payments for annual and monthly plans. Monthly accounts that
            pass their paid-through date automatically owe a{" "}
            <strong className="text-[#102341]">$25 late fee plus 6.25% tax</strong>.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-[#102341] text-[11px] font-bold disabled:opacity-60 cursor-pointer self-start"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs">
          <span className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider">
            Total subscriptions
          </span>
          <span className="text-2xl font-bold font-mono text-[#102341]">
            {summary.total}
          </span>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs">
          <span className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider">
            Monthly plans
          </span>
          <span className="text-2xl font-bold font-mono text-[#102341]">
            {summary.monthly}
          </span>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs">
          <span className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider">
            Overdue accounts
          </span>
          <span className="text-2xl font-bold font-mono text-red-700">
            {summary.overdue}
          </span>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs">
          <span className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider">
            Outstanding late fees
          </span>
          <span className="text-2xl font-bold font-mono text-[#102341]">
            {formatCents(summary.lateFeesCents)}
          </span>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-800 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      {notice && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800 flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{notice}</span>
        </div>
      )}

      <section className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200/80 text-[10px] uppercase tracking-wider text-slate-500">
                <th className="px-6 py-3 font-bold">School</th>
                <th className="px-4 py-3 font-bold">Plan</th>
                <th className="px-4 py-3 font-bold">Status</th>
                <th className="px-4 py-3 font-bold">Paid through</th>
                <th className="px-4 py-3 font-bold">Amount due</th>
                <th className="px-4 py-3 font-bold">Last payment</th>
                <th className="px-6 py-3 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-xs text-[#65748a]">
                    Loading school subscriptions...
                  </td>
                </tr>
              )}

              {!loading && subscriptions.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-xs text-[#65748a]">
                    No school subscriptions found.
                  </td>
                </tr>
              )}

              {!loading &&
                subscriptions.map((subscription) => (
                  <tr
                    key={subscription.id}
                    className="border-b border-slate-100 last:border-0"
                  >
                    <td className="px-6 py-4">
                      <span className="block font-bold text-[#102341]">
                        {subscription.schoolName}
                      </span>
                      <span className="block text-[11px] font-mono text-[#65748a]">
                        {subscription.schoolCode || "Pending ID"} ·{" "}
                        {subscription.contactEmail}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-xs font-semibold text-[#102341]">
                      {PLAN_LABELS[subscription.plan]}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider ${
                          subscription.effectivePaymentStatus === "OVERDUE"
                            ? PAYMENT_STYLES.OVERDUE
                            : STATE_STYLES[subscription.effectiveState] || "bg-slate-100 text-slate-700 border-slate-200"
                        }`}
                      >
                        {subscription.effectivePaymentStatus === "OVERDUE"
                          ? "OVERDUE"
                          : subscription.effectiveState}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-xs text-[#65748a]">
                      {formatDate(subscription.expirationDate)}
                    </td>
                    <td className="px-4 py-4">
                      {subscription.amountDueCents > 0 ? (
                        <div>
                          <span className="block text-xs font-bold text-[#102341]">
                            {formatCents(subscription.amountDueCents)}
                          </span>
                          {subscription.lateFeeTotalCents > 0 && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-700">
                              <Clock className="w-3 h-3" />
                              Includes {formatCents(subscription.lateFeeTotalCents)} late
                              fee ({formatCents(subscription.lateFeeCents)} +{" "}
                              {formatCents(subscription.lateFeeTaxCents)} tax)
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs font-semibold text-emerald-700">
                          Current
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-xs text-[#65748a]">
                      {subscription.lastPaymentAt ? (
                        <div>
                          <span className="block">
                            {formatDate(subscription.lastPaymentAt)}
                          </span>
                          {subscription.lastPaymentAmountCents !== null && (
                            <span className="block text-[10px] font-mono">
                              {formatCents(subscription.lastPaymentAmountCents)}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400">No payments yet</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        {subscription.effectiveState !== "ACTIVE" && (
                          <button
                            type="button"
                            onClick={() => void changeState(subscription, "ACTIVE")}
                            disabled={busySchoolId === subscription.schoolId}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold disabled:opacity-60 cursor-pointer shadow-xs"
                          >
                            <Play className="w-3.5 h-3.5" />
                            Activate
                          </button>
                        )}
                        {subscription.effectiveState === "ACTIVE" && (
                          <>
                            <button
                              type="button"
                              onClick={() => void changeState(subscription, "SUSPENDED")}
                              disabled={busySchoolId === subscription.schoolId}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-[11px] font-bold disabled:opacity-60 cursor-pointer"
                            >
                              <PauseCircle className="w-3.5 h-3.5" />
                              Suspend
                            </button>
                            <button
                              type="button"
                              onClick={() => void changeState(subscription, "EXPIRED")}
                              disabled={busySchoolId === subscription.schoolId}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-red-200 bg-red-50 hover:bg-red-100 text-red-800 text-[11px] font-bold disabled:opacity-60 cursor-pointer"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              Expire
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => openPayment(subscription)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold cursor-pointer shadow-xs"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          Record Payment
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>

      {selected && (
        <div className="fixed inset-0 z-50 bg-[#102341]/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-[#102341]">
                  Record Payment
                </h2>
                <p className="text-xs text-[#65748a]">
                  {selected.schoolName} · {PLAN_LABELS[selected.plan]}
                </p>
              </div>
              <button
                type="button"
                onClick={closePayment}
                disabled={busySchoolId !== null}
                className="p-1 rounded-full hover:bg-slate-100 text-slate-500 disabled:opacity-50 cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-xl bg-[#f4f7fc] border border-slate-200/80 p-4 space-y-2 text-xs">
              <div className="flex items-center justify-between text-[#65748a]">
                <span>Base price</span>
                <span className="font-semibold text-[#102341]">
                  {formatCents(selected.basePriceCents)}
                </span>
              </div>
              <div className="flex items-center justify-between text-[#65748a]">
                <span>Late fee</span>
                <span
                  className={
                    selected.lateFeeCents > 0
                      ? "font-bold text-red-700"
                      : "font-semibold text-[#102341]"
                  }
                >
                  {selected.lateFeeCents > 0
                    ? formatCents(selected.lateFeeCents)
                    : "$0"}
                </span>
              </div>
              <div className="flex items-center justify-between text-[#65748a]">
                <span>Tax (6.25%)</span>
                <span
                  className={
                    selected.lateFeeTaxCents > 0
                      ? "font-bold text-red-700"
                      : "font-semibold text-[#102341]"
                  }
                >
                  {selected.lateFeeTaxCents > 0
                    ? formatCents(selected.lateFeeTaxCents)
                    : "$0"}
                </span>
              </div>
              {selected.lateFeeTotalCents > 0 && (
                <p className="text-[10px] text-red-700 leading-relaxed">
                  This monthly plan passed its paid-through date on{" "}
                  {formatDate(selected.expirationDate)}. The{" "}
                  {formatCents(selected.lateFeeTotalCents)} late fee ($25 plus
                  6.25% tax) is included automatically.
                </p>
              )}
              <div className="flex items-center justify-between border-t border-slate-200 pt-2">
                <span className="font-bold text-[#102341]">Total to record</span>
                <span className="text-base font-bold font-mono text-[#102341]">
                  {formatCents(selectedAmountCents)}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="payment-notes"
                className="block text-[11px] font-bold uppercase tracking-wider text-slate-500"
              >
                Payment reference / notes
              </label>
              <textarea
                id="payment-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={3}
                maxLength={1000}
                placeholder="Check number, ACH reference, or internal note"
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-[#102341] outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={closePayment}
                disabled={busySchoolId !== null}
                className="px-4 py-2 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void recordPayment()}
                disabled={busySchoolId !== null}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold disabled:opacity-60 cursor-pointer shadow-xs"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {busySchoolId ? "Recording..." : "Confirm Payment"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
