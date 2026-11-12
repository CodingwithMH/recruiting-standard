"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  BadgeCheck,
  BookOpen,
  CheckCircle2,
  Circle,
  ExternalLink,
  GraduationCap,
  Mail,
  MapPin,
  RefreshCw,
  Ruler,
  ShieldCheck,
  Target,
  Trophy,
  Video,
} from "lucide-react";
import { apiRequest } from "@/lib/api";
import SiteLink from "@/components/ui/SiteLink";

type VerificationStatus = "UNVERIFIED" | "PENDING" | "APPROVED" | "REJECTED";

interface StoredSport {
  sport: string;
  isPrimary: boolean;
  positions: string[];
  statistics: Array<{ label: string; value: string }>;
}

interface CompletionItem {
  key: string;
  label: string;
  complete: boolean;
}

interface HighlightVideo {
  id: string;
  title: string;
  videoUrl: string;
  provider: string;
  durationSeconds: number | null;
}

interface AthleteProfileDetail {
  id: string;
  userId: string;
  graduationYear: number;
  sports: StoredSport[];
  heightInches: number | null;
  weightLbs: number | null;
  academic: {
    gpa: number | null;
    actScore: number | null;
    satScore: number | null;
    highSchoolName: string | null;
    city: string | null;
    state: string | null;
  };
  highlightLinks: string[];
  completionPercentage: number;
  completionChecklist: CompletionItem[];
  verificationStatus: VerificationStatus;
  verificationNotes: string | null;
  submittedAt: string | null;
  verifiedAt: string | null;
  updatedAt: string;
  athlete: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    highlightVideos: HighlightVideo[];
  };
}

const VERIFICATION_STYLES: Record<VerificationStatus, string> = {
  UNVERIFIED: "bg-slate-100 text-slate-700 border-slate-200",
  PENDING: "bg-amber-50 text-amber-800 border-amber-200/80",
  APPROVED: "bg-emerald-50 text-emerald-800 border-emerald-200/80",
  REJECTED: "bg-red-50 text-red-800 border-red-200/80",
};

const VERIFICATION_LABELS: Record<VerificationStatus, string> = {
  UNVERIFIED: "Unverified",
  PENDING: "Verification pending",
  APPROVED: "Approved",
  REJECTED: "Verification rejected",
};

function formatHeight(inches: number | null): string | null {
  if (!inches) return null;
  return `${Math.floor(inches / 12)}'${inches % 12}"`;
}

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

export default function AthleteProfileDetailPage() {
  const params = useParams<{ athleteProfileId: string }>();
  const athleteProfileId = params.athleteProfileId;
  const [profile, setProfile] = useState<AthleteProfileDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    if (!athleteProfileId) return;

    setLoading(true);
    setError(null);

    const res = await apiRequest<AthleteProfileDetail>(
      `/coach/athletes/${athleteProfileId}`
    );

    if (res.success && res.data) {
      setProfile(res.data);
    } else {
      setProfile(null);
      setError(res.error || "Unable to load this athlete profile.");
    }

    setLoading(false);
  }, [athleteProfileId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadProfile();
  }, [loadProfile]);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/90 p-16 text-center text-slate-400">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        Loading athlete profile…
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="space-y-4">
        <SiteLink
          href="/portal/search"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#65748a] hover:text-[#102341]"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to talent search
        </SiteLink>
        <div className="bg-white rounded-2xl border border-red-200 p-10 text-center">
          <AlertCircle className="w-9 h-9 text-red-500 mx-auto mb-2" />
          <p className="font-bold text-[#102341]">Athlete profile unavailable</p>
          <p className="text-xs text-red-700 mt-1">
            {error || "This athlete profile could not be found."}
          </p>
          <button
            type="button"
            onClick={() => void loadProfile()}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#102341] hover:bg-[#1d3d68] text-white text-xs font-bold cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Try again
          </button>
        </div>
      </div>
    );
  }

  const { athlete, academic } = profile;
  const height = formatHeight(profile.heightInches);
  const location = [academic.city, academic.state].filter(Boolean).join(", ");
  const allPositions = profile.sports.flatMap((sport) => sport.positions);
  const primarySport = profile.sports.find((sport) => sport.isPrimary)?.sport;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SiteLink
          href="/portal/search"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#65748a] hover:text-[#102341]"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to talent search
        </SiteLink>
        <SiteLink
          href="/portal/prospects"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 hover:text-blue-900"
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          Open prospect watchlist
        </SiteLink>
      </div>

      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/80 text-blue-900 text-xs font-semibold uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            <span>Approved Athlete Profile</span>
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#102341]">
              {athlete.firstName} {athlete.lastName}
            </h1>
            <p className="text-xs sm:text-sm text-[#65748a] mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="inline-flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" />
                {athlete.email}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5" />
                Class of {profile.graduationYear}
              </span>
              {location && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  {location}
                </span>
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider ${VERIFICATION_STYLES[profile.verificationStatus]}`}
            >
              {profile.verificationStatus === "APPROVED" ? (
                <BadgeCheck className="w-3 h-3" />
              ) : (
                <Circle className="w-3 h-3" />
              )}
              {VERIFICATION_LABELS[profile.verificationStatus]}
            </span>
            <span className="inline-flex px-2.5 py-1 rounded-full border border-slate-200 bg-slate-50 text-slate-700 text-[10px] font-bold uppercase tracking-wider">
              {profile.completionPercentage}% profile complete
            </span>
          </div>
        </div>

        <div className="bg-[#f4f7fc] border border-slate-200/80 rounded-xl px-5 py-4 min-w-[220px]">
          <span className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider">
            Primary Sport
          </span>
          <span className="text-base font-bold text-[#102341]">
            {primarySport || "Not listed"}
          </span>
          <span className="block text-[11px] text-[#65748a] mt-1">
            {allPositions.length > 0 ? allPositions.join(" · ") : "No positions listed"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-2xs space-y-4">
          <h2 className="text-sm font-bold text-[#102341] flex items-center gap-2">
            <Trophy className="w-4 h-4 text-blue-600" />
            Sports & Events
          </h2>
          <div className="space-y-3">
            {profile.sports.map((sport) => (
              <div
                key={sport.sport}
                className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 space-y-1.5"
              >
                <span className="flex items-center gap-1.5 text-xs font-bold text-[#102341]">
                  {sport.sport}
                  {sport.isPrimary && (
                    <span className="px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[9px] uppercase tracking-wider">
                      Primary
                    </span>
                  )}
                </span>
                <span className="block text-[11px] text-[#65748a]">
                  {sport.positions.length > 0
                    ? sport.positions.join(", ")
                    : "No positions listed"}
                </span>
                {sport.statistics.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {sport.statistics.map((stat) => (
                      <span
                        key={`${sport.sport}-${stat.label}`}
                        className="inline-flex px-2 py-1 rounded-full bg-white border border-slate-200 text-[10px] text-[#65748a]"
                      >
                        <strong className="text-[#102341] mr-1">{stat.label}:</strong>
                        {stat.value}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-2xs space-y-4">
          <h2 className="text-sm font-bold text-[#102341] flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-blue-600" />
            Academics
          </h2>
          <dl className="grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
              <dt className="text-[10px] uppercase font-bold text-slate-500">GPA</dt>
              <dd className="font-bold text-[#102341] mt-1">
                {academic.gpa !== null ? academic.gpa.toFixed(2) : "—"}
              </dd>
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
              <dt className="text-[10px] uppercase font-bold text-slate-500">ACT</dt>
              <dd className="font-bold text-[#102341] mt-1">
                {academic.actScore ?? "—"}
              </dd>
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
              <dt className="text-[10px] uppercase font-bold text-slate-500">SAT</dt>
              <dd className="font-bold text-[#102341] mt-1">
                {academic.satScore ?? "—"}
              </dd>
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
              <dt className="text-[10px] uppercase font-bold text-slate-500">High School</dt>
              <dd className="font-bold text-[#102341] mt-1">
                {academic.highSchoolName || "—"}
              </dd>
            </div>
          </dl>
          <div className="flex flex-wrap gap-3 text-[11px] text-[#65748a] pt-1">
            <span className="inline-flex items-center gap-1.5">
              <Ruler className="w-3.5 h-3.5" />
              {height || "Height not listed"}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5" />
              {profile.weightLbs ? `${profile.weightLbs} lbs` : "Weight not listed"}
            </span>
          </div>
        </section>

        <section className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-2xs space-y-4">
          <h2 className="text-sm font-bold text-[#102341] flex items-center gap-2">
            <Video className="w-4 h-4 text-blue-600" />
            Highlights
          </h2>
          {profile.highlightLinks.length === 0 && athlete.highlightVideos.length === 0 ? (
            <p className="text-xs text-slate-400">No highlight media has been added.</p>
          ) : (
            <div className="space-y-2">
              {athlete.highlightVideos.map((video) => (
                <a
                  key={video.id}
                  href={video.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-xs font-semibold text-[#102341] hover:border-blue-300 hover:bg-white transition-colors"
                >
                  <span className="truncate">{video.title}</span>
                  <ExternalLink className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                </a>
              ))}
              {profile.highlightLinks.map((link) => (
                <a
                  key={link}
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-xs font-semibold text-[#102341] hover:border-blue-300 hover:bg-white transition-colors"
                >
                  <span className="truncate">{link}</span>
                  <ExternalLink className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                </a>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-[#102341]">Profile Completion Checklist</h2>
          <span className="text-[11px] font-semibold text-[#65748a]">
            Last updated {formatDate(profile.updatedAt)}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {profile.completionChecklist.map((item) => (
            <div
              key={item.key}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs ${
                item.complete
                  ? "border-emerald-200 bg-emerald-50/60 text-emerald-900"
                  : "border-slate-200 bg-slate-50 text-slate-500"
              }`}
            >
              {item.complete ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              ) : (
                <Circle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              )}
              {item.label}
            </div>
          ))}
        </div>
        {profile.verificationStatus === "APPROVED" && (
          <p className="text-[11px] text-[#65748a]">
            Approved {formatDate(profile.verifiedAt)}
            {profile.submittedAt
              ? ` · Submitted ${formatDate(profile.submittedAt)}`
              : ""}
          </p>
        )}
        {profile.verificationNotes && (
          <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-[#65748a]">
            <strong className="text-[#102341]">Reviewer notes:</strong>{" "}
            {profile.verificationNotes}
          </p>
        )}
      </section>
    </div>
  );
}
