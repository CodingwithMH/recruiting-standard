"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  BadgeCheck,
  BookmarkCheck,
  CheckCircle2,
  GraduationCap,
  MapPin,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Target,
  Trash2,
  Trophy,
} from "lucide-react";
import { apiRequest } from "@/lib/api";
import SiteLink from "@/components/ui/SiteLink";

interface ProspectAthlete {
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

interface SavedProspect {
  id: string;
  notes: string | null;
  savedAt: string;
  athleteProfile: ProspectAthlete;
}

function formatHeight(inches: number | null): string | null {
  if (!inches) return null;
  const feet = Math.floor(inches / 12);
  const remaining = inches % 12;
  return `${feet}'${remaining}"`;
}

function formatSavedDate(value: string): string {
  const parsed = new Date(value);
  return isNaN(parsed.getTime())
    ? "Unknown"
    : parsed.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
}

export default function SavedProspectsPage() {
  const [prospects, setProspects] = useState<SavedProspect[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftNotes, setDraftNotes] = useState("");
  const [savingNotesId, setSavingNotesId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const loadProspects = useCallback(async () => {
    setLoading(true);
    setError(null);

    const res = await apiRequest<SavedProspect[]>("/coach/prospects");

    if (res.success && res.data) {
      setProspects(res.data);
    } else {
      setProspects([]);
      setError(res.error || "Unable to load your saved prospects.");
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadProspects();
  }, [loadProspects]);

  const startEditing = (prospect: SavedProspect) => {
    setEditingId(prospect.id);
    setDraftNotes(prospect.notes ?? "");
    setNotice(null);
    setError(null);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setDraftNotes("");
  };

  const handleSaveNotes = async (prospect: SavedProspect) => {
    setSavingNotesId(prospect.id);
    setError(null);
    setNotice(null);

    const notes = draftNotes.trim() ? draftNotes.trim() : null;
    const res = await apiRequest<SavedProspect>(
      `/coach/prospects/${prospect.id}`,
      {
        method: "PATCH",
        body: JSON.stringify({ notes }),
      }
    );

    setSavingNotesId(null);

    if (res.success && res.data) {
      setProspects((current) =>
        current.map((item) => (item.id === prospect.id ? res.data! : item))
      );
      setEditingId(null);
      setDraftNotes("");
      setNotice(
        `Notes updated for ${prospect.athleteProfile.user.firstName} ${prospect.athleteProfile.user.lastName}.`
      );
    } else {
      setError(res.error || "Unable to update prospect notes.");
    }
  };

  const handleRemove = async (prospect: SavedProspect) => {
    const athleteName = `${prospect.athleteProfile.user.firstName} ${prospect.athleteProfile.user.lastName}`;

    if (
      !window.confirm(
        `Remove ${athleteName} from your prospect watchlist? Your saved notes will be deleted.`
      )
    ) {
      return;
    }

    setRemovingId(prospect.id);
    setError(null);
    setNotice(null);

    const res = await apiRequest(`/coach/prospects/${prospect.id}`, {
      method: "DELETE",
    });

    setRemovingId(null);

    if (res.success) {
      setProspects((current) =>
        current.filter((item) => item.id !== prospect.id)
      );
      if (editingId === prospect.id) {
        cancelEditing();
      }
      setNotice(`${athleteName} was removed from your watchlist.`);
    } else {
      setError(res.error || "Unable to remove this prospect.");
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/80 text-blue-900 text-xs font-semibold uppercase tracking-wider mb-3">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            <span>Private Coach Watchlist</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#102341]">
            Saved Prospects
          </h1>
          <p className="text-xs sm:text-sm text-[#65748a] mt-1 leading-relaxed">
            Your saved approved athletes, evaluation notes, and recruiting
            shortlist. Only your coach account can see this list.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-[#f4f7fc] border border-slate-200/80 rounded-xl px-4 py-2.5 text-left">
            <span className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider">
              Saved Prospects
            </span>
            <span className="text-sm font-bold font-mono text-[#102341]">
              {loading ? "…" : prospects.length}
            </span>
          </div>
          <SiteLink
            href="/portal/search"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-[#102341] hover:bg-[#1d3d68] text-white text-xs font-bold transition-colors"
          >
            <Search className="w-3.5 h-3.5" />
            Find Athletes
          </SiteLink>
        </div>
      </div>

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

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-xs font-bold text-red-700 hover:text-red-900 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-[#102341]">Prospect Watchlist</h2>
          <button
            type="button"
            onClick={() => void loadProspects()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-[#102341] text-[11px] font-bold disabled:opacity-60 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="rounded-xl border border-slate-200 py-16 text-center text-slate-400">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading your saved prospects…
          </div>
        ) : prospects.length === 0 ? (
          <div className="rounded-xl border border-slate-200 py-16 text-center">
            <BookmarkCheck className="w-9 h-9 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-slate-700">
              Your prospect watchlist is empty
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Search approved athletes and save the ones you want to evaluate.
            </p>
            <SiteLink
              href="/portal/search"
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#102341] hover:bg-[#1d3d68] text-white text-xs font-bold transition-colors"
            >
              <Search className="w-3.5 h-3.5" />
              Search Approved Athletes
            </SiteLink>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {prospects.map((prospect) => {
              const athlete = prospect.athleteProfile;
              const name = `${athlete.user.firstName} ${athlete.user.lastName}`;
              const sportLabel =
                athlete.sports.length > 0
                  ? athlete.sports.join(" · ")
                  : athlete.primarySport;
              const locationLabel =
                [athlete.city, athlete.state].filter(Boolean).join(", ") || "—";
              const height = formatHeight(athlete.heightInches);
              const isEditing = editingId === prospect.id;
              const isSavingNotes = savingNotesId === prospect.id;
              const isRemoving = removingId === prospect.id;

              return (
                <div
                  key={prospect.id}
                  className="rounded-xl border border-slate-200 bg-slate-50/40 p-5 space-y-4 flex flex-col"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <SiteLink
                        href={`/portal/athletes/${athlete.id}`}
                        className="text-sm font-bold text-[#102341] hover:text-blue-700 hover:underline"
                      >
                        {name}
                      </SiteLink>
                      <p className="text-[11px] text-[#65748a]">
                        {athlete.user.email}
                      </p>
                      {athlete.highSchoolName && (
                        <p className="text-[10px] text-slate-400">
                          {athlete.highSchoolName}
                        </p>
                      )}
                    </div>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border bg-emerald-50 text-emerald-800 border-emerald-200/80 text-[10px] font-bold uppercase tracking-wider shrink-0">
                      <BadgeCheck className="w-3 h-3" />
                      Approved
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                    <div className="flex items-start gap-2">
                      <Trophy className="w-3.5 h-3.5 text-blue-600 mt-0.5 shrink-0" />
                      <div>
                        <span className="block font-semibold text-[#102341]">
                          {sportLabel}
                        </span>
                        <span className="block text-[#65748a]">
                          {athlete.positions.length > 0
                            ? athlete.positions.join(", ")
                            : "Position not listed"}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <GraduationCap className="w-3.5 h-3.5 text-blue-600 mt-0.5 shrink-0" />
                      <div>
                        <span className="block font-semibold text-[#102341]">
                          Class of {athlete.graduationYear}
                        </span>
                        <span className="block text-[#65748a]">
                          {athlete.completionPercentage}% profile complete
                        </span>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin className="w-3.5 h-3.5 text-blue-600 mt-0.5 shrink-0" />
                      <div>
                        <span className="block font-semibold text-[#102341]">
                          {locationLabel}
                        </span>
                        <span className="block text-[#65748a]">
                          GPA {athlete.gpa !== null ? athlete.gpa.toFixed(2) : "—"}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Target className="w-3.5 h-3.5 text-blue-600 mt-0.5 shrink-0" />
                      <div>
                        <span className="block font-semibold text-[#102341]">
                          {height ? `${height}` : "Height not listed"}
                          {athlete.weightLbs ? ` · ${athlete.weightLbs} lbs` : ""}
                        </span>
                        <span className="block text-[#65748a]">
                          ACT {athlete.actScore ?? "—"} · SAT{" "}
                          {athlete.satScore ?? "—"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#65748a]">
                        Private Evaluation Notes
                      </span>
                      {!isEditing && (
                        <button
                          type="button"
                          onClick={() => startEditing(prospect)}
                          className="text-[10px] font-bold text-blue-700 hover:text-blue-900 cursor-pointer"
                        >
                          Edit notes
                        </button>
                      )}
                    </div>

                    {isEditing ? (
                      <div className="space-y-2">
                        <textarea
                          value={draftNotes}
                          onChange={(event) => setDraftNotes(event.target.value)}
                          rows={4}
                          maxLength={2000}
                          placeholder="Add private evaluation notes..."
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-[#102341] outline-none placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                        />
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={cancelEditing}
                            disabled={isSavingNotes}
                            className="px-3 py-1.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-[#102341] text-[10px] font-bold disabled:opacity-60 cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleSaveNotes(prospect)}
                            disabled={isSavingNotes}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold disabled:opacity-60 cursor-pointer"
                          >
                            <Save className="w-3 h-3" />
                            {isSavingNotes ? "Saving…" : "Save Notes"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[11px] text-[#65748a] leading-relaxed whitespace-pre-wrap">
                        {prospect.notes || "No evaluation notes yet."}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-[10px] text-slate-400">
                        Saved {formatSavedDate(prospect.savedAt)}
                      </span>
                      <SiteLink
                        href={`/portal/athletes/${athlete.id}`}
                        className="text-[10px] font-bold text-blue-700 hover:text-blue-900"
                      >
                        View profile →
                      </SiteLink>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleRemove(prospect)}
                      disabled={isRemoving}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-red-200 bg-red-50 hover:bg-red-100 text-red-800 text-[10px] font-bold disabled:opacity-60 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      {isRemoving ? "Removing…" : "Remove"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
