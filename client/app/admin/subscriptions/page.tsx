"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";
import {
  AlertCircle,
  Ban,
  CalendarClock,
  CheckCircle2,
  Clock,
  CreditCard,
  MoreHorizontal,
  Pause,
  Pencil,
  Play,
  RefreshCw,
  RotateCw,
  ShieldCheck,
  X,
  type LucideIcon,
} from "lucide-react";
import { apiRequest } from "@/lib/api";
import SiteLink from "@/components/ui/SiteLink";

type SubscriptionPlan = "ANNUAL_1500" | "MONTHLY_250";
type PaymentStatus = "PAID" | "PENDING" | "OVERDUE" | "WAIVED";
type SubscriptionState =
  | "ACTIVE"
  | "SUSPENDED"
  | "CANCELLED"
  | "EXPIRED"
  | "PENDING";
type ListView = "ALL" | "UPCOMING_RENEWALS" | "OVERDUE";
type ModalMode = "PAYMENT" | "RECORD" | "RENEW";

interface SubscriptionRow {
  id: string;
  schoolId: string;
  schoolName: string;
  schoolCode: string | null;
  schoolStatus: string;
  contactEmail: string;
  plan: SubscriptionPlan;
  planPriceCents: number;
  paymentStatus: PaymentStatus;
  effectivePaymentStatus: PaymentStatus;
  state: SubscriptionState;
  effectiveState: SubscriptionState;
  accessAllowed: boolean;
  startDate: string | null;
  expirationDate: string | null;
  daysUntilExpiration: number | null;
  nextRenewalDate: string;
  isOverdue: boolean;
  isUpcomingRenewal: boolean;
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

interface FormState {
  notes: string;
  plan: SubscriptionPlan;
  paymentStatus: PaymentStatus;
  startDate: string;
  expirationDate: string;
  amount: string;
}

interface ModalState {
  mode: ModalMode;
  subscription: SubscriptionRow;
}

interface ActionsMenuState {
  schoolId: string;
  top: number;
  left: number;
}

interface PlanOption {
  code: string;
  plan: SubscriptionPlan;
  name: string;
  amountCents: number;
  currency: string;
  billingInterval: "ANNUAL" | "MONTHLY";
  intervalCount: number;
  label: string;
  automatedProcessing: boolean;
}

const FALLBACK_PLAN_OPTIONS: PlanOption[] = [
  {
    code: "SCHOOL_ANNUAL",
    plan: "ANNUAL_1500",
    name: "Annual School Subscription",
    amountCents: 150_000,
    currency: "USD",
    billingInterval: "ANNUAL",
    intervalCount: 12,
    label: "$1,500 / year",
    automatedProcessing: false,
  },
  {
    code: "SCHOOL_MONTHLY",
    plan: "MONTHLY_250",
    name: "Monthly School Subscription",
    amountCents: 25_000,
    currency: "USD",
    billingInterval: "MONTHLY",
    intervalCount: 1,
    label: "$250 / month",
    automatedProcessing: false,
  },
];

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

const VIEW_LABELS: Record<ListView, string> = {
  ALL: "All subscriptions",
  UPCOMING_RENEWALS: "Upcoming renewals",
  OVERDUE: "Overdue accounts",
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

function toDateInput(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function proposedRenewalDate(subscription: SubscriptionRow): string {
  const now = new Date();
  const expiration = subscription.expirationDate
    ? new Date(subscription.expirationDate)
    : null;
  const base =
    expiration && expiration.getTime() > now.getTime() ? expiration : now;
  const day = base.getUTCDate();
  const next = new Date(
    Date.UTC(
      base.getUTCFullYear(),
      base.getUTCMonth() + (subscription.plan === "MONTHLY_250" ? 1 : 12),
      1
    )
  );
  const lastDay = new Date(
    Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0)
  ).getUTCDate();
  next.setUTCDate(Math.min(day, lastDay));
  return next.toISOString().slice(0, 10);
}

function daysLabel(subscription: SubscriptionRow): string {
  if (subscription.daysUntilExpiration === null) return "No paid-through date";
  if (subscription.daysUntilExpiration < 0) {
    return `${Math.abs(subscription.daysUntilExpiration)} days overdue`;
  }
  if (subscription.daysUntilExpiration === 0) return "Due today";
  return `${subscription.daysUntilExpiration} days left`;
}

function parseAmount(value: string): number | null | undefined {
  if (!value.trim()) return undefined;
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return Math.round(amount * 100);
}

function statusStyle(subscription: SubscriptionRow): string {
  return subscription.effectivePaymentStatus === "OVERDUE"
    ? PAYMENT_STYLES.OVERDUE
    : STATE_STYLES[subscription.effectiveState] ||
        "bg-slate-100 text-slate-700 border-slate-200";
}

function statusLabel(subscription: SubscriptionRow): string {
  return subscription.effectivePaymentStatus === "OVERDUE"
    ? "OVERDUE"
    : subscription.effectiveState;
}

function ActionMenuItem({
  icon: Icon,
  label,
  onClick,
  disabled,
  danger,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[11px] font-semibold transition-colors disabled:opacity-50 cursor-pointer ${
        danger
          ? "text-red-700 hover:bg-red-50"
          : "text-[#102341] hover:bg-slate-50"
      }`}
    >
      <Icon
        className={`w-3.5 h-3.5 shrink-0 ${
          danger ? "text-red-600" : "text-slate-500"
        }`}
      />
      {label}
    </button>
  );
}

function initialForm(subscription: SubscriptionRow, mode: ModalMode): FormState {
  return {
    notes: "",
    plan: subscription.plan,
    paymentStatus:
      mode === "RENEW" ? "PAID" : subscription.paymentStatus,
    startDate: toDateInput(subscription.startDate),
    expirationDate:
      mode === "RENEW"
        ? proposedRenewalDate(subscription)
        : toDateInput(subscription.expirationDate),
    amount:
      mode === "PAYMENT"
        ? ((subscription.basePriceCents + subscription.lateFeeTotalCents) / 100).toFixed(2)
        : "",
  };
}

export default function AdminSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<SubscriptionRow[]>([]);
  const [planOptions, setPlanOptions] = useState<PlanOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [view, setView] = useState<ListView>("ALL");
  const [planFilter, setPlanFilter] = useState<SubscriptionPlan | "ALL">("ALL");
  const [modal, setModal] = useState<ModalState | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [busySchoolId, setBusySchoolId] = useState<string | null>(null);
  const [actionsMenu, setActionsMenu] = useState<ActionsMenuState | null>(null);

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

  useEffect(() => {
    const loadPlans = async () => {
      const res = await apiRequest<PlanOption[]>("/subscriptions/plans");
      if (res.success && res.data) setPlanOptions(res.data);
    };

    void loadPlans();
  }, []);

  useEffect(() => {
    if (!actionsMenu) return;

    const close = () => setActionsMenu(null);
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (
        target.closest("[data-actions-menu]") ||
        target.closest("[data-actions-trigger]")
      ) {
        return;
      }
      close();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [actionsMenu]);

  const summary = useMemo(() => {
    return subscriptions.reduce(
      (acc, item) => {
        acc.total += 1;
        if (item.effectiveState === "ACTIVE") acc.active += 1;
        if (item.isUpcomingRenewal) {
          acc.upcoming += 1;
          acc.upcomingAmountCents += item.amountDueCents;
        }
        if (item.isOverdue) {
          acc.overdue += 1;
          acc.overdueAmountCents += item.amountDueCents;
          acc.lateFeesCents += item.lateFeeTotalCents;
        }
        return acc;
      },
      {
        total: 0,
        active: 0,
        upcoming: 0,
        overdue: 0,
        upcomingAmountCents: 0,
        overdueAmountCents: 0,
        lateFeesCents: 0,
      }
    );
  }, [subscriptions]);

  const upcomingRenewals = useMemo(
    () =>
      subscriptions
        .filter((item) => item.isUpcomingRenewal)
        .sort(
          (a, b) =>
            new Date(a.expirationDate as string).getTime() -
            new Date(b.expirationDate as string).getTime()
        )
        .slice(0, 5),
    [subscriptions]
  );

  const overdueAccounts = useMemo(
    () =>
      subscriptions
        .filter((item) => item.isOverdue)
        .sort(
          (a, b) =>
            new Date(a.expirationDate as string).getTime() -
            new Date(b.expirationDate as string).getTime()
        )
        .slice(0, 5),
    [subscriptions]
  );

  const visibleSubscriptions = useMemo(
    () =>
      subscriptions.filter((item) => {
        if (view === "UPCOMING_RENEWALS" && !item.isUpcomingRenewal) {
          return false;
        }
        if (view === "OVERDUE" && !item.isOverdue) return false;
        if (planFilter !== "ALL" && item.plan !== planFilter) return false;
        return true;
      }),
    [subscriptions, view, planFilter]
  );

  const openModal = (mode: ModalMode, subscription: SubscriptionRow) => {
    setActionsMenu(null);
    setModal({ mode, subscription });
    setForm(initialForm(subscription, mode));
    setError(null);
    setNotice(null);
  };

  const closeModal = () => {
    if (busySchoolId) return;
    setModal(null);
    setForm(null);
  };

  const toggleActionsMenu = (
    event: ReactMouseEvent<HTMLButtonElement>,
    subscription: SubscriptionRow
  ) => {
    if (actionsMenu?.schoolId === subscription.schoolId) {
      setActionsMenu(null);
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const menuWidth = 208;
    const menuHeight = 300;

    setActionsMenu({
      schoolId: subscription.schoolId,
      top: Math.max(12, Math.min(rect.bottom + 6, window.innerHeight - menuHeight)),
      left: Math.max(
        12,
        Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 12)
      ),
    });
  };

  const runMutation = async (
    subscription: SubscriptionRow,
    endpoint: string,
    method: "POST" | "PATCH",
    body: Record<string, unknown>,
    successMessage: string
  ) => {
    setBusySchoolId(subscription.schoolId);
    setError(null);
    setNotice(null);

    const res = await apiRequest(`/subscriptions/${subscription.schoolId}${endpoint}`, {
      method,
      body: JSON.stringify(body),
    });

    setBusySchoolId(null);

    if (!res.success) {
      setError(res.error || "Unable to update this subscription.");
      return;
    }

    setNotice(res.message || successMessage);
    setModal(null);
    setForm(null);
    await load();
  };

  const submitModal = async () => {
    if (!modal || !form) return;

    const amountCents = parseAmount(form.amount);
    if (amountCents === null) {
      setError("Enter a valid positive amount or leave it blank.");
      return;
    }

    if (
      modal.mode === "RECORD" &&
      !form.expirationDate &&
      (modal.subscription.state === "ACTIVE" ||
        modal.subscription.effectiveState === "ACTIVE")
    ) {
      setError("An active subscription requires an expiration date.");
      return;
    }

    if (modal.mode === "PAYMENT") {
      await runMutation(
        modal.subscription,
        "/payments",
        "POST",
        {
          ...(amountCents !== undefined ? { amountCents } : {}),
          notes: form.notes.trim() || undefined,
        },
        "Payment recorded successfully."
      );
      return;
    }

    if (modal.mode === "RENEW") {
      await runMutation(
        modal.subscription,
        "/renew",
        "POST",
        {
          expirationDate: form.expirationDate || undefined,
          paymentStatus: form.paymentStatus,
          ...(amountCents !== undefined ? { amountCents } : {}),
          notes: form.notes.trim() || undefined,
        },
        "Subscription renewed successfully."
      );
      return;
    }

    await runMutation(
      modal.subscription,
      "",
      "PATCH",
      {
        plan: form.plan,
        paymentStatus: form.paymentStatus,
        startDate: form.startDate || null,
        expirationDate: form.expirationDate || null,
        notes: form.notes.trim() || undefined,
      },
      "Subscription record updated successfully."
    );
  };

  const changeState = async (
    subscription: SubscriptionRow,
    state: "ACTIVE" | "SUSPENDED" | "CANCELLED" | "EXPIRED"
  ) => {
    setActionsMenu(null);

    const confirmations: Record<typeof state, string> = {
      ACTIVE: `Activate the subscription for ${subscription.schoolName}?`,
      SUSPENDED: `Suspend the subscription for ${subscription.schoolName}? Recruiting access will be blocked immediately.`,
      CANCELLED: `Cancel the subscription for ${subscription.schoolName}? This is a permanent cancellation and cannot be undone from this action.`,
      EXPIRED: `Mark the subscription for ${subscription.schoolName} as expired? Recruiting access will be blocked immediately.`,
    };

    if (!window.confirm(confirmations[state])) return;

    await runMutation(
      subscription,
      "/state",
      "PATCH",
      { state },
      `Subscription ${state.toLowerCase()} successfully.`
    );
  };

  const primaryAction = (subscription: SubscriptionRow) => {
    const disabled = busySchoolId === subscription.schoolId;

    if (subscription.amountDueCents > 0) {
      return {
        label: "Record payment",
        icon: CreditCard,
        onClick: () => openModal("PAYMENT", subscription),
        className:
          "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600",
        disabled,
      };
    }

    if (subscription.effectiveState !== "ACTIVE") {
      return {
        label: "Activate",
        icon: Play,
        onClick: () => void changeState(subscription, "ACTIVE"),
        className:
          "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600",
        disabled,
      };
    }

    return {
      label: "Renew",
      icon: RotateCw,
      onClick: () => openModal("RENEW", subscription),
      className: "bg-blue-600 hover:bg-blue-700 text-white border-blue-600",
      disabled,
    };
  };

  const selectedAmountCents = modal
    ? modal.mode === "RENEW"
      ? parseAmount(form?.amount ?? "") ??
        modal.subscription.basePriceCents + modal.subscription.lateFeeTotalCents
      : modal.subscription.basePriceCents + modal.subscription.lateFeeTotalCents
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
          <p className="text-xs sm:text-sm text-[#65748a] mt-1 leading-relaxed max-w-3xl">
            Activate, renew, suspend, or cancel each subscription manually. Payments
            are collected outside the platform; record the plan, payment status,
            start date, and expiration date for every school ID here.
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
            Active subscriptions
          </span>
          <span className="text-2xl font-bold font-mono text-emerald-700">
            {summary.active}
          </span>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs">
          <span className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider">
            Upcoming renewals · 30 days
          </span>
          <span className="text-2xl font-bold font-mono text-[#102341]">
            {summary.upcoming}
          </span>
          <span className="block text-[10px] font-semibold text-[#65748a] mt-1">
            {formatCents(summary.upcomingAmountCents)} renewal value
          </span>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs">
          <span className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider">
            Overdue accounts
          </span>
          <span className="text-2xl font-bold font-mono text-red-700">
            {summary.overdue}
          </span>
          <span className="block text-[10px] font-semibold text-[#65748a] mt-1">
            {formatCents(summary.overdueAmountCents)} due ·{" "}
            {formatCents(summary.lateFeesCents)} late fees
          </span>
        </div>
      </div>

      <section className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-sm font-bold text-[#102341]">Manual plan options</h2>
            <p className="text-[11px] text-[#65748a] mt-1">
              Prices are per school. Payments are collected outside the platform and recorded here.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-600 self-start">
            <ShieldCheck className="w-3.5 h-3.5" />
            No automated processing
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {(planOptions.length > 0 ? planOptions : FALLBACK_PLAN_OPTIONS).map((option) => (
            <div
              key={option.code}
              className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 flex items-center justify-between gap-4"
            >
              <div>
                <p className="text-xs font-bold text-[#102341]">{option.name}</p>
                <p className="text-[11px] text-[#65748a] mt-0.5">
                  {option.billingInterval === "ANNUAL" ? "Annual term" : "Monthly term"} · manual payment
                </p>
              </div>
              <span className="font-mono text-lg font-bold text-emerald-700 whitespace-nowrap">
                {option.label}
              </span>
            </div>
          ))}
        </div>
      </section>

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-bold text-[#102341]">Upcoming renewals</h2>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Next 30 days
            </span>
          </div>
          {upcomingRenewals.length === 0 ? (
            <p className="px-5 py-6 text-xs text-[#65748a]">
              No active subscriptions renew in the next 30 days.
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {upcomingRenewals.map((subscription) => (
                <div
                  key={subscription.id}
                  className="px-5 py-3 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#102341] truncate">
                      {subscription.schoolName}
                    </p>
                    <p className="text-[10px] font-mono text-blue-700">
                      {subscription.schoolCode || "Pending ID"}
                    </p>
                    <p className="text-[10px] text-[#65748a]">
                      {formatDate(subscription.expirationDate)} · {daysLabel(subscription)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className="text-xs font-bold text-[#102341]">
                      {formatCents(subscription.amountDueCents)}
                    </span>
                    <button
                      type="button"
                      onClick={() => openModal("RENEW", subscription)}
                      className="px-2.5 py-1 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold cursor-pointer"
                    >
                      Renew
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-red-600" />
              <h2 className="text-sm font-bold text-[#102341]">Overdue accounts</h2>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              {formatCents(summary.overdueAmountCents)} outstanding
            </span>
          </div>
          {overdueAccounts.length === 0 ? (
            <p className="px-5 py-6 text-xs text-[#65748a]">
              No overdue school subscriptions.
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {overdueAccounts.map((subscription) => (
                <div
                  key={subscription.id}
                  className="px-5 py-3 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#102341] truncate">
                      {subscription.schoolName}
                    </p>
                    <p className="text-[10px] font-mono text-blue-700">
                      {subscription.schoolCode || "Pending ID"}
                    </p>
                    <p className="text-[10px] text-red-700">
                      {formatDate(subscription.expirationDate)} · {daysLabel(subscription)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className="text-xs font-bold text-red-700">
                      {formatCents(subscription.amountDueCents)}
                    </span>
                    <button
                      type="button"
                      onClick={() => openModal("PAYMENT", subscription)}
                      className="px-2.5 py-1 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold cursor-pointer"
                    >
                      Record payment
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-[#102341]">All school subscriptions</h2>
            <p className="text-[11px] text-[#65748a] mt-0.5">
              {VIEW_LABELS[view]} · {visibleSubscriptions.length} shown
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {(["ALL", "UPCOMING_RENEWALS", "OVERDUE"] as ListView[]).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setView(item)}
                className={`px-3 py-1.5 rounded-full border text-[10px] font-bold cursor-pointer ${
                  view === item
                    ? "bg-[#102341] border-[#102341] text-white"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {VIEW_LABELS[item]}
              </button>
            ))}
            <select
              value={planFilter}
              onChange={(event) =>
                setPlanFilter(event.target.value as SubscriptionPlan | "ALL")
              }
              aria-label="Filter by plan"
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-bold text-[#102341] outline-none focus:border-blue-400"
            >
              <option value="ALL">All plans</option>
              <option value="ANNUAL_1500">Annual</option>
              <option value="MONTHLY_250">Monthly</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200/80 text-[10px] uppercase tracking-wider text-slate-500">
                <th className="px-6 py-3 font-bold">School ID / School</th>
                <th className="px-4 py-3 font-bold">Plan</th>
                <th className="px-4 py-3 font-bold">Status</th>
                <th className="px-4 py-3 font-bold">Dates</th>
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

              {!loading && visibleSubscriptions.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-xs text-[#65748a]">
                    No school subscriptions match this view.
                  </td>
                </tr>
              )}

              {!loading &&
                visibleSubscriptions.map((subscription) => (
                  <tr
                    key={subscription.id}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <SiteLink
                        href={`/admin/schools/${subscription.schoolId}`}
                        className="block font-bold text-[#102341] hover:text-blue-700 hover:underline"
                      >
                        {subscription.schoolName}
                      </SiteLink>
                      <span className="block text-[11px] font-mono font-bold text-blue-700">
                        {subscription.schoolCode || "Pending ID"}
                      </span>
                      <span className="block text-[10px] text-[#65748a]">
                        {subscription.contactEmail}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="block text-xs font-semibold text-[#102341]">
                        {PLAN_LABELS[subscription.plan]}
                      </span>
                      <span className="block text-[10px] text-[#65748a]">
                        {formatCents(subscription.planPriceCents)}
                      </span>
                    </td>
                    <td className="px-4 py-4 space-y-1">
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider ${statusStyle(
                          subscription
                        )}`}
                      >
                        {statusLabel(subscription)}
                      </span>
                      <span
                        className={`block text-[10px] font-semibold border w-fit px-2 py-0.5 rounded-full ${
                          PAYMENT_STYLES[subscription.effectivePaymentStatus]
                        }`}
                      >
                        {subscription.effectivePaymentStatus}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-xs text-[#65748a]">
                      <span className="block">
                        <strong className="font-semibold text-[#102341]">Start:</strong>{" "}
                        {formatDate(subscription.startDate)}
                      </span>
                      <span className="block">
                        <strong className="font-semibold text-[#102341]">Through:</strong>{" "}
                        {formatDate(subscription.expirationDate)}
                      </span>
                      <span
                        className={`block text-[10px] font-bold ${
                          subscription.isOverdue ? "text-red-700" : "text-blue-700"
                        }`}
                      >
                        {daysLabel(subscription)}
                      </span>
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
                      <div className="flex items-center justify-end gap-2">
                        {(() => {
                          const action = primaryAction(subscription);
                          const ActionIcon = action.icon;

                          return (
                            <button
                              type="button"
                              onClick={action.onClick}
                              disabled={action.disabled}
                              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-[11px] font-bold shadow-xs transition-colors disabled:opacity-60 cursor-pointer ${action.className}`}
                            >
                              <ActionIcon className="w-3.5 h-3.5" />
                              {action.label}
                            </button>
                          );
                        })()}
                        <button
                          type="button"
                          data-actions-trigger
                          onClick={(event) => toggleActionsMenu(event, subscription)}
                          disabled={busySchoolId === subscription.schoolId}
                          aria-haspopup="menu"
                          aria-expanded={actionsMenu?.schoolId === subscription.schoolId}
                          aria-label={`More actions for ${subscription.schoolName}`}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-xs transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-[#102341] focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:opacity-60 cursor-pointer"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>

      {actionsMenu &&
        (() => {
          const subscription = visibleSubscriptions.find(
            (item) => item.schoolId === actionsMenu.schoolId
          );
          if (!subscription) return null;

          const disabled = busySchoolId === subscription.schoolId;

          return (
            <div
              data-actions-menu
              role="menu"
              style={{ top: actionsMenu.top, left: actionsMenu.left }}
              className="fixed z-50 w-52 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl"
            >
              <div className="border-b border-slate-100 px-2.5 py-2">
                <p className="truncate text-[11px] font-bold text-[#102341]">
                  {subscription.schoolName}
                </p>
                <p className="truncate font-mono text-[10px] text-blue-700">
                  {subscription.schoolCode || "Pending ID"}
                </p>
              </div>

              <p className="px-2.5 pt-2 pb-1 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                Billing
              </p>
              <ActionMenuItem
                icon={CreditCard}
                label="Record payment"
                disabled={disabled}
                onClick={() => openModal("PAYMENT", subscription)}
              />
              <ActionMenuItem
                icon={RotateCw}
                label="Renew subscription"
                disabled={disabled}
                onClick={() => openModal("RENEW", subscription)}
              />
              <ActionMenuItem
                icon={Pencil}
                label="Manage details"
                disabled={disabled}
                onClick={() => openModal("RECORD", subscription)}
              />

              <p className="mt-1 border-t border-slate-100 px-2.5 pt-2 pb-1 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                Access
              </p>
              {subscription.effectiveState !== "ACTIVE" ? (
                <ActionMenuItem
                  icon={Play}
                  label="Activate subscription"
                  disabled={disabled}
                  onClick={() => void changeState(subscription, "ACTIVE")}
                />
              ) : (
                <ActionMenuItem
                  icon={Pause}
                  label="Suspend access"
                  disabled={disabled}
                  onClick={() => void changeState(subscription, "SUSPENDED")}
                />
              )}
              {subscription.state !== "CANCELLED" && (
                <ActionMenuItem
                  icon={Ban}
                  label="Cancel subscription"
                  disabled={disabled}
                  danger
                  onClick={() => void changeState(subscription, "CANCELLED")}
                />
              )}
            </div>
          );
        })()}

      {modal && form && (
        <div className="fixed inset-0 z-50 bg-[#102341]/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-[#102341]">
                  {modal.mode === "PAYMENT"
                    ? "Record Payment"
                    : modal.mode === "RENEW"
                      ? "Renew Subscription"
                      : "Manage Subscription"}
                </h2>
                <p className="text-xs text-[#65748a]">
                  {modal.subscription.schoolName} ·{" "}
                  {modal.subscription.schoolCode || "Pending ID"} ·{" "}
                  {PLAN_LABELS[modal.subscription.plan]}
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                disabled={busySchoolId !== null}
                className="p-1 rounded-full hover:bg-slate-100 text-slate-500 disabled:opacity-50 cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {modal.mode === "PAYMENT" && (
              <div className="rounded-xl bg-[#f4f7fc] border border-slate-200/80 p-4 space-y-2 text-xs">
                <div className="flex items-center justify-between text-[#65748a]">
                  <span>Base price</span>
                  <span className="font-semibold text-[#102341]">
                    {formatCents(modal.subscription.basePriceCents)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[#65748a]">
                  <span>Late fee</span>
                  <span
                    className={
                      modal.subscription.lateFeeCents > 0
                        ? "font-bold text-red-700"
                        : "font-semibold text-[#102341]"
                    }
                  >
                    {modal.subscription.lateFeeCents > 0
                      ? formatCents(modal.subscription.lateFeeCents)
                      : "$0"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[#65748a]">
                  <span>Tax (6.25%)</span>
                  <span
                    className={
                      modal.subscription.lateFeeTaxCents > 0
                        ? "font-bold text-red-700"
                        : "font-semibold text-[#102341]"
                    }
                  >
                    {modal.subscription.lateFeeTaxCents > 0
                      ? formatCents(modal.subscription.lateFeeTaxCents)
                      : "$0"}
                  </span>
                </div>
                {modal.subscription.lateFeeTotalCents > 0 && (
                  <p className="text-[10px] text-red-700 leading-relaxed">
                    This monthly plan passed its paid-through date on{" "}
                    {formatDate(modal.subscription.expirationDate)}. The{" "}
                    {formatCents(modal.subscription.lateFeeTotalCents)} late fee ($25
                    plus 6.25% tax) is included automatically.
                  </p>
                )}
                <div className="flex items-center justify-between border-t border-slate-200 pt-2">
                  <span className="font-bold text-[#102341]">Total to record</span>
                  <span className="text-base font-bold font-mono text-[#102341]">
                    {formatCents(selectedAmountCents)}
                  </span>
                </div>
              </div>
            )}

            {modal.mode === "RECORD" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label
                    htmlFor="subscription-plan"
                    className="block text-[11px] font-bold uppercase tracking-wider text-slate-500"
                  >
                    Plan
                  </label>
                  <select
                    id="subscription-plan"
                    value={form.plan}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        plan: event.target.value as SubscriptionPlan,
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-[#102341] outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="ANNUAL_1500">Annual — $1,500</option>
                    <option value="MONTHLY_250">Monthly — $250</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label
                    htmlFor="subscription-payment-status"
                    className="block text-[11px] font-bold uppercase tracking-wider text-slate-500"
                  >
                    Payment status
                  </label>
                  <select
                    id="subscription-payment-status"
                    value={form.paymentStatus}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        paymentStatus: event.target.value as PaymentStatus,
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-[#102341] outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  >
                    {(["PAID", "PENDING", "OVERDUE", "WAIVED"] as PaymentStatus[]).map(
                      (status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      )
                    )}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label
                    htmlFor="subscription-start-date"
                    className="block text-[11px] font-bold uppercase tracking-wider text-slate-500"
                  >
                    Start date
                  </label>
                  <input
                    id="subscription-start-date"
                    type="date"
                    value={form.startDate}
                    onChange={(event) =>
                      setForm({ ...form, startDate: event.target.value })
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-[#102341] outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div className="space-y-1.5">
                  <label
                    htmlFor="subscription-expiration-date"
                    className="block text-[11px] font-bold uppercase tracking-wider text-slate-500"
                  >
                    Expiration date
                  </label>
                  <input
                    id="subscription-expiration-date"
                    type="date"
                    value={form.expirationDate}
                    onChange={(event) =>
                      setForm({ ...form, expirationDate: event.target.value })
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-[#102341] outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>
            )}

            {modal.mode === "RENEW" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label
                    htmlFor="renewal-expiration-date"
                    className="block text-[11px] font-bold uppercase tracking-wider text-slate-500"
                  >
                    New expiration date
                  </label>
                  <input
                    id="renewal-expiration-date"
                    type="date"
                    value={form.expirationDate}
                    onChange={(event) =>
                      setForm({ ...form, expirationDate: event.target.value })
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-[#102341] outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div className="space-y-1.5">
                  <label
                    htmlFor="renewal-payment-status"
                    className="block text-[11px] font-bold uppercase tracking-wider text-slate-500"
                  >
                    Payment status
                  </label>
                  <select
                    id="renewal-payment-status"
                    value={form.paymentStatus}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        paymentStatus: event.target.value as PaymentStatus,
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-[#102341] outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  >
                    {(["PAID", "PENDING", "OVERDUE", "WAIVED"] as PaymentStatus[]).map(
                      (status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      )
                    )}
                  </select>
                </div>
                <p className="sm:col-span-2 text-[10px] text-[#65748a]">
                  Current paid-through date: {formatDate(modal.subscription.expirationDate)}.
                  Leave the proposed date unchanged to extend by one billing period.
                </p>
              </div>
            )}

            {modal.mode !== "RECORD" && (
              <div className="space-y-1.5">
                <label
                  htmlFor="subscription-amount"
                  className="block text-[11px] font-bold uppercase tracking-wider text-slate-500"
                >
                  Amount received (optional override)
                </label>
                <input
                  id="subscription-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.amount}
                  onChange={(event) =>
                    setForm({ ...form, amount: event.target.value })
                  }
                  placeholder="0.00"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-[#102341] outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label
                htmlFor="subscription-notes"
                className="block text-[11px] font-bold uppercase tracking-wider text-slate-500"
              >
                {modal.mode === "RECORD"
                  ? "Billing notes / reference"
                  : "Payment reference / notes"}
              </label>
              <textarea
                id="subscription-notes"
                value={form.notes}
                onChange={(event) => setForm({ ...form, notes: event.target.value })}
                rows={3}
                maxLength={1000}
                placeholder="Check number, ACH reference, or internal note"
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-[#102341] outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={closeModal}
                disabled={busySchoolId !== null}
                className="px-4 py-2 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void submitModal()}
                disabled={busySchoolId !== null}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold disabled:opacity-60 cursor-pointer shadow-xs"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {busySchoolId
                  ? "Saving..."
                  : modal.mode === "PAYMENT"
                    ? "Confirm Payment"
                    : modal.mode === "RENEW"
                      ? "Confirm Renewal"
                      : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
