"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  PauseCircle,
  RefreshCw,
  School,
  XCircle,
} from "lucide-react";
import { apiRequest } from "@/lib/api";

type SchoolStatus = "PENDING" | "APPROVED" | "SUSPENDED" | "REJECTED";
type Filter = "ALL" | SchoolStatus;
type Action = "approve" | "reject" | "suspend";

interface SchoolRow {
  id: string;
  schoolId: string | null;
  name: string;
  contactEmail: string;
  contactPhone: string | null;
  city: string | null;
  state: string | null;
  status: SchoolStatus;
  approvedAt: string | null;
  createdAt: string;
  _count?: { memberships: number };
}

const FILTERS: Filter[] = ["PENDING", "APPROVED", "SUSPENDED", "REJECTED", "ALL"];

const STATUS_STYLES: Record<SchoolStatus, string> = {
  PENDING: "bg-amber-50 text-amber-800 border-amber-200/80",
  APPROVED: "bg-emerald-50 text-emerald-800 border-emerald-200/80",
  SUSPENDED: "bg-slate-100 text-slate-700 border-slate-200",
  REJECTED: "bg-red-50 text-red-800 border-red-200/80",
};

export default function SchoolApprovalQueue() {
  const [schools, setSchools] = useState<SchoolRow[]>([]);
  const [filter, setFilter] = useState<Filter>("PENDING");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const query = filter === "ALL" ? "" : `?status=${filter}`;
    const res = await apiRequest<SchoolRow[]>(`/schools${query}`);

    if (res.success && res.data) {
      setSchools(res.data);
    } else {
      setSchools([]);
      setError(res.error || "Unable to load school registrations.");
    }

    setLoading(false);
  }, [filter]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const runAction = async (school: SchoolRow, action: Action) => {
    if (action === "reject" || action === "suspend") {
      const verb = action === "reject" ? "reject" : "suspend";
      if (!window.confirm(`Are you sure you want to ${verb} ${school.name}?`)) {
        return;
      }
    }

    setBusyId(school.id);
    setError(null);
    setNotice(null);

    const res = await apiRequest(`/schools/${school.id}/${action}`, {
      method: "POST",
    });

    setBusyId(null);

    if (res.success) {
      setNotice(res.message || "School updated successfully.");
      await load();
    } else {
      setError(res.error || "Unable to complete this action.");
    }
  };

  return (
    <section className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
      <div className="p-6 border-b border-slate-200/80 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200/80 text-amber-900 text-[10px] font-bold uppercase tracking-wider mb-2">
            <School className="w-3.5 h-3.5" />
            <span>Institutional Approval Workflow</span>
          </div>
          <h2 className="text-lg font-bold text-[#102341]">School Registration Queue</h2>
          <p className="text-xs text-[#65748a] mt-1">
            Approve registrations to issue a permanent School ID. Pending schools cannot access the portal.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {FILTERS.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={`px-3 py-1.5 rounded-full border text-[11px] font-bold tracking-wide transition-colors cursor-pointer ${
                filter === value
                  ? "bg-[#102341] text-white border-[#102341]"
                  : "bg-white text-[#65748a] border-slate-200 hover:bg-slate-50"
              }`}
            >
              {value}
            </button>
          ))}
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-[#102341] text-[11px] font-bold disabled:opacity-60 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="mx-6 mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-800">
          {error}
        </div>
      )}
      {notice && (
        <div className="mx-6 mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800">
          {notice}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200/80 text-[10px] uppercase tracking-wider text-slate-500">
              <th className="px-6 py-3 font-bold">Institution</th>
              <th className="px-4 py-3 font-bold">School ID</th>
              <th className="px-4 py-3 font-bold">Status</th>
              <th className="px-4 py-3 font-bold">Submitted</th>
              <th className="px-6 py-3 font-bold text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-xs text-[#65748a]">
                  Loading school registrations...
                </td>
              </tr>
            )}

            {!loading && schools.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-xs text-[#65748a]">
                  No schools found for this status.
                </td>
              </tr>
            )}

            {!loading &&
              schools.map((school) => {
                const busy = busyId === school.id;

                return (
                  <tr key={school.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-6 py-4">
                      <span className="block font-bold text-[#102341]">{school.name}</span>
                      <span className="block text-[11px] text-[#65748a]">{school.contactEmail}</span>
                      <span className="block text-[11px] text-[#65748a]">
                        {[school.city, school.state].filter(Boolean).join(", ") || "Address pending"}
                      </span>
                    </td>
                    <td className="px-4 py-4 font-mono text-xs font-bold text-[#102341]">
                      {school.schoolId || "—"}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider ${STATUS_STYLES[school.status]}`}
                      >
                        {school.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-xs text-[#65748a]">
                      {new Date(school.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        {(school.status === "PENDING" ||
                          school.status === "REJECTED" ||
                          school.status === "SUSPENDED") && (
                          <button
                            type="button"
                            onClick={() => void runAction(school, "approve")}
                            disabled={busy}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold disabled:opacity-60 cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {school.status === "SUSPENDED" ? "Reactivate" : "Approve"}
                          </button>
                        )}

                        {school.status === "PENDING" && (
                          <button
                            type="button"
                            onClick={() => void runAction(school, "reject")}
                            disabled={busy}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-red-200 bg-red-50 hover:bg-red-100 text-red-800 text-[11px] font-bold disabled:opacity-60 cursor-pointer"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Reject
                          </button>
                        )}

                        {school.status === "APPROVED" && (
                          <button
                            type="button"
                            onClick={() => void runAction(school, "suspend")}
                            disabled={busy}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-[11px] font-bold disabled:opacity-60 cursor-pointer"
                          >
                            <PauseCircle className="w-3.5 h-3.5" />
                            Suspend
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
