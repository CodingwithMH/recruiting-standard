"use client";

import { useEffect, useState } from "react";
import {
  Building2,
  CheckCircle2,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { apiRequest } from "@/lib/api";
import type { UserProfile } from "@/lib/api";
import { getStoredUser } from "@/lib/auth";

type SchoolStatus = "PENDING" | "APPROVED" | "SUSPENDED" | "REJECTED";
type MemberRole = "SCHOOL_ADMIN" | "COACH_RECRUITER";

interface SchoolProfile {
  id: string;
  schoolId: string | null;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  contactEmail: string;
  contactPhone: string | null;
  status: SchoolStatus;
  approvedAt: string | null;
}

interface SchoolMember {
  id: string;
  role: MemberRole;
  title: string | null;
  status: "ACTIVE" | "INVITED" | "REVOKED";
  createdAt: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    status: string;
  };
}

interface ProfileForm {
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  contactEmail: string;
  contactPhone: string;
}

interface InviteForm {
  email: string;
  firstName: string;
  lastName: string;
  role: MemberRole;
  title: string;
}

const EMPTY_PROFILE: ProfileForm = {
  name: "",
  address: "",
  city: "",
  state: "",
  zipCode: "",
  contactEmail: "",
  contactPhone: "",
};

const EMPTY_INVITE: InviteForm = {
  email: "",
  firstName: "",
  lastName: "",
  role: "COACH_RECRUITER",
  title: "",
};

const STATUS_STYLES: Record<SchoolStatus, string> = {
  PENDING: "bg-amber-50 text-amber-800 border-amber-200/80",
  APPROVED: "bg-emerald-50 text-emerald-800 border-emerald-200/80",
  SUSPENDED: "bg-slate-100 text-slate-700 border-slate-200",
  REJECTED: "bg-red-50 text-red-800 border-red-200/80",
};

export default function SchoolSettingsPage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [school, setSchool] = useState<SchoolProfile | null>(null);
  const [profile, setProfile] = useState<ProfileForm>(EMPTY_PROFILE);
  const [members, setMembers] = useState<SchoolMember[]>([]);
  const [invite, setInvite] = useState<InviteForm>(EMPTY_INVITE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [busyMemberId, setBusyMemberId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const membership = user?.memberships?.[0];
  const schoolId = membership?.school.id;
  const isAdmin = membership?.role === "SCHOOL_ADMIN";

  useEffect(() => {
    const current = getStoredUser();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUser(current);

    const currentMembership = current?.memberships?.[0];
    const currentSchoolId = currentMembership?.school.id;

    if (!current || !currentSchoolId) {
      setError("No school affiliation was found for this account.");
      setLoading(false);
      return;
    }

    const loadSchool = async () => {
      const schoolRes = await apiRequest<SchoolProfile>(
        `/schools/${currentSchoolId}`
      );

      if (!schoolRes.success || !schoolRes.data) {
        setError(schoolRes.error || "Unable to load the school profile.");
        setLoading(false);
        return;
      }

      const data = schoolRes.data;
      setSchool(data);
      setProfile({
        name: data.name || "",
        address: data.address || "",
        city: data.city || "",
        state: data.state || "",
        zipCode: data.zipCode || "",
        contactEmail: data.contactEmail || "",
        contactPhone: data.contactPhone || "",
      });

      if (currentMembership.role === "SCHOOL_ADMIN") {
        const membersRes = await apiRequest<SchoolMember[]>(
          `/schools/${currentSchoolId}/members`
        );

        if (membersRes.success && membersRes.data) {
          setMembers(membersRes.data);
        } else {
          setError(membersRes.error || "Unable to load school members.");
        }
      }

      setLoading(false);
    };

    void loadSchool();
  }, []);

  const reloadMembers = async () => {
    if (!schoolId || !isAdmin) return;

    const res = await apiRequest<SchoolMember[]>(`/schools/${schoolId}/members`);
    if (res.success && res.data) {
      setMembers(res.data);
    } else {
      setError(res.error || "Unable to load school members.");
    }
  };

  const handleProfileChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = event.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!schoolId) return;

    setSaving(true);
    setError(null);
    setNotice(null);

    const res = await apiRequest<SchoolProfile>(`/schools/${schoolId}`, {
      method: "PATCH",
      body: JSON.stringify(profile),
    });

    setSaving(false);

    if (res.success) {
      setSchool((prev) => (prev ? { ...prev, ...profile } : prev));
      setNotice(res.message || "School profile updated.");
    } else {
      setError(res.error || "Unable to update the school profile.");
    }
  };

  const handleInviteChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target;
    setInvite((prev) => ({ ...prev, [name]: value }));
  };

  const handleInvite = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!schoolId) return;

    setInviting(true);
    setError(null);
    setNotice(null);

    const res = await apiRequest(`/schools/${schoolId}/members`, {
      method: "POST",
      body: JSON.stringify(invite),
    });

    setInviting(false);

    if (res.success) {
      setNotice(res.message || "Member added successfully.");
      setInvite(EMPTY_INVITE);
      await reloadMembers();
    } else {
      setError(res.error || "Unable to add this member.");
    }
  };

  const handleRoleChange = async (member: SchoolMember, role: MemberRole) => {
    if (!schoolId) return;

    setBusyMemberId(member.id);
    setError(null);
    setNotice(null);

    const res = await apiRequest(
      `/schools/${schoolId}/members/${member.id}`,
      { method: "PATCH", body: JSON.stringify({ role }) }
    );

    setBusyMemberId(null);

    if (res.success) {
      setNotice(res.message || "Membership updated.");
      await reloadMembers();
    } else {
      setError(res.error || "Unable to update this membership.");
    }
  };

  const handleRemove = async (member: SchoolMember) => {
    if (!schoolId) return;
    if (
      !window.confirm(
        `Remove ${member.user.firstName} ${member.user.lastName} from this school?`
      )
    ) {
      return;
    }

    setBusyMemberId(member.id);
    setError(null);
    setNotice(null);

    const res = await apiRequest(
      `/schools/${schoolId}/members/${member.id}`,
      { method: "DELETE" }
    );

    setBusyMemberId(null);

    if (res.success) {
      setNotice(res.message || "Member removed.");
      await reloadMembers();
    } else {
      setError(res.error || "Unable to remove this member.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-[#102341] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold text-[#65748a] tracking-wide">
            Loading school profile...
          </p>
        </div>
      </div>
    );
  }

  if (!schoolId || !school) {
    return (
      <div className="bg-white rounded-2xl border border-red-200 bg-red-50/50 p-6">
        <h1 className="text-lg font-bold text-[#102341]">School profile unavailable</h1>
        <p className="text-xs text-[#65748a] mt-1">
          {error || "No school affiliation was found for this account."}
        </p>
      </div>
    );
  }

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-[#102341] outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-500";

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/80 text-blue-900 text-xs font-semibold uppercase tracking-wider mb-3">
            <Building2 className="w-3.5 h-3.5 text-blue-600" />
            <span>Institution Administration</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#102341]">
            School Profile & Authorized Users
          </h1>
          <p className="text-xs sm:text-sm text-[#65748a] mt-1">
            {isAdmin
              ? "Update institutional details and manage who can access your recruiting portal."
              : "View your institution's details. Only School Admins can make changes."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-[#f4f7fc] border border-slate-200/80 rounded-xl px-4 py-2.5 text-left">
            <span className="block text-[10px] uppercase font-bold text-slate-500 font-mono tracking-wider">
              PERMANENT SCHOOL ID
            </span>
            <span className="text-sm font-bold font-mono text-[#102341]">
              {school.schoolId || "SCH-PENDING"}
            </span>
          </div>
          <span
            className={`inline-flex px-3 py-1.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${STATUS_STYLES[school.status]}`}
          >
            {school.status}
          </span>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-800">
          {error}
        </div>
      )}
      {notice && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800">
          {notice}
        </div>
      )}

      <form
        onSubmit={handleSaveProfile}
        className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6 sm:p-8 space-y-5"
      >
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-base font-bold text-[#102341]">Institutional Details</h2>
          {isAdmin && (
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#102341] hover:bg-[#1b3556] text-white text-xs font-bold disabled:opacity-60 cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {saving ? "Saving..." : "Save Changes"}
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="space-y-1.5 md:col-span-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              School Name
            </span>
            <input
              name="name"
              value={profile.name}
              onChange={handleProfileChange}
              disabled={!isAdmin}
              required
              className={inputClass}
            />
          </label>

          <label className="space-y-1.5 md:col-span-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Street Address
            </span>
            <input
              name="address"
              value={profile.address}
              onChange={handleProfileChange}
              disabled={!isAdmin}
              required
              className={inputClass}
            />
          </label>

          <label className="space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              City
            </span>
            <input
              name="city"
              value={profile.city}
              onChange={handleProfileChange}
              disabled={!isAdmin}
              required
              className={inputClass}
            />
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label className="space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                State
              </span>
              <input
                name="state"
                value={profile.state}
                onChange={handleProfileChange}
                disabled={!isAdmin}
                required
                className={inputClass}
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Zip / Postal
              </span>
              <input
                name="zipCode"
                value={profile.zipCode}
                onChange={handleProfileChange}
                disabled={!isAdmin}
                required
                className={inputClass}
              />
            </label>
          </div>

          <label className="space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Institutional Email
            </span>
            <input
              type="email"
              name="contactEmail"
              value={profile.contactEmail}
              onChange={handleProfileChange}
              disabled={!isAdmin}
              required
              className={inputClass}
            />
          </label>

          <label className="space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Contact Phone
            </span>
            <input
              name="contactPhone"
              value={profile.contactPhone}
              onChange={handleProfileChange}
              disabled={!isAdmin}
              required
              className={inputClass}
            />
          </label>
        </div>
      </form>

      {isAdmin && (
        <>
          <form
            onSubmit={handleInvite}
            className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6 sm:p-8 space-y-5"
          >
            <div className="flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-blue-600" />
              <h2 className="text-base font-bold text-[#102341]">Add Authorized User</h2>
            </div>
            <p className="text-xs text-[#65748a]">
              New accounts receive a secure password setup email. Existing school accounts are added directly.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Email
                </span>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    name="email"
                    value={invite.email}
                    onChange={handleInviteChange}
                    required
                    className={`${inputClass} pl-9`}
                  />
                </div>
              </label>

              <label className="space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Role
                </span>
                <select
                  name="role"
                  value={invite.role}
                  onChange={handleInviteChange}
                  className={inputClass}
                >
                  <option value="COACH_RECRUITER">Coach / Recruiter</option>
                  <option value="SCHOOL_ADMIN">School Admin</option>
                </select>
              </label>

              <label className="space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  First Name
                </span>
                <input
                  name="firstName"
                  value={invite.firstName}
                  onChange={handleInviteChange}
                  required
                  className={inputClass}
                />
              </label>

              <label className="space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Last Name
                </span>
                <input
                  name="lastName"
                  value={invite.lastName}
                  onChange={handleInviteChange}
                  required
                  className={inputClass}
                />
              </label>

              <label className="space-y-1.5 md:col-span-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Title (optional)
                </span>
                <input
                  name="title"
                  value={invite.title}
                  onChange={handleInviteChange}
                  placeholder="e.g. Head Football Coach"
                  className={inputClass}
                />
              </label>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={inviting}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold disabled:opacity-60 cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                {inviting ? "Adding..." : "Add Member"}
              </button>
            </div>
          </form>

          <section className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
            <div className="p-6 border-b border-slate-200/80 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                <h2 className="text-base font-bold text-[#102341]">Authorized Users</h2>
                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 rounded-full px-2 py-0.5">
                  {members.length}
                </span>
              </div>
              <button
                type="button"
                onClick={() => void reloadMembers()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-[#102341] text-[11px] font-bold cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Refresh
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200/80 text-[10px] uppercase tracking-wider text-slate-500">
                    <th className="px-6 py-3 font-bold">Member</th>
                    <th className="px-4 py-3 font-bold">Role</th>
                    <th className="px-4 py-3 font-bold">Title</th>
                    <th className="px-6 py-3 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {members.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-10 text-center text-xs text-[#65748a]">
                        No authorized users yet.
                      </td>
                    </tr>
                  )}

                  {members.map((member) => {
                    const busy = busyMemberId === member.id;

                    return (
                      <tr key={member.id} className="border-b border-slate-100 last:border-0">
                        <td className="px-6 py-4">
                          <span className="block font-bold text-[#102341]">
                            {member.user.firstName} {member.user.lastName}
                          </span>
                          <span className="block text-[11px] text-[#65748a]">
                            {member.user.email}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <select
                            value={member.role}
                            onChange={(event) =>
                              void handleRoleChange(
                                member,
                                event.target.value as MemberRole
                              )
                            }
                            disabled={busy}
                            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-[#102341] disabled:opacity-60"
                          >
                            <option value="SCHOOL_ADMIN">School Admin</option>
                            <option value="COACH_RECRUITER">Coach / Recruiter</option>
                          </select>
                        </td>
                        <td className="px-4 py-4 text-xs text-[#65748a]">
                          {member.title || "—"}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => void handleRemove(member)}
                            disabled={busy}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-red-200 bg-red-50 hover:bg-red-100 text-red-800 text-[11px] font-bold disabled:opacity-60 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Remove
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200/90 p-4 flex items-center gap-3">
          <MapPin className="w-4 h-4 text-blue-600" />
          <span className="text-xs text-[#65748a]">
            {[school.city, school.state].filter(Boolean).join(", ") || "Location pending"}
          </span>
        </div>
        <div className="bg-white rounded-xl border border-slate-200/90 p-4 flex items-center gap-3">
          <Mail className="w-4 h-4 text-blue-600" />
          <span className="text-xs text-[#65748a] truncate">{school.contactEmail}</span>
        </div>
        <div className="bg-white rounded-xl border border-slate-200/90 p-4 flex items-center gap-3">
          <Phone className="w-4 h-4 text-blue-600" />
          <span className="text-xs text-[#65748a]">{school.contactPhone || "Phone pending"}</span>
        </div>
      </div>
    </div>
  );
}
