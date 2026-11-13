"use client";

import { useCallback, useEffect, useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertCircle,
  BadgeCheck,
  Building2,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Clock,
  ExternalLink,
  GraduationCap,
  Lock,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Plus,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Tag,
  Trash2,
  Trophy,
  User,
  Users,
  X,
} from "lucide-react";
import { apiRequest } from "@/lib/api";
import SiteLink from "@/components/ui/SiteLink";

export type RecruitingStatus =
  | "EVALUATING"
  | "CONTACTED"
  | "OFFERED"
  | "COMMITTED"
  | "PASSED";

export interface ContactLogItem {
  id: string;
  date: string;
  type: string;
  notes?: string;
  coachName?: string;
}

export interface OfferItem {
  id: string;
  date: string;
  type: string;
  details?: string;
  status?: string;
}

export interface CommitmentInfo {
  committedDate?: string;
  details?: string;
  transferStatus?: string;
  transferDetails?: string;
}

export interface RecordAthlete {
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
  highlightLinks: string[];
  verificationStatus: string;
  completionPercentage: number;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    highlightVideos?: Array<{
      id: string;
      title: string;
      videoUrl: string;
      provider: string;
    }>;
  };
}

export interface RecruitingRecord {
  id: string;
  status: RecruitingStatus;
  privateNotes: string | null;
  lastContactAt: string | null;
  contactLogs: ContactLogItem[];
  offers: OfferItem[];
  commitments: CommitmentInfo | null;
  createdAt: string;
  updatedAt: string;
  athleteProfile: RecordAthlete;
}

const STATUS_CONFIG: Record<
  RecruitingStatus,
  { label: string; bg: string; text: string; border: string }
> = {
  EVALUATING: {
    label: "Evaluating",
    bg: "bg-blue-50",
    text: "text-blue-800",
    border: "border-blue-200",
  },
  CONTACTED: {
    label: "Contacted",
    bg: "bg-amber-50",
    text: "text-amber-800",
    border: "border-amber-200",
  },
  OFFERED: {
    label: "Offered",
    bg: "bg-purple-50",
    text: "text-purple-800",
    border: "border-purple-200",
  },
  COMMITTED: {
    label: "Committed",
    bg: "bg-emerald-50",
    text: "text-emerald-800",
    border: "border-emerald-200",
  },
  PASSED: {
    label: "Passed",
    bg: "bg-slate-100",
    text: "text-slate-700",
    border: "border-slate-200",
  },
};

function formatHeight(inches: number | null): string | null {
  if (!inches) return null;
  const feet = Math.floor(inches / 12);
  const remaining = inches % 12;
  return `${feet}'${remaining}"`;
}

function formatDate(val?: string | null): string {
  if (!val) return "—";
  const parsed = new Date(val);
  return isNaN(parsed.getTime())
    ? "—"
    : parsed.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
}

function RecruitingRecordsContent() {
  const searchParams = useSearchParams();
  const initialAthleteId = searchParams.get("athleteId");

  const [records, setRecords] = useState<RecruitingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<RecruitingStatus | "ALL">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const [activeRecord, setActiveRecord] = useState<RecruitingRecord | null>(null);
  const [activeTab, setActiveTab] = useState<
    "overview" | "notes" | "contacts" | "offers" | "commitment"
  >("overview");

  // Form states inside active drawer
  const [draftNotes, setDraftNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // New Contact Log form
  const [showAddContact, setShowAddContact] = useState(false);
  const [contactDate, setContactDate] = useState(new Date().toISOString().split("T")[0]);
  const [contactType, setContactType] = useState("Phone Call");
  const [contactCoach, setContactCoach] = useState("");
  const [contactNotes, setContactNotes] = useState("");

  // New Offer form
  const [showAddOffer, setShowAddOffer] = useState(false);
  const [offerDate, setOfferDate] = useState(new Date().toISOString().split("T")[0]);
  const [offerType, setOfferType] = useState("Full Scholarship");
  const [offerStatus, setOfferStatus] = useState("Offered");
  const [offerDetails, setOfferDetails] = useState("");

  // Commitment / Transfer form
  const [commitmentDate, setCommitmentDate] = useState("");
  const [commitmentDetails, setCommitmentDetails] = useState("");
  const [transferStatus, setTransferStatus] = useState("");
  const [transferDetails, setTransferDetails] = useState("");
  const [savingCommitment, setSavingCommitment] = useState(false);

  const [removingId, setRemovingId] = useState<string | null>(null);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    setError(null);

    const query = statusFilter !== "ALL" ? `?status=${statusFilter}` : "";
    const res = await apiRequest<RecruitingRecord[]>(`/coach/records${query}`);

    if (res.success && res.data) {
      setRecords(res.data);
    } else {
      setRecords([]);
      setError(res.error || "Unable to load recruiting records.");
    }

    setLoading(false);
  }, [statusFilter]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadRecords();
  }, [loadRecords]);

  // Handle direct navigation via ?athleteId=...
  useEffect(() => {
    if (!initialAthleteId) return;

    async function loadDirectAthlete() {
      const res = await apiRequest<RecruitingRecord>(`/coach/records/${initialAthleteId}`);
      if (res.success && res.data) {
        setActiveRecord(res.data);
        setDraftNotes(res.data.privateNotes || "");
        if (res.data.commitments) {
          setCommitmentDate(res.data.commitments.committedDate || "");
          setCommitmentDetails(res.data.commitments.details || "");
          setTransferStatus(res.data.commitments.transferStatus || "");
          setTransferDetails(res.data.commitments.transferDetails || "");
        }
        // Also refresh list so it appears in the table
        void loadRecords();
      }
    }

    void loadDirectAthlete();
  }, [initialAthleteId, loadRecords]);

  const handleOpenRecord = (rec: RecruitingRecord) => {
    setActiveRecord(rec);
    setDraftNotes(rec.privateNotes || "");
    if (rec.commitments) {
      setCommitmentDate(rec.commitments.committedDate || "");
      setCommitmentDetails(rec.commitments.details || "");
      setTransferStatus(rec.commitments.transferStatus || "");
      setTransferDetails(rec.commitments.transferDetails || "");
    } else {
      setCommitmentDate("");
      setCommitmentDetails("");
      setTransferStatus("");
      setTransferDetails("");
    }
    setActiveTab("overview");
  };

  const handleStatusChange = async (newStatus: RecruitingStatus) => {
    if (!activeRecord) return;
    setUpdatingStatus(true);
    setError(null);

    const res = await apiRequest<RecruitingRecord>(`/coach/records/${activeRecord.id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: newStatus }),
    });

    setUpdatingStatus(false);

    if (res.success && res.data) {
      setActiveRecord(res.data);
      setNotice(`Recruiting status updated to ${STATUS_CONFIG[newStatus].label}.`);
      setRecords((prev) => prev.map((r) => (r.id === res.data!.id ? res.data! : r)));
    } else {
      setError(res.error || "Failed to update recruiting status.");
    }
  };

  const handleSaveNotes = async () => {
    if (!activeRecord) return;
    setSavingNotes(true);
    setError(null);
    setNotice(null);

    const res = await apiRequest<RecruitingRecord>(`/coach/records/${activeRecord.id}`, {
      method: "PATCH",
      body: JSON.stringify({ privateNotes: draftNotes }),
    });

    setSavingNotes(false);

    if (res.success && res.data) {
      setActiveRecord(res.data);
      setNotice("School-private notes saved securely.");
      setRecords((prev) => prev.map((r) => (r.id === res.data!.id ? res.data! : r)));
    } else {
      setError(res.error || "Failed to save private notes.");
    }
  };

  const handleAddContactLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRecord) return;

    const newLog: ContactLogItem = {
      id: crypto.randomUUID(),
      date: contactDate,
      type: contactType,
      coachName: contactCoach.trim() || undefined,
      notes: contactNotes.trim() || undefined,
    };

    const updatedLogs = [newLog, ...(activeRecord.contactLogs || [])];

    const res = await apiRequest<RecruitingRecord>(`/coach/records/${activeRecord.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        contactLogs: updatedLogs,
        lastContactAt: new Date(contactDate).toISOString(),
        ...(activeRecord.status === "EVALUATING" ? { status: "CONTACTED" } : {}),
      }),
    });

    if (res.success && res.data) {
      setActiveRecord(res.data);
      setNotice("Contact log recorded.");
      setRecords((prev) => prev.map((r) => (r.id === res.data!.id ? res.data! : r)));
      setShowAddContact(false);
      setContactNotes("");
    } else {
      setError(res.error || "Failed to record contact log.");
    }
  };

  const handleDeleteContactLog = async (logId: string) => {
    if (!activeRecord) return;

    const updatedLogs = (activeRecord.contactLogs || []).filter((l) => l.id !== logId);

    const res = await apiRequest<RecruitingRecord>(`/coach/records/${activeRecord.id}`, {
      method: "PATCH",
      body: JSON.stringify({ contactLogs: updatedLogs }),
    });

    if (res.success && res.data) {
      setActiveRecord(res.data);
      setNotice("Contact entry removed.");
      setRecords((prev) => prev.map((r) => (r.id === res.data!.id ? res.data! : r)));
    } else {
      setError(res.error || "Failed to delete contact entry.");
    }
  };

  const handleAddOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRecord) return;

    const newOffer: OfferItem = {
      id: crypto.randomUUID(),
      date: offerDate,
      type: offerType,
      status: offerStatus,
      details: offerDetails.trim() || undefined,
    };

    const updatedOffers = [newOffer, ...(activeRecord.offers || [])];

    const res = await apiRequest<RecruitingRecord>(`/coach/records/${activeRecord.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        offers: updatedOffers,
        ...(activeRecord.status === "EVALUATING" || activeRecord.status === "CONTACTED"
          ? { status: "OFFERED" }
          : {}),
      }),
    });

    if (res.success && res.data) {
      setActiveRecord(res.data);
      setNotice("Scholarship offer recorded.");
      setRecords((prev) => prev.map((r) => (r.id === res.data!.id ? res.data! : r)));
      setShowAddOffer(false);
      setOfferDetails("");
    } else {
      setError(res.error || "Failed to record offer.");
    }
  };

  const handleDeleteOffer = async (offerId: string) => {
    if (!activeRecord) return;

    const updatedOffers = (activeRecord.offers || []).filter((o) => o.id !== offerId);

    const res = await apiRequest<RecruitingRecord>(`/coach/records/${activeRecord.id}`, {
      method: "PATCH",
      body: JSON.stringify({ offers: updatedOffers }),
    });

    if (res.success && res.data) {
      setActiveRecord(res.data);
      setNotice("Offer entry removed.");
      setRecords((prev) => prev.map((r) => (r.id === res.data!.id ? res.data! : r)));
    } else {
      setError(res.error || "Failed to delete offer entry.");
    }
  };

  const handleSaveCommitment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRecord) return;
    setSavingCommitment(true);
    setError(null);

    const commitmentPayload: CommitmentInfo = {
      committedDate: commitmentDate || undefined,
      details: commitmentDetails.trim() || undefined,
      transferStatus: transferStatus.trim() || undefined,
      transferDetails: transferDetails.trim() || undefined,
    };

    const res = await apiRequest<RecruitingRecord>(`/coach/records/${activeRecord.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        commitments: commitmentPayload,
        ...(commitmentDate ? { status: "COMMITTED" } : {}),
      }),
    });

    setSavingCommitment(false);

    if (res.success && res.data) {
      setActiveRecord(res.data);
      setNotice("Commitment & transfer records updated.");
      setRecords((prev) => prev.map((r) => (r.id === res.data!.id ? res.data! : r)));
    } else {
      setError(res.error || "Failed to save commitment records.");
    }
  };

  const handleRemoveRecord = async (recordId: string) => {
    if (!confirm("Are you sure you want to remove this athlete from your recruiting records board?")) {
      return;
    }

    setRemovingId(recordId);
    setError(null);

    const res = await apiRequest(`/coach/records/${recordId}`, {
      method: "DELETE",
    });

    setRemovingId(null);

    if (res.success) {
      setNotice("Recruiting record removed from your board.");
      setRecords((prev) => prev.filter((r) => r.id !== recordId));
      if (activeRecord?.id === recordId) {
        setActiveRecord(null);
      }
    } else {
      setError(res.error || "Failed to remove recruiting record.");
    }
  };

  // Filtered list
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const athlete = r.athleteProfile;
      const fullName = `${athlete.user.firstName} ${athlete.user.lastName}`.toLowerCase();
      const sport = (athlete.primarySport || "").toLowerCase();
      const hs = (athlete.highSchoolName || "").toLowerCase();
      const query = searchQuery.trim().toLowerCase();

      if (!query) return true;
      return (
        fullName.includes(query) ||
        sport.includes(query) ||
        hs.includes(query) ||
        athlete.graduationYear.toString().includes(query)
      );
    });
  }, [records, searchQuery]);

  // Counts
  const counts = useMemo(() => {
    const total = records.length;
    const evaluating = records.filter((r) => r.status === "EVALUATING").length;
    const contacted = records.filter((r) => r.status === "CONTACTED").length;
    const offered = records.filter((r) => r.status === "OFFERED").length;
    const committed = records.filter((r) => r.status === "COMMITTED").length;
    const passed = records.filter((r) => r.status === "PASSED").length;
    return { total, evaluating, contacted, offered, committed, passed };
  }, [records]);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/90 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 border border-purple-200/80 text-purple-900 text-xs font-semibold uppercase tracking-wider mb-2">
              <Lock className="w-3.5 h-3.5 text-purple-600" />
              <span>School-Private & Confidential</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#102341]">
              Institutional Recruiting Records
            </h1>
            <p className="text-xs sm:text-sm text-[#65748a] mt-1">
              Private evaluations, contact logs, scholarship offers, and commitments. Restricted strictly to authorized staff at your institution.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <SiteLink
              href="/portal/search"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-[#102341] text-xs font-bold transition-colors"
            >
              <Search className="w-3.5 h-3.5 text-blue-600" />
              <span>Find More Athletes</span>
            </SiteLink>
            <button
              type="button"
              onClick={() => void loadRecords()}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-[#102341] text-xs font-bold transition-colors cursor-pointer disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* Pipeline Summary Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-6 border-t border-slate-100">
          <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-3">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
              TOTAL RECORDS
            </span>
            <span className="text-lg font-bold text-[#102341]">{counts.total}</span>
          </div>
          <div className="bg-blue-50/50 border border-blue-200/70 rounded-xl p-3">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-blue-700 font-mono">
              EVALUATING
            </span>
            <span className="text-lg font-bold text-blue-900">{counts.evaluating}</span>
          </div>
          <div className="bg-amber-50/50 border border-amber-200/70 rounded-xl p-3">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-amber-700 font-mono">
              CONTACTED
            </span>
            <span className="text-lg font-bold text-amber-900">{counts.contacted}</span>
          </div>
          <div className="bg-purple-50/50 border border-purple-200/70 rounded-xl p-3">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-purple-700 font-mono">
              OFFERED
            </span>
            <span className="text-lg font-bold text-purple-900">{counts.offered}</span>
          </div>
          <div className="bg-emerald-50/50 border border-emerald-200/70 rounded-xl p-3">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-emerald-700 font-mono">
              COMMITTED
            </span>
            <span className="text-lg font-bold text-emerald-900">{counts.committed}</span>
          </div>
          <div className="bg-slate-100/60 border border-slate-200/70 rounded-xl p-3">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
              PASSED
            </span>
            <span className="text-lg font-bold text-slate-700">{counts.passed}</span>
          </div>
        </div>
      </div>

      {/* Notifications */}
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

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {(["ALL", "EVALUATING", "CONTACTED", "OFFERED", "COMMITTED", "PASSED"] as const).map(
            (status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition cursor-pointer shrink-0 ${
                  statusFilter === status
                    ? "bg-[#102341] text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {status === "ALL" ? "All Records" : STATUS_CONFIG[status].label}
              </button>
            )
          )}
        </div>

        <div className="relative min-w-[240px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by athlete, sport, or year…"
            className="w-full pl-9 pr-3 py-1.5 rounded-full border border-slate-200 text-xs text-[#102341] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>
      </div>

      {/* Records Table / List */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        {loading && (
          <div className="p-12 text-center text-xs text-[#65748a] flex flex-col items-center justify-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
            <span>Loading institutional recruiting records…</span>
          </div>
        )}

        {!loading && filteredRecords.length === 0 && (
          <div className="p-12 text-center text-xs text-[#65748a] space-y-3">
            <ClipboardList className="w-8 h-8 mx-auto text-slate-300" />
            <p className="font-semibold text-sm text-[#102341]">
              No recruiting records match this filter
            </p>
            <p className="max-w-md mx-auto text-slate-400">
              Add athletes from Talent Search or Saved Prospects to begin tracking private evaluations, offers, and contacts.
            </p>
            <SiteLink
              href="/portal/search"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#102341] hover:bg-[#1d3d68] text-white text-xs font-bold transition-colors"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Browse Approved Athletes</span>
            </SiteLink>
          </div>
        )}

        {!loading && filteredRecords.length > 0 && (
          <div className="divide-y divide-slate-100">
            {filteredRecords.map((record) => {
              const athlete = record.athleteProfile;
              const cfg = STATUS_CONFIG[record.status] || STATUS_CONFIG.EVALUATING;
              const height = formatHeight(athlete.heightInches);

              return (
                <div
                  key={record.id}
                  className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-slate-50/70 transition"
                >
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-[#102341] text-sm">
                        {athlete.user.firstName} {athlete.user.lastName}
                      </span>
                      {athlete.verificationStatus === "APPROVED" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-800 text-[10px] font-bold">
                          <BadgeCheck className="w-3 h-3" />
                          Verified
                        </span>
                      )}
                      <span
                        className={`inline-flex px-2.5 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${cfg.bg} ${cfg.text} ${cfg.border}`}
                      >
                        {cfg.label}
                      </span>
                      {record.commitments?.committedDate && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-purple-200 bg-purple-50 text-purple-800 text-[10px] font-bold">
                          <Trophy className="w-3 h-3" />
                          Committed {formatDate(record.commitments.committedDate)}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#65748a]">
                      <span className="font-semibold text-blue-900">
                        {athlete.primarySport} · Class of {athlete.graduationYear}
                      </span>
                      {athlete.positions?.length > 0 && (
                        <span>({athlete.positions.join(", ")})</span>
                      )}
                      {athlete.highSchoolName && (
                        <span>· {athlete.highSchoolName}</span>
                      )}
                      {(athlete.city || athlete.state) && (
                        <span>
                          · {[athlete.city, athlete.state].filter(Boolean).join(", ")}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500 pt-1">
                      {athlete.gpa !== null && (
                        <span>GPA: <strong>{athlete.gpa.toFixed(2)}</strong></span>
                      )}
                      {height && <span>Height: <strong>{height}</strong></span>}
                      {athlete.weightLbs && (
                        <span>Weight: <strong>{athlete.weightLbs} lbs</strong></span>
                      )}
                      <span>
                        Contacts logged:{" "}
                        <strong className="text-[#102341]">
                          {record.contactLogs?.length || 0}
                        </strong>
                      </span>
                      <span>
                        Offers:{" "}
                        <strong className="text-purple-700">
                          {record.offers?.length || 0}
                        </strong>
                      </span>
                      {record.lastContactAt && (
                        <span>
                          Last contact: <strong>{formatDate(record.lastContactAt)}</strong>
                        </span>
                      )}
                    </div>

                    {record.privateNotes && (
                      <p className="text-[11px] text-slate-600 bg-amber-50/40 border border-amber-200/50 rounded-lg p-2 mt-2 max-w-2xl line-clamp-2">
                        <span className="font-bold text-amber-900">Private Note: </span>
                        {record.privateNotes}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 self-start lg:self-center shrink-0">
                    <button
                      type="button"
                      onClick={() => handleOpenRecord(record)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#102341] hover:bg-[#1d3d68] text-white text-xs font-bold transition cursor-pointer shadow-xs"
                    >
                      <ClipboardList className="w-3.5 h-3.5" />
                      <span>Manage Record</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleRemoveRecord(record.id)}
                      disabled={removingId === record.id}
                      className="p-2 rounded-full border border-slate-200 hover:bg-red-50 hover:border-red-200 text-slate-400 hover:text-red-700 transition cursor-pointer"
                      title="Remove from board"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal / Drawer for Managing Selected Record */}
      {activeRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-200 flex items-center justify-between gap-4 bg-slate-50/50">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-[#102341]">
                    {activeRecord.athleteProfile.user.firstName}{" "}
                    {activeRecord.athleteProfile.user.lastName}
                  </h2>
                  <span
                    className={`inline-flex px-2.5 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${
                      STATUS_CONFIG[activeRecord.status].bg
                    } ${STATUS_CONFIG[activeRecord.status].text} ${
                      STATUS_CONFIG[activeRecord.status].border
                    }`}
                  >
                    {STATUS_CONFIG[activeRecord.status].label}
                  </span>
                </div>
                <p className="text-xs text-[#65748a] mt-0.5">
                  {activeRecord.athleteProfile.primarySport} · Class of{" "}
                  {activeRecord.athleteProfile.graduationYear} ·{" "}
                  {activeRecord.athleteProfile.highSchoolName || "High School"}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActiveRecord(null)}
                className="p-2 rounded-full border border-slate-200 hover:bg-slate-100 text-slate-500 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="px-6 border-b border-slate-200 flex items-center gap-2 overflow-x-auto text-xs font-bold">
              {[
                { id: "overview", label: "Overview & Status" },
                { id: "notes", label: "Private Evaluation Notes" },
                {
                  id: "contacts",
                  label: `Contact Logs (${activeRecord.contactLogs?.length || 0})`,
                },
                {
                  id: "offers",
                  label: `Offers (${activeRecord.offers?.length || 0})`,
                },
                { id: "commitment", label: "Commitment & Transfer" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as never)}
                  className={`py-3 px-3 border-b-2 font-bold cursor-pointer transition whitespace-nowrap ${
                    activeTab === tab.id
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Contents */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {/* TAB 1: OVERVIEW & STATUS */}
              {activeTab === "overview" && (
                <div className="space-y-6">
                  {/* Status Picker */}
                  <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200/80 space-y-3">
                    <span className="block text-xs font-bold text-[#102341] uppercase tracking-wider">
                      Recruiting Pipeline Status
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      {(
                        [
                          "EVALUATING",
                          "CONTACTED",
                          "OFFERED",
                          "COMMITTED",
                          "PASSED",
                        ] as const
                      ).map((st) => (
                        <button
                          key={st}
                          type="button"
                          disabled={updatingStatus}
                          onClick={() => void handleStatusChange(st)}
                          className={`py-2 px-3 rounded-xl border text-xs font-bold transition cursor-pointer text-center ${
                            activeRecord.status === st
                              ? `${STATUS_CONFIG[st].bg} ${STATUS_CONFIG[st].text} ${STATUS_CONFIG[st].border} ring-2 ring-blue-500 shadow-xs`
                              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          {STATUS_CONFIG[st].label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Athlete Key Stats */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 bg-white border border-slate-200 rounded-xl">
                      <span className="block text-[10px] text-slate-400 font-mono">GPA</span>
                      <strong className="text-sm text-[#102341]">
                        {activeRecord.athleteProfile.gpa !== null
                          ? activeRecord.athleteProfile.gpa.toFixed(2)
                          : "—"}
                      </strong>
                    </div>
                    <div className="p-3 bg-white border border-slate-200 rounded-xl">
                      <span className="block text-[10px] text-slate-400 font-mono">ACT / SAT</span>
                      <strong className="text-sm text-[#102341]">
                        {activeRecord.athleteProfile.actScore ?? "—"} /{" "}
                        {activeRecord.athleteProfile.satScore ?? "—"}
                      </strong>
                    </div>
                    <div className="p-3 bg-white border border-slate-200 rounded-xl">
                      <span className="block text-[10px] text-slate-400 font-mono">MEASUREMENTS</span>
                      <strong className="text-sm text-[#102341]">
                        {formatHeight(activeRecord.athleteProfile.heightInches) || "—"} ·{" "}
                        {activeRecord.athleteProfile.weightLbs
                          ? `${activeRecord.athleteProfile.weightLbs} lbs`
                          : "—"}
                      </strong>
                    </div>
                    <div className="p-3 bg-white border border-slate-200 rounded-xl">
                      <span className="block text-[10px] text-slate-400 font-mono">LOCATION</span>
                      <strong className="text-sm text-[#102341]">
                        {[
                          activeRecord.athleteProfile.city,
                          activeRecord.athleteProfile.state,
                        ]
                          .filter(Boolean)
                          .join(", ") || "—"}
                      </strong>
                    </div>
                  </div>

                  {/* Highlight links if any */}
                  {activeRecord.athleteProfile.highlightLinks?.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-xs font-bold text-[#102341] block">
                        Highlight Film Links
                      </span>
                      <div className="space-y-1.5">
                        {activeRecord.athleteProfile.highlightLinks.map((link, i) => (
                          <a
                            key={i}
                            href={link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-800 text-xs font-semibold hover:bg-blue-100 transition mr-2"
                          >
                            <span>Highlight Video {i + 1}</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Security Notice */}
                  <div className="bg-purple-50/60 border border-purple-200/80 rounded-2xl p-4 flex items-start gap-3">
                    <Lock className="w-4 h-4 text-purple-700 shrink-0 mt-0.5" />
                    <div className="text-xs text-purple-900 leading-relaxed">
                      <strong>Institutional Isolation Enforced:</strong> All evaluations, notes, offers, and contact records stored on this profile are strictly quarantined to your school. Neither the athlete, their guardians, nor other colleges can ever see this data.
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: PRIVATE EVALUATION NOTES */}
              {activeTab === "notes" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#102341] uppercase tracking-wider">
                      School-Private Evaluation Notes
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Max 10,000 characters
                    </span>
                  </div>

                  <div className="bg-amber-50/50 border border-amber-200/80 rounded-xl p-3 flex items-start gap-2 text-xs text-amber-900">
                    <Lock className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-700" />
                    <span>
                      Private evaluation notes are confidential and encrypted at rest. Use this space for coaching staff evaluations, projection tiers, character references, and scout feedback.
                    </span>
                  </div>

                  <textarea
                    rows={8}
                    value={draftNotes}
                    onChange={(e) => setDraftNotes(e.target.value)}
                    placeholder="Enter private scouting notes, personality assessment, academic eligibility notes, coach evaluations…"
                    className="w-full rounded-2xl border border-slate-200 p-4 text-xs text-[#102341] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-200 leading-relaxed font-sans"
                  />

                  <div className="flex justify-end">
                    <button
                      type="button"
                      disabled={savingNotes}
                      onClick={() => void handleSaveNotes()}
                      className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-[#102341] hover:bg-[#1d3d68] text-white text-xs font-bold transition cursor-pointer shadow-xs disabled:opacity-60"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{savingNotes ? "Saving Notes…" : "Save Evaluation Notes"}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 3: CONTACT LOGS */}
              {activeTab === "contacts" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-[#102341]">
                        Institutional Contact History
                      </h3>
                      <p className="text-xs text-[#65748a]">
                        Chronological log of phone calls, in-person meetings, campus visits, and emails.
                      </p>
                    </div>

                    {!showAddContact && (
                      <button
                        type="button"
                        onClick={() => setShowAddContact(true)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Log Contact</span>
                      </button>
                    )}
                  </div>

                  {/* Add Contact Form */}
                  {showAddContact && (
                    <form
                      onSubmit={(e) => void handleAddContactLog(e)}
                      className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#102341]">
                          New Contact Entry
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowAddContact(false)}
                          className="text-xs text-slate-400 hover:text-slate-600"
                        >
                          Cancel
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                            Date
                          </label>
                          <input
                            type="date"
                            required
                            value={contactDate}
                            onChange={(e) => setContactDate(e.target.value)}
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white text-[#102341]"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                            Contact Type
                          </label>
                          <select
                            value={contactType}
                            onChange={(e) => setContactType(e.target.value)}
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white text-[#102341]"
                          >
                            <option value="Phone Call">Phone Call</option>
                            <option value="Campus Official Visit">Campus Official Visit</option>
                            <option value="Campus Unofficial Visit">Campus Unofficial Visit</option>
                            <option value="In-Person Evaluation">In-Person Evaluation (Game/Camp)</option>
                            <option value="Email / Letter">Email / Letter</option>
                            <option value="Direct Message / Text">Direct Message / Text</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                            Staff / Coach Name
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Coach Davis"
                            value={contactCoach}
                            onChange={(e) => setContactCoach(e.target.value)}
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white text-[#102341]"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                          Conversation / Contact Notes
                        </label>
                        <textarea
                          rows={3}
                          placeholder="Summary of conversation, topics covered, next steps, athlete interest level…"
                          value={contactNotes}
                          onChange={(e) => setContactNotes(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white text-[#102341] placeholder:text-slate-400"
                        />
                      </div>

                      <div className="flex justify-end gap-2">
                        <button
                          type="submit"
                          className="px-4 py-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition cursor-pointer"
                        >
                          Save Contact Log
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Logs List */}
                  {(!activeRecord.contactLogs || activeRecord.contactLogs.length === 0) && (
                    <p className="text-center py-8 text-xs text-[#65748a] border border-dashed border-slate-200 rounded-2xl">
                      No contacts logged yet for this athlete. Click &quot;Log Contact&quot; to record your first touchpoint.
                    </p>
                  )}

                  {activeRecord.contactLogs && activeRecord.contactLogs.length > 0 && (
                    <div className="space-y-3">
                      {activeRecord.contactLogs.map((log) => (
                        <div
                          key={log.id}
                          className="p-4 rounded-xl border border-slate-200/90 bg-white flex items-start justify-between gap-3 shadow-2xs"
                        >
                          <div className="space-y-1 text-xs">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-[#102341]">{log.type}</span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {formatDate(log.date)}
                              </span>
                              {log.coachName && (
                                <span className="text-[10px] text-blue-800 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full font-semibold">
                                  {log.coachName}
                                </span>
                              )}
                            </div>
                            {log.notes && (
                              <p className="text-[#65748a] leading-relaxed mt-1">
                                {log.notes}
                              </p>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => void handleDeleteContactLog(log.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-700 hover:bg-red-50 transition"
                            title="Delete log entry"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: SCHOLARSHIP & ROSTER OFFERS */}
              {activeTab === "offers" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-[#102341]">
                        Scholarship & Roster Offers
                      </h3>
                      <p className="text-xs text-[#65748a]">
                        Manage official, verbal, walk-on, or roster spots extended by your institution.
                      </p>
                    </div>

                    {!showAddOffer && (
                      <button
                        type="button"
                        onClick={() => setShowAddOffer(true)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Record Offer</span>
                      </button>
                    )}
                  </div>

                  {/* Add Offer Form */}
                  {showAddOffer && (
                    <form
                      onSubmit={(e) => void handleAddOffer(e)}
                      className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#102341]">
                          Record New Offer
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowAddOffer(false)}
                          className="text-xs text-slate-400 hover:text-slate-600"
                        >
                          Cancel
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                            Offer Date
                          </label>
                          <input
                            type="date"
                            required
                            value={offerDate}
                            onChange={(e) => setOfferDate(e.target.value)}
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white text-[#102341]"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                            Offer Type
                          </label>
                          <select
                            value={offerType}
                            onChange={(e) => setOfferType(e.target.value)}
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white text-[#102341]"
                          >
                            <option value="Full Scholarship">Full Scholarship</option>
                            <option value="Partial Scholarship">Partial Scholarship</option>
                            <option value="Preferred Walk-On">Preferred Walk-On (PWO)</option>
                            <option value="Roster Spot">Guaranteed Roster Spot</option>
                            <option value="Walk-On Opportunity">Walk-On Opportunity</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                            Offer Status
                          </label>
                          <select
                            value={offerStatus}
                            onChange={(e) => setOfferStatus(e.target.value)}
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white text-[#102341]"
                          >
                            <option value="Offered">Offered</option>
                            <option value="Under Consideration">Under Consideration</option>
                            <option value="Accepted">Accepted</option>
                            <option value="Declined">Declined</option>
                            <option value="Withdrawn">Withdrawn</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                          Terms / Notes
                        </label>
                        <textarea
                          rows={2}
                          placeholder="Details, financial aid package breakdown, conditional requirements, offer expiration date…"
                          value={offerDetails}
                          onChange={(e) => setOfferDetails(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white text-[#102341] placeholder:text-slate-400"
                        />
                      </div>

                      <div className="flex justify-end gap-2">
                        <button
                          type="submit"
                          className="px-4 py-2 rounded-full bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition cursor-pointer"
                        >
                          Save Offer Record
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Offers List */}
                  {(!activeRecord.offers || activeRecord.offers.length === 0) && (
                    <p className="text-center py-8 text-xs text-[#65748a] border border-dashed border-slate-200 rounded-2xl">
                      No offers recorded yet. Use &quot;Record Offer&quot; when extending a roster or scholarship spot.
                    </p>
                  )}

                  {activeRecord.offers && activeRecord.offers.length > 0 && (
                    <div className="space-y-3">
                      {activeRecord.offers.map((offer) => (
                        <div
                          key={offer.id}
                          className="p-4 rounded-xl border border-purple-200/80 bg-purple-50/30 flex items-start justify-between gap-3 shadow-2xs"
                        >
                          <div className="space-y-1 text-xs">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-purple-950">{offer.type}</span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {formatDate(offer.date)}
                              </span>
                              {offer.status && (
                                <span className="text-[10px] text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full font-bold">
                                  {offer.status}
                                </span>
                              )}
                            </div>
                            {offer.details && (
                              <p className="text-slate-600 leading-relaxed mt-1">
                                {offer.details}
                              </p>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => void handleDeleteOffer(offer.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-700 hover:bg-red-50 transition"
                            title="Delete offer entry"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 5: COMMITMENT & TRANSFER */}
              {activeTab === "commitment" && (
                <form onSubmit={(e) => void handleSaveCommitment(e)} className="space-y-6">
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-[#102341]">
                      Commitment & Transfer Lifecycle
                    </h3>
                    <p className="text-xs text-[#65748a]">
                      Track formal commitments, National Letter of Intent (NLI) signings, and transfer portal statuses.
                    </p>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-[#102341] mb-1">
                          Commitment Date
                        </label>
                        <input
                          type="date"
                          value={commitmentDate}
                          onChange={(e) => setCommitmentDate(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white text-[#102341]"
                        />
                        <span className="block text-[10px] text-slate-400 mt-1">
                          Setting a date automatically marks the recruiting status as COMMITTED.
                        </span>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#102341] mb-1">
                          Transfer Eligibility / Status
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. High School Graduate, Transfer Portal, JUCO Transfer"
                          value={transferStatus}
                          onChange={(e) => setTransferStatus(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white text-[#102341]"
                        />
                        <span className="block text-[10px] text-slate-400 mt-1">
                          Indicate origin pathway or transfer status.
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#102341] mb-1">
                        Commitment Terms & NLI Details
                      </label>
                      <textarea
                        rows={3}
                        placeholder="NLI signed date, financial aid agreement signed, enrollment semester (e.g. Fall 2027), housing deposit status…"
                        value={commitmentDetails}
                        onChange={(e) => setCommitmentDetails(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white text-[#102341] placeholder:text-slate-400"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#102341] mb-1">
                        Transfer Notes & Academic Clearance
                      </label>
                      <textarea
                        rows={2}
                        placeholder="Transfer credit evaluation, NCAA/NAIA eligibility center status, remaining years of eligibility…"
                        value={transferDetails}
                        onChange={(e) => setTransferDetails(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white text-[#102341] placeholder:text-slate-400"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <button
                      type="submit"
                      disabled={savingCommitment}
                      className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition cursor-pointer shadow-xs disabled:opacity-60"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>
                        {savingCommitment ? "Saving…" : "Save Commitment & Transfer Details"}
                      </span>
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <Lock className="w-3 h-3 text-slate-400" />
                Data isolated to your school tenant
              </span>
              <button
                type="button"
                onClick={() => setActiveRecord(null)}
                className="px-4 py-2 rounded-full border border-slate-200 bg-white hover:bg-slate-100 text-[#102341] text-xs font-bold transition cursor-pointer"
              >
                Close Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function RecruitingRecordsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-xs text-[#65748a]">
          Loading recruiting records dashboard…
        </div>
      }
    >
      <RecruitingRecordsContent />
    </Suspense>
  );
}

