"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  GraduationCap,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCheck,
  UserX,
} from "lucide-react";
import { apiRequest } from "@/lib/api";
import type { UserProfile } from "@/lib/api";
import { getStoredUser } from "@/lib/auth";

type AthleteStatus = "PENDING" | "ACTIVE" | "INACTIVE" | "SUSPENDED";

interface SchoolAthlete {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  dateOfBirth: string | null;
  schoolId: string | null;
  status: AthleteStatus;
  createdAt: string;
  athleteProfile?: {
    id: string;
    graduationYear: number;
    primarySport: string;
    positions: string[];
    gpa: number | null;
  } | null;
}

const STATUS_STYLES: Record<AthleteStatus, string> = {
  PENDING: "bg-amber-50 text-amber-800 border-amber-200/80",
  ACTIVE: "bg-emerald-50 text-emerald-800 border-emerald-200/80",
  INACTIVE: "bg-slate-100 text-slate-700 border-slate-200",
  SUSPENDED: "bg-red-50 text-red-800 border-red-200/80",
};

export default function SchoolAthletesPage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [athletes, setAthletes] = useState<SchoolAthlete[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<AthleteStatus | "">("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUser(getStoredUser());
  }, []);

  const primaryMembership = user?.memberships?.[0];
  const school = primaryMembership?.school;
  const schoolId = school?.id;

  const loadAthletes = useCallback(async () => {
    if (!schoolId) return;

    setLoading(true);
    setError(null);

    const res = await apiRequest<SchoolAthlete[]>(`/schools/${schoolId}/athletes`);

    if (res.success && res.data) {
      setAthletes(res.data);
    } else {
      setAthletes([]);
      setError(res.error || "Unable to load student-athletes.");
    }

    setLoading(false);
  }, [schoolId]);

  useEffect(() => {
    if (schoolId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void loadAthletes();
    }
  }, [schoolId, loadAthletes]);

  const handleApprove = async (athlete: SchoolAthlete) => {
    if (!schoolId) return;

    if (
      !window.confirm(
        `Approve ${athlete.firstName} ${athlete.lastName} as a verified student-athlete for ${school?.name || "your school"}? This will activate their recruiting profile.`
      )
    ) {
      return;
    }

    setBusyId(athlete.id);
    setError(null);
    setNotice(null);

    const res = await apiRequest(`/schools/${schoolId}/athletes/${athlete.id}/approve`, {
      method: "POST",
    });

    setBusyId(null);

    if (res.success) {
      setNotice(`${athlete.firstName} ${athlete.lastName} has been approved and activated.`);
      await loadAthletes();
    } else {
      setError(res.error || "Unable to approve athlete.");
    }
  };

  const handleReject = async (athlete: SchoolAthlete) => {
    if (!schoolId) return;

    if (
      !window.confirm(
        `Deactivate ${athlete.firstName} ${athlete.lastName} from your active roster? Their recruiting portal access will be locked.`
      )
    ) {
      return;
    }

    setBusyId(athlete.id);
    setError(null);
    setNotice(null);

    const res = await apiRequest(`/schools/${schoolId}/athletes/${athlete.id}/reject`, {
      method: "POST",
    });

    setBusyId(null);

    if (res.success) {
      setNotice(`${athlete.firstName} ${athlete.lastName} has been deactivated.`);
      await loadAthletes();
    } else {
      setError(res.error || "Unable to update athlete status.");
    }
  };

  const calculateAge = (dobString: string | null): number | null => {
    if (!dobString) return null;
    const dob = new Date(dobString);
    if (isNaN(dob.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age;
  };

  const filteredAthletes = athletes.filter((a) => {
    const matchesSearch =
      search.trim() === "" ||
      `${a.firstName} ${a.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
      a.email.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === "" || a.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const pendingCount = athletes.filter((a) => a.status === "PENDING").length;

  const inputClass =
    "rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-[#102341] outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100";

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/80 text-blue-900 text-xs font-semibold uppercase tracking-wider mb-3">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            <span>School Athletic Roster & Verification</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#102341]">
            Student-Athlete Approvals
          </h1>
          <p className="text-xs sm:text-sm text-[#65748a] mt-1 leading-relaxed">
            Review, verify, and approve student-athletes who registered using your School ID (
            <span className="font-mono font-bold text-[#102341]">
              {school?.schoolId || "SCH-PENDING"}
            </span>
            ).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {pendingCount > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-left flex items-center gap-3">
              <Clock className="w-5 h-5 text-amber-600" />
              <div>
                <span className="block text-[10px] uppercase font-bold text-amber-800 tracking-wider">
                  PENDING APPROVAL
                </span>
                <span className="text-sm font-bold text-amber-900">
                  {pendingCount} {pendingCount === 1 ? "Athlete" : "Athletes"}
                </span>
              </div>
            </div>
          )}

          <div className="bg-[#f4f7fc] border border-slate-200/80 rounded-xl px-4 py-2.5 text-left">
            <span className="block text-[10px] uppercase font-bold text-slate-500 font-mono tracking-wider">
              TOTAL ROSTER
            </span>
            <span className="text-sm font-bold font-mono text-[#102341]">
              {athletes.length} Registered
            </span>
          </div>
        </div>
      </div>

      {/* Notifications */}
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

      {/* Filter / Search Bar */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search athlete by name or email"
                className={`${inputClass} pl-9 w-64`}
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as AthleteStatus | "")}
              className={inputClass}
            >
              <option value="">All statuses ({athletes.length})</option>
              <option value="PENDING">Pending Approval ({pendingCount})</option>
              <option value="ACTIVE">
                Active ({athletes.filter((a) => a.status === "ACTIVE").length})
              </option>
              <option value="INACTIVE">
                Inactive ({athletes.filter((a) => a.status === "INACTIVE").length})
              </option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => void loadAthletes()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-[#102341] text-xs font-bold disabled:opacity-60 cursor-pointer self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh Roster
          </button>
        </div>

        {/* Athlete Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#f4f7fc] text-[#65748a] uppercase font-bold tracking-wider text-[10px] border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Student-Athlete</th>
                <th className="px-4 py-3">Age / DOB</th>
                <th className="px-4 py-3">Sport & Grad Year</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Registered</th>
                <th className="px-6 py-3 text-right">Verification Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Loading athletes...
                  </td>
                </tr>
              ) : filteredAthletes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                    <GraduationCap className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700">No student-athletes found</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {statusFilter === "PENDING"
                        ? "There are no student-athletes currently pending approval."
                        : "Athletes who register using your School ID will appear here for verification."}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredAthletes.map((athlete) => {
                  const busy = busyId === athlete.id;
                  const age = calculateAge(athlete.dateOfBirth);

                  return (
                    <tr key={athlete.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-4">
                        <span className="block font-bold text-[#102341]">
                          {athlete.firstName} {athlete.lastName}
                        </span>
                        <span className="block text-[11px] text-[#65748a]">{athlete.email}</span>
                        {athlete.phone && (
                          <span className="block text-[10px] text-slate-400">{athlete.phone}</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {athlete.dateOfBirth ? (
                          <div>
                            <span className="font-semibold text-[#102341]">
                              {age !== null ? `${age} yrs old` : "—"}
                            </span>
                            <span className="block text-[10px] text-[#65748a]">
                              {new Date(athlete.dateOfBirth).toLocaleDateString()}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {athlete.athleteProfile ? (
                          <div>
                            <span className="font-semibold text-[#102341]">
                              {athlete.athleteProfile.primarySport}
                            </span>
                            <span className="block text-[10px] text-[#65748a]">
                              Class of {athlete.athleteProfile.graduationYear}
                              {athlete.athleteProfile.positions?.length > 0 &&
                                ` · ${athlete.athleteProfile.positions.join(", ")}`}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">
                            Profile building in progress
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider ${STATUS_STYLES[athlete.status]}`}
                        >
                          {athlete.status === "PENDING" ? "Pending Approval" : athlete.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-xs text-[#65748a]">
                        {new Date(athlete.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          {athlete.status === "PENDING" ? (
                            <>
                              <button
                                type="button"
                                onClick={() => void handleApprove(athlete)}
                                disabled={busy}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold disabled:opacity-60 cursor-pointer shadow-xs"
                              >
                                <UserCheck className="w-3.5 h-3.5" />
                                Approve Roster Spot
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleReject(athlete)}
                                disabled={busy}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-red-200 bg-red-50 hover:bg-red-100 text-red-800 text-[11px] font-bold disabled:opacity-60 cursor-pointer"
                              >
                                <UserX className="w-3.5 h-3.5" />
                                Reject
                              </button>
                            </>
                          ) : athlete.status === "ACTIVE" ? (
                            <button
                              type="button"
                              onClick={() => void handleReject(athlete)}
                              disabled={busy}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-bold disabled:opacity-60 cursor-pointer"
                            >
                              <UserX className="w-3.5 h-3.5" />
                              Deactivate
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => void handleApprove(athlete)}
                              disabled={busy}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold disabled:opacity-60 cursor-pointer"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              Re-activate
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

