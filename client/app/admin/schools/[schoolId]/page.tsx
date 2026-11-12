"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  CalendarDays,
  CreditCard,
  Landmark,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  ShieldCheck,
  Users,
} from "lucide-react";
import { apiRequest } from "@/lib/api";
import SiteLink from "@/components/ui/SiteLink";

type SchoolStatus = "PENDING" | "APPROVED" | "SUSPENDED" | "REJECTED";

interface SchoolProfile {
  id: string;
  schoolId: string | null;
  name: string;
  address: string | null;
  city: string | null;
  country: string | null;
  provinceRegion: string | null;
  postalCode: string | null;
  contactEmail: string;
  contactPhone: string | null;
  status: SchoolStatus;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const STATUS_STYLES: Record<SchoolStatus, string> = {
  PENDING: "bg-amber-50 text-amber-800 border-amber-200/80",
  APPROVED: "bg-emerald-50 text-emerald-800 border-emerald-200/80",
  SUSPENDED: "bg-slate-100 text-slate-700 border-slate-200",
  REJECTED: "bg-red-50 text-red-800 border-red-200/80",
};

function formatDate(value: string | null): string {
  if (!value) return "Not recorded";
  const parsed = new Date(value);
  return isNaN(parsed.getTime())
    ? "Not recorded"
    : parsed.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
}

export default function AdminSchoolProfilePage() {
  const params = useParams<{ schoolId: string }>();
  const schoolId = params.schoolId;
  const [school, setSchool] = useState<SchoolProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSchool = useCallback(async () => {
    if (!schoolId) return;

    setLoading(true);
    setError(null);

    const res = await apiRequest<SchoolProfile>(`/admin/schools/${schoolId}`);

    if (res.success && res.data) {
      setSchool(res.data);
    } else {
      setSchool(null);
      setError(res.error || "Unable to load this school profile.");
    }

    setLoading(false);
  }, [schoolId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadSchool();
  }, [loadSchool]);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/90 p-16 text-center text-slate-400">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        Loading school profile…
      </div>
    );
  }

  if (error || !school) {
    return (
      <div className="space-y-4">
        <SiteLink
          href="/admin/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#65748a] hover:text-[#102341]"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to school queue
        </SiteLink>
        <div className="bg-white rounded-2xl border border-red-200 p-10 text-center">
          <AlertCircle className="w-9 h-9 text-red-500 mx-auto mb-2" />
          <p className="font-bold text-[#102341]">School profile unavailable</p>
          <p className="text-xs text-red-700 mt-1">
            {error || "This school profile could not be found."}
          </p>
          <button
            type="button"
            onClick={() => void loadSchool()}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#102341] hover:bg-[#1d3d68] text-white text-xs font-bold cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Try again
          </button>
        </div>
      </div>
    );
  }

  const location =
    [school.city, school.provinceRegion, school.country]
      .filter(Boolean)
      .join(", ") || "Address not provided";

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SiteLink
          href="/admin/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#65748a] hover:text-[#102341]"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to school queue
        </SiteLink>
        <div className="flex flex-wrap items-center gap-2">
          <SiteLink
            href="/admin/subscriptions"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-[#102341] text-[11px] font-bold"
          >
            <CreditCard className="w-3.5 h-3.5" />
            Subscription
          </SiteLink>
          <SiteLink
            href="/admin/users"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-[#102341] text-[11px] font-bold"
          >
            <Users className="w-3.5 h-3.5" />
            User Directory
          </SiteLink>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/80 text-blue-900 text-xs font-semibold uppercase tracking-wider">
            <Building2 className="w-3.5 h-3.5 text-blue-600" />
            <span>Institutional Profile</span>
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#102341]">
              {school.name}
            </h1>
            <p className="text-xs sm:text-sm text-[#65748a] mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="inline-flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" />
                {school.contactEmail}
              </span>
              {school.contactPhone && (
                <span className="inline-flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" />
                  {school.contactPhone}
                </span>
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider ${STATUS_STYLES[school.status]}`}
            >
              {school.status}
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-slate-200 bg-slate-50 text-slate-700 text-[10px] font-bold uppercase tracking-wider">
              <ShieldCheck className="w-3 h-3" />
              {school.schoolId || "School ID pending"}
            </span>
          </div>
        </div>

        <div className="bg-[#f4f7fc] border border-slate-200/80 rounded-xl px-5 py-4 min-w-[240px]">
          <span className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider">
            Permanent School ID
          </span>
          <span className="text-lg font-bold font-mono text-[#102341]">
            {school.schoolId || "—"}
          </span>
          <span className="block text-[11px] text-[#65748a] mt-1">
            {school.approvedAt
              ? `Approved ${formatDate(school.approvedAt)}`
              : "Assigned after administrative approval"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-2xs space-y-4">
          <h2 className="text-sm font-bold text-[#102341] flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-600" />
            Institution Details
          </h2>
          <dl className="space-y-3 text-xs">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3">
              <dt className="text-[#65748a]">Street address</dt>
              <dd className="font-semibold text-[#102341] text-right">
                {school.address || "—"}
              </dd>
            </div>
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3">
              <dt className="text-[#65748a]">City / Region / Country</dt>
              <dd className="font-semibold text-[#102341] text-right">
                {location}
              </dd>
            </div>
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3">
              <dt className="text-[#65748a]">Postal code</dt>
              <dd className="font-semibold text-[#102341]">
                {school.postalCode || "—"}
              </dd>
            </div>
            <div className="flex items-start justify-between gap-4">
              <dt className="text-[#65748a]">School ID</dt>
              <dd className="font-semibold font-mono text-[#102341]">
                {school.schoolId || "Pending"}
              </dd>
            </div>
          </dl>
        </section>

        <section className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-2xs space-y-4">
          <h2 className="text-sm font-bold text-[#102341] flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-blue-600" />
            Account Timeline
          </h2>
          <dl className="space-y-3 text-xs">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3">
              <dt className="text-[#65748a]">Registration submitted</dt>
              <dd className="font-semibold text-[#102341]">
                {formatDate(school.createdAt)}
              </dd>
            </div>
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3">
              <dt className="text-[#65748a]">Approved</dt>
              <dd className="font-semibold text-[#102341]">
                {formatDate(school.approvedAt)}
              </dd>
            </div>
            <div className="flex items-start justify-between gap-4">
              <dt className="text-[#65748a]">Last updated</dt>
              <dd className="font-semibold text-[#102341]">
                {formatDate(school.updatedAt)}
              </dd>
            </div>
          </dl>
        </section>
      </div>

      <div className="bg-[#f4f7fc] rounded-2xl p-5 border border-slate-200/90 flex items-start gap-3">
        <Landmark className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
        <p className="text-xs text-[#65748a] leading-relaxed">
          Institutional profile data is visible to Platform Administration. Use the
          subscription manager to review billing state and the user directory to inspect
          authorized school staff accounts.
        </p>
      </div>
    </div>
  );
}
