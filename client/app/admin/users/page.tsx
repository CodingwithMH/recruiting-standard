"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Mail,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  UserX,
} from "lucide-react";
import { apiRequest } from "@/lib/api";
import SiteLink from "@/components/ui/SiteLink";

type GlobalRole = "PLATFORM_ADMIN" | "SCHOOL_STAFF" | "ATHLETE" | "PARENT";
type UserStatus = "PENDING" | "ACTIVE" | "INACTIVE" | "SUSPENDED";

interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  dateOfBirth?: string | null;
  schoolId?: string | null;
  globalRole: GlobalRole;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
  memberships: Array<{
    id: string;
    role: "SCHOOL_ADMIN" | "COACH_RECRUITER";
    title: string | null;
    status: "ACTIVE" | "INVITED" | "REVOKED";
    school: {
      id: string;
      schoolId: string | null;
      name: string;
      status: "PENDING" | "APPROVED" | "SUSPENDED" | "REJECTED";
    };
  }>;
}

const ROLE_STYLES: Record<GlobalRole, string> = {
  PLATFORM_ADMIN: "bg-red-50 text-red-800 border-red-200/80",
  SCHOOL_STAFF: "bg-blue-50 text-blue-800 border-blue-200/80",
  ATHLETE: "bg-emerald-50 text-emerald-800 border-emerald-200/80",
  PARENT: "bg-violet-50 text-violet-800 border-violet-200/80",
};

const STATUS_STYLES: Record<UserStatus, string> = {
  PENDING: "bg-amber-50 text-amber-800 border-amber-200/80",
  ACTIVE: "bg-emerald-50 text-emerald-800 border-emerald-200/80",
  INACTIVE: "bg-slate-100 text-slate-700 border-slate-200",
  SUSPENDED: "bg-red-50 text-red-800 border-red-200/80",
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<GlobalRole | "">("");
  const [status, setStatus] = useState<UserStatus | "">("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (role) params.set("role", role);
    if (status) params.set("status", status);

    const query = params.toString();
    const res = await apiRequest<AdminUser[]>(`/users${query ? `?${query}` : ""}`);

    if (res.success && res.data) {
      setUsers(res.data);
    } else {
      setUsers([]);
      setError(res.error || "Unable to load users.");
    }

    setLoading(false);
  }, [search, role, status]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadUsers();
  }, [loadUsers]);

  const updateStatus = async (user: AdminUser, nextStatus: UserStatus) => {
    if (user.status === "PENDING" && nextStatus === "ACTIVE") {
      if (
        !window.confirm(
          `Approve and activate ${user.firstName} ${user.lastName} (${user.schoolId || "Athlete"})? This unlocks full portal access.`
        )
      ) {
        return;
      }
    } else if (
      nextStatus !== "ACTIVE" &&
      !window.confirm(
        `Set ${user.firstName} ${user.lastName}'s account status to ${nextStatus}? Their active sessions will be revoked.`
      )
    ) {
      return;
    }

    setBusyId(user.id);
    setError(null);
    setNotice(null);

    const res = await apiRequest(`/users/${user.id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: nextStatus }),
    });

    setBusyId(null);

    if (res.success) {
      setNotice(res.message || "User updated successfully.");
      await loadUsers();
    } else {
      setError(res.error || "Unable to update this user.");
    }
  };

  const sendReset = async (user: AdminUser) => {
    setBusyId(user.id);
    setError(null);
    setNotice(null);

    const res = await apiRequest(`/users/${user.id}/reset-password`, {
      method: "POST",
    });

    setBusyId(null);

    if (res.success) {
      setNotice(res.message || `Password reset link sent to ${user.email}.`);
    } else {
      setError(res.error || "Unable to send a password reset email.");
    }
  };

  const inputClass =
    "rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-[#102341] outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100";

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/80 text-blue-900 text-xs font-semibold uppercase tracking-wider mb-3">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            <span>Platform User Administration</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#102341]">
            Manage Platform Users
          </h1>
          <p className="text-xs sm:text-sm text-[#65748a] mt-1 leading-relaxed">
            Review all platform accounts, inspect school memberships, adjust account status,
            and trigger secure password reset emails.
          </p>
        </div>

        <div className="bg-[#f4f7fc] border border-slate-200/80 rounded-xl px-4 py-3 text-left">
          <span className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider">
            ACCOUNTS LOADED
          </span>
          <span className="text-sm font-bold font-mono text-[#102341]">{users.length}</span>
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
        <div className="p-6 border-b border-slate-200/80 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name or email"
                className={`${inputClass} pl-9 w-56`}
              />
            </div>

            <select
              value={role}
              onChange={(event) => setRole(event.target.value as GlobalRole | "")}
              className={inputClass}
            >
              <option value="">All roles</option>
              <option value="PLATFORM_ADMIN">Platform Admin</option>
              <option value="SCHOOL_STAFF">School Staff</option>
              <option value="ATHLETE">Athlete</option>
              <option value="PARENT">Parent / Guardian</option>
            </select>

            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as UserStatus | "")}
              className={inputClass}
            >
              <option value="">All statuses</option>
              <option value="PENDING">Pending Verification</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => void loadUsers()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-[#102341] text-[11px] font-bold disabled:opacity-60 cursor-pointer self-start"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200/80 text-[10px] uppercase tracking-wider text-slate-500">
                <th className="px-6 py-3 font-bold">User</th>
                <th className="px-4 py-3 font-bold">Role</th>
                <th className="px-4 py-3 font-bold">School</th>
                <th className="px-4 py-3 font-bold">Status</th>
                <th className="px-4 py-3 font-bold">Joined</th>
                <th className="px-6 py-3 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-xs text-[#65748a]">
                    Loading platform users...
                  </td>
                </tr>
              )}

              {!loading && users.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-xs text-[#65748a]">
                    No users match the current filters.
                  </td>
                </tr>
              )}

              {!loading &&
                users.map((user) => {
                  const busy = busyId === user.id;
                  const membership = user.memberships.find(
                    (item) => item.status === "ACTIVE"
                  );

                  return (
                    <tr key={user.id} className="border-b border-slate-100 last:border-0">
                      <td className="px-6 py-4">
                        <span className="block font-bold text-[#102341]">
                          {user.firstName} {user.lastName}
                        </span>
                        <span className="block text-[11px] text-[#65748a]">{user.email}</span>
                        {user.phone && (
                          <span className="block text-[10px] text-[#65748a]">{user.phone}</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider ${ROLE_STYLES[user.globalRole]}`}
                        >
                          {user.globalRole.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        {membership ? (
                          <div>
                            <SiteLink
                              href={`/admin/schools/${membership.school.id}`}
                              className="flex items-center gap-1.5 text-xs font-semibold text-[#102341] hover:text-blue-700 hover:underline"
                            >
                              <Building2 className="w-3.5 h-3.5 text-slate-400" />
                              {membership.school.name}
                            </SiteLink>
                            <span className="block text-[10px] font-mono text-[#65748a]">
                              {membership.school.schoolId || "Pending ID"} ·{" "}
                              {membership.role.replace("_", " ")}
                            </span>
                          </div>
                        ) : user.schoolId ? (
                          <div>
                            <span className="flex items-center gap-1.5 text-xs font-semibold text-[#102341]">
                              <Building2 className="w-3.5 h-3.5 text-blue-500" />
                              {user.schoolId}
                            </span>
                            {user.dateOfBirth && (
                              <span className="block text-[10px] text-[#65748a]">
                                DOB: {new Date(user.dateOfBirth).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">No school</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider ${STATUS_STYLES[user.status]}`}
                        >
                          {user.status === "PENDING" ? "Pending Approval" : user.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-xs text-[#65748a]">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          {user.status === "PENDING" ? (
                            <button
                              type="button"
                              onClick={() => void updateStatus(user, "ACTIVE")}
                              disabled={busy}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold disabled:opacity-60 cursor-pointer shadow-xs"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              Approve & Activate
                            </button>
                          ) : user.status !== "ACTIVE" ? (
                            <button
                              type="button"
                              onClick={() => void updateStatus(user, "ACTIVE")}
                              disabled={busy}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold disabled:opacity-60 cursor-pointer"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              Activate
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => void updateStatus(user, "SUSPENDED")}
                              disabled={busy}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-900 text-[11px] font-bold disabled:opacity-60 cursor-pointer"
                            >
                              <ShieldAlert className="w-3.5 h-3.5" />
                              Suspend
                            </button>
                          )}

                          {user.status === "ACTIVE" && (
                            <button
                              type="button"
                              onClick={() => void updateStatus(user, "INACTIVE")}
                              disabled={busy}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-bold disabled:opacity-60 cursor-pointer"
                            >
                              <UserX className="w-3.5 h-3.5" />
                              Deactivate
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => void sendReset(user)}
                            disabled={busy || user.status !== "ACTIVE"}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-[#102341] text-[11px] font-bold disabled:opacity-50 cursor-pointer"
                          >
                            <Mail className="w-3.5 h-3.5" />
                            Reset Email
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
