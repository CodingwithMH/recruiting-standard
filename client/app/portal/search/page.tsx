"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  BadgeCheck,
  BookmarkCheck,
  BookmarkPlus,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  MapPin,
  RefreshCw,
  Search,
  ShieldCheck,
  Target,
  Trophy,
  Users,
} from "lucide-react";
import { apiRequest } from "@/lib/api";
import SiteLink from "@/components/ui/SiteLink";

interface SearchFilters {
  sport: string;
  graduationYear: string;
  position: string;
  location: string;
}

interface AthleteSummary {
  id: string;
  primarySport: string;
  sports: string[];
  positions: string[];
  graduationYear: number;
  heightInches: number | null;
  weightLbs: number | null;
  gpa: number | null;
  actScore: number | null;
  satScore: number | null;
  highSchoolName: string | null;
  city: string | null;
  state: string | null;
  verificationStatus: string;
  completionPercentage: number;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

interface SearchPagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface AthleteSearchResult {
  athletes: AthleteSummary[];
  pagination: SearchPagination;
}

interface SavedProspectSummary {
  id: string;
  athleteProfile: {
    id: string;
  };
}

const EMPTY_FILTERS: SearchFilters = {
  sport: "",
  graduationYear: "",
  position: "",
  location: "",
};

const GRADUATION_YEARS = Array.from({ length: 17 }, (_, index) => 2024 + index);

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-[#102341] outline-none placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100";
const labelClass =
  "flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#65748a] mb-1.5";

function formatHeight(inches: number | null): string | null {
  if (!inches) return null;
  const feet = Math.floor(inches / 12);
  const remaining = inches % 12;
  return `${feet}'${remaining}"`;
}

export default function AthleteSearchPage() {
  const router = useRouter();
  const [filters, setFilters] = useState<SearchFilters>(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] =
    useState<SearchFilters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<AthleteSearchResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savedProfileIds, setSavedProfileIds] = useState<string[]>([]);
  const [savingProfileId, setSavingProfileId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadSavedProspectIds = useCallback(async () => {
    const res = await apiRequest<SavedProspectSummary[]>("/coach/prospects");
    if (res.success && res.data) {
      setSavedProfileIds(res.data.map((prospect) => prospect.athleteProfile.id));
    }
  }, []);

  const loadAthletes = useCallback(
    async (activeFilters: SearchFilters, activePage: number) => {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: String(activePage),
      });

      if (activeFilters.sport.trim()) {
        params.set("sport", activeFilters.sport.trim());
      }
      if (activeFilters.graduationYear) {
        params.set("graduationYear", activeFilters.graduationYear);
      }
      if (activeFilters.position.trim()) {
        params.set("position", activeFilters.position.trim());
      }
      if (activeFilters.location.trim()) {
        params.set("location", activeFilters.location.trim());
      }

      const res = await apiRequest<AthleteSearchResult>(
        `/coach/athletes?${params.toString()}`
      );

      if (res.success && res.data) {
        setResult(res.data);
      } else {
        setResult(null);
        setError(res.error || "Unable to search approved athletes.");
      }

      setLoading(false);
    },
    []
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadAthletes(appliedFilters, page);
  }, [appliedFilters, page, loadAthletes]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadSavedProspectIds();
  }, [loadSavedProspectIds]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(1);
    setAppliedFilters({ ...filters });
  };

  const handleReset = () => {
    setFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
    setPage(1);
  };

  const handleSaveProspect = async (athlete: AthleteSummary) => {
    setSavingProfileId(athlete.id);
    setNotice(null);
    setActionError(null);

    const res = await apiRequest("/coach/prospects", {
      method: "POST",
      body: JSON.stringify({ athleteProfileId: athlete.id }),
    });

    setSavingProfileId(null);

    if (res.success) {
      setSavedProfileIds((current) =>
        current.includes(athlete.id) ? current : [...current, athlete.id]
      );
      setNotice(
        `${athlete.user.firstName} ${athlete.user.lastName} was added to your prospect watchlist.`
      );
      return;
    }

    if (res.error?.toLowerCase().includes("already")) {
      setSavedProfileIds((current) =>
        current.includes(athlete.id) ? current : [...current, athlete.id]
      );
      setNotice(
        `${athlete.user.firstName} ${athlete.user.lastName} is already in your prospect watchlist.`
      );
      return;
    }

    setActionError(res.error || "Unable to save this athlete as a prospect.");
  };

  const total = result?.pagination.total ?? 0;
  const totalPages = result?.pagination.totalPages ?? 0;
  const currentPage = result?.pagination.page ?? page;
  const firstResult = total === 0 ? 0 : (currentPage - 1) * (result?.pagination.limit ?? 20) + 1;
  const lastResult = result
    ? Math.min(currentPage * result.pagination.limit, total)
    : 0;

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/80 text-blue-900 text-xs font-semibold uppercase tracking-wider mb-3">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            <span>Verified Talent Search</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#102341]">
            Athlete Discovery
          </h1>
          <p className="text-xs sm:text-sm text-[#65748a] mt-1 leading-relaxed">
            Search administrator-approved student-athletes by sport, graduation
            year, position or event, and location.
          </p>
        </div>

        <div className="bg-[#f4f7fc] border border-slate-200/80 rounded-xl px-4 py-2.5 text-left">
          <span className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
            <Users className="w-3 h-3" />
            Approved Athletes
          </span>
          <span className="text-sm font-bold font-mono text-[#102341]">
            {loading ? "…" : total}
          </span>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-2xs space-y-5"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className={labelClass} htmlFor="search-sport">
              <Trophy className="w-3 h-3 text-blue-600" />
              Sport
            </label>
            <input
              id="search-sport"
              type="text"
              value={filters.sport}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  sport: event.target.value,
                }))
              }
              placeholder="e.g. Basketball"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="search-graduation-year">
              <GraduationCap className="w-3 h-3 text-blue-600" />
              Graduation Year
            </label>
            <select
              id="search-graduation-year"
              value={filters.graduationYear}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  graduationYear: event.target.value,
                }))
              }
              className={inputClass}
            >
              <option value="">All class years</option>
              {GRADUATION_YEARS.map((year) => (
                <option key={year} value={year}>
                  Class of {year}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass} htmlFor="search-position">
              <Target className="w-3 h-3 text-blue-600" />
              Position / Event
            </label>
            <input
              id="search-position"
              type="text"
              value={filters.position}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  position: event.target.value,
                }))
              }
              placeholder="e.g. Point Guard"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="search-location">
              <MapPin className="w-3 h-3 text-blue-600" />
              Location
            </label>
            <input
              id="search-location"
              type="text"
              value={filters.location}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  location: event.target.value,
                }))
              }
              placeholder="City, State, or Region"
              className={inputClass}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <p className="text-[11px] text-[#65748a]">
            Only profiles approved by platform administrators appear in these
            results.
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleReset}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-[#102341] text-xs font-bold disabled:opacity-60 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reset
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold disabled:opacity-60 cursor-pointer shadow-xs"
            >
              <Search className="w-3.5 h-3.5" />
              Search Athletes
            </button>
          </div>
        </div>
      </form>

      {notice && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{notice}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-900 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {(error || actionError) && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{actionError || error}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setError(null);
              setActionError(null);
            }}
            className="text-xs font-bold text-red-700 hover:text-red-900 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-[#102341]">Search Results</h2>
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-semibold text-[#65748a]">
              {loading
                ? "Searching…"
                : total === 0
                  ? "No approved athletes found"
                  : `Showing ${firstResult}–${lastResult} of ${total}`}
            </span>
            <SiteLink
              href="/portal/prospects"
              className="inline-flex items-center gap-1.5 text-[11px] font-bold text-blue-700 hover:text-blue-900"
            >
              <BookmarkCheck className="w-3.5 h-3.5" />
              Watchlist ({savedProfileIds.length})
            </SiteLink>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#f4f7fc] text-[#65748a] uppercase font-bold tracking-wider text-[10px] border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Athlete</th>
                <th className="px-4 py-3">Sport / Position</th>
                <th className="px-4 py-3">Class</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Academics / Size</th>
                <th className="px-4 py-3">Profile</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Searching approved athlete profiles…
                  </td>
                </tr>
              ) : !result || result.athletes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                    <Search className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700">
                      No approved athletes match these filters
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Try broadening the sport, class year, position, or location.
                    </p>
                  </td>
                </tr>
              ) : (
                result.athletes.map((athlete) => {
                  const sportLabel =
                    athlete.sports.length > 0
                      ? athlete.sports.join(" · ")
                      : athlete.primarySport;
                  const locationLabel =
                    [athlete.city, athlete.state].filter(Boolean).join(", ") ||
                    "—";
                  const height = formatHeight(athlete.heightInches);
                  const isSaved = savedProfileIds.includes(athlete.id);
                  const isSaving = savingProfileId === athlete.id;

                  const profileHref = `/portal/athletes/${athlete.id}`;

                  return (
                    <tr
                      key={athlete.id}
                      role="link"
                      tabIndex={0}
                      onClick={() => router.push(profileHref)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          router.push(profileHref);
                        }
                      }}
                      className="hover:bg-slate-50/70 transition-colors cursor-pointer focus:outline-none focus:bg-blue-50/50"
                    >
                      <td className="px-4 py-4">
                        <span className="block font-bold text-[#102341]">
                          {athlete.user.firstName} {athlete.user.lastName}
                        </span>
                        <span className="block text-[11px] text-[#65748a]">
                          {athlete.user.email}
                        </span>
                        {athlete.highSchoolName && (
                          <span className="block text-[10px] text-slate-400">
                            {athlete.highSchoolName}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <span className="block font-semibold text-[#102341]">
                          {sportLabel}
                        </span>
                        <span className="block text-[10px] text-[#65748a]">
                          {athlete.positions.length > 0
                            ? athlete.positions.join(", ")
                            : "Position not listed"}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="font-semibold text-[#102341]">
                          Class of {athlete.graduationYear}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-[#65748a]">
                        {locationLabel}
                      </td>
                      <td className="px-4 py-4">
                        <span className="block text-[#102341]">
                          GPA {athlete.gpa !== null ? athlete.gpa.toFixed(2) : "—"}
                        </span>
                        <span className="block text-[10px] text-[#65748a]">
                          ACT {athlete.actScore ?? "—"} · SAT{" "}
                          {athlete.satScore ?? "—"}
                        </span>
                        <span className="block text-[10px] text-slate-400">
                          {height ? `${height} · ` : ""}
                          {athlete.weightLbs ? `${athlete.weightLbs} lbs` : ""}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border bg-emerald-50 text-emerald-800 border-emerald-200/80 text-[10px] font-bold uppercase tracking-wider">
                          <BadgeCheck className="w-3 h-3" />
                          Approved
                        </span>
                        <span className="block text-[10px] text-slate-400 mt-1">
                          {athlete.completionPercentage}% complete
                        </span>
                        <span className="block text-[10px] font-semibold text-blue-700 mt-1">
                          View profile →
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        {isSaved ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-800 text-[10px] font-bold uppercase tracking-wider">
                            <BookmarkCheck className="w-3.5 h-3.5" />
                            Saved
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              void handleSaveProspect(athlete);
                            }}
                            onKeyDown={(event) => event.stopPropagation()}
                            disabled={isSaving}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#102341] hover:bg-[#1d3d68] text-white text-[10px] font-bold disabled:opacity-60 cursor-pointer shadow-xs"
                          >
                            <BookmarkPlus className="w-3.5 h-3.5" />
                            {isSaving ? "Saving…" : "Save Prospect"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <span className="text-[11px] font-semibold text-[#65748a]">
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={loading || currentPage <= 1}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-[#102341] text-[11px] font-bold disabled:opacity-50 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Previous
              </button>
              <button
                type="button"
                onClick={() =>
                  setPage((current) => Math.min(totalPages, current + 1))
                }
                disabled={loading || currentPage >= totalPages}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-[#102341] text-[11px] font-bold disabled:opacity-50 cursor-pointer"
              >
                Next
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
