"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  FileText,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { apiRequest, openDocumentPreview } from "@/lib/api";

type DocumentType =
  | "TRANSCRIPT"
  | "ELIGIBILITY"
  | "COMBINE_REPORT"
  | "PHYSICAL"
  | "OTHER";

type DocumentStatus = "PENDING" | "APPROVED" | "REJECTED";

interface AthleteDocument {
  id: string;
  type: DocumentType;
  title: string;
  fileSizeBytes: number;
  mimeType: string;
  status: DocumentStatus;
  reviewerNotes: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

interface UploadTicket {
  uploadUrl: string;
  storageKey: string;
  expiresInSeconds: number;
  contentType: string;
  maxBytes: number;
  allowedMimeTypes: string[];
}

interface DocumentAccess {
  document: {
    id: string;
    title: string;
    mimeType: string;
    status: DocumentStatus;
  };
  downloadUrl: string;
  expiresInSeconds: number;
}

const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png"];

const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  TRANSCRIPT: "Official transcript",
  ELIGIBILITY: "Eligibility document",
  COMBINE_REPORT: "Combine report",
  PHYSICAL: "Physical exam",
  OTHER: "Other document",
};

const STATUS_STYLES: Record<DocumentStatus, string> = {
  PENDING: "bg-amber-50 text-amber-800 border-amber-200/80",
  APPROVED: "bg-emerald-50 text-emerald-800 border-emerald-200/80",
  REJECTED: "bg-red-50 text-red-800 border-red-200/80",
};

function formatBytes(bytes: number): string {
  if (!bytes) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}

function uploadToPrivateStorage(
  file: File,
  ticket: UploadTicket,
  onProgress: (percent: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", ticket.uploadUrl);
    xhr.setRequestHeader("Content-Type", ticket.contentType);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
        return;
      }

      reject(
        new Error(
          `Private storage rejected the upload (HTTP ${xhr.status}). Please try again.`
        )
      );
    };

    xhr.onerror = () =>
      reject(new Error("Upload failed. Check your connection and try again."));
    xhr.onabort = () => reject(new Error("Upload cancelled."));

    xhr.send(file);
  });
}

export default function PrivateDocuments() {
  const [documents, setDocuments] = useState<AthleteDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] =
    useState<DocumentType>("TRANSCRIPT");
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadDocuments = useCallback(async () => {
    setLoading(true);

    const res = await apiRequest<AthleteDocument[]>("/athlete/documents");

    if (res.success && res.data) {
      setDocuments(res.data);
    } else {
      setDocuments([]);
      setError(res.error || "Unable to load your private documents.");
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadDocuments();
  }, [loadDocuments]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
    setError(null);
    setNotice(null);

    if (!file) return;

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setSelectedFile(null);
      event.target.value = "";
      setError("Choose a PDF, JPEG, or PNG file.");
      return;
    }

    if (file.size > MAX_DOCUMENT_BYTES) {
      setSelectedFile(null);
      event.target.value = "";
      setError(
        `That document is too large. The maximum size is ${formatBytes(
          MAX_DOCUMENT_BYTES
        )}.`
      );
      return;
    }

    if (!title.trim()) {
      setTitle(file.name.replace(/\.[^.]+$/, "").slice(0, 120));
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setTitle("");
    setDocumentType("TRANSCRIPT");
    setProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleUpload = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedFile) {
      setError("Choose a document to upload.");
      return;
    }

    if (!title.trim()) {
      setError("Add a title for this document.");
      return;
    }

    setUploading(true);
    setProgress(0);
    setError(null);
    setNotice(null);

    try {
      const ticketRes = await apiRequest<UploadTicket>(
        "/athlete/documents/upload-url",
        {
          method: "POST",
          body: JSON.stringify({
            filename: selectedFile.name,
            mimeType: selectedFile.type,
            sizeBytes: selectedFile.size,
            type: documentType,
            title: title.trim(),
          }),
        }
      );

      if (!ticketRes.success || !ticketRes.data) {
        setError(
          ticketRes.error ||
            "Private document uploads are not configured on this server."
        );
        return;
      }

      const ticket = ticketRes.data;

      await uploadToPrivateStorage(selectedFile, ticket, setProgress);

      const confirmRes = await apiRequest<AthleteDocument>(
        "/athlete/documents",
        {
          method: "POST",
          body: JSON.stringify({
            storageKey: ticket.storageKey,
            filename: selectedFile.name,
            mimeType: selectedFile.type,
            sizeBytes: selectedFile.size,
            type: documentType,
            title: title.trim(),
          }),
        }
      );

      if (!confirmRes.success) {
        setError(
          confirmRes.error || "The document uploaded but could not be saved."
        );
        return;
      }

      setNotice("Document uploaded and submitted for verification.");
      resetForm();
      await loadDocuments();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Document upload failed."
      );
    } finally {
      setUploading(false);
    }
  };

  const handleView = async (document: AthleteDocument) => {
    setBusyId(document.id);
    setError(null);
    setNotice(null);

    // Open a blank tab synchronously during the click event to avoid browser popup blockers.
    const previewWindow = window.open("about:blank", "_blank");

    const result = await openDocumentPreview(document.id, previewWindow);
    if (!result.success && result.error) {
      setError(result.error);
    }

    setBusyId(null);
  };

  const handleDelete = async (document: AthleteDocument) => {
    if (!window.confirm(`Remove "${document.title}" from your documents?`)) {
      return;
    }

    setBusyId(document.id);
    setError(null);
    setNotice(null);

    const res = await apiRequest(`/athlete/documents/${document.id}`, {
      method: "DELETE",
    });

    setBusyId(null);

    if (res.success) {
      setNotice("Document removed.");
      await loadDocuments();
    } else {
      setError(res.error || "Unable to remove that document.");
    }
  };

  return (
    <section className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
      <div className="p-6 border-b border-slate-200/80 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-blue-600" />
          <h2 className="text-base font-bold text-[#102341]">
            Private Documents
          </h2>
          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 rounded-full px-2 py-0.5">
            {documents.length}
          </span>
        </div>
        <button
          type="button"
          onClick={() => void loadDocuments()}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-[#102341] text-[11px] font-bold disabled:opacity-60 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="p-6 space-y-5">
        <p className="text-xs text-[#65748a] leading-relaxed">
          Transcripts, eligibility forms, and combine reports are stored in a
          private bucket. Files never receive public URLs; access is granted
          through short-lived signed links.
        </p>

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

        <form
          onSubmit={(event) => void handleUpload(event)}
          className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="space-y-1">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Document type
              </span>
              <select
                value={documentType}
                onChange={(event) =>
                  setDocumentType(event.target.value as DocumentType)
                }
                disabled={uploading}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-[#102341] focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                {Object.entries(DOCUMENT_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Title
              </span>
              <input
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={120}
                disabled={uploading}
                placeholder="e.g. Fall 2026 official transcript"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-[#102341] focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </label>
          </div>

          <label
            className={`rounded-xl border-2 border-dashed border-slate-200 bg-white px-5 py-6 flex flex-col items-center justify-center text-center gap-2 transition ${
              uploading
                ? "opacity-70 pointer-events-none"
                : "hover:border-blue-300 hover:bg-blue-50/40 cursor-pointer"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/jpeg,image/png"
              onChange={handleFileChange}
              disabled={uploading}
              className="sr-only"
            />
            <UploadCloud className="w-8 h-8 text-blue-600" />
            <span className="text-xs font-bold text-[#102341]">
              {selectedFile ? selectedFile.name : "Choose a PDF, JPEG, or PNG"}
            </span>
            <span className="text-[10px] text-[#65748a]">
              Maximum {formatBytes(MAX_DOCUMENT_BYTES)}
            </span>
          </label>

          {uploading && (
            <div className="space-y-1">
              <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                <div
                  className="h-full rounded-full bg-blue-600 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-[10px] font-semibold text-[#65748a]">
                Uploading… {progress}%
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={uploading || !selectedFile}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold disabled:opacity-60 cursor-pointer"
          >
            {uploading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <UploadCloud className="w-3.5 h-3.5" />
            )}
            {uploading ? "Uploading…" : "Upload document"}
          </button>
        </form>

        <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
          {loading && (
            <p className="px-4 py-8 text-center text-xs text-[#65748a]">
              Loading private documents...
            </p>
          )}

          {!loading && documents.length === 0 && (
            <p className="px-4 py-8 text-center text-xs text-[#65748a]">
              No private documents uploaded yet.
            </p>
          )}

          {documents.map((document) => (
            <div
              key={document.id}
              className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white"
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="block font-bold text-[#102341] truncate">
                    {document.title}
                  </span>
                  <span className="block text-[11px] text-[#65748a]">
                    {DOCUMENT_TYPE_LABELS[document.type]} ·{" "}
                    {formatBytes(document.fileSizeBytes)} ·{" "}
                    {new Date(document.createdAt).toLocaleDateString()}
                  </span>
                  {document.status === "REJECTED" &&
                    document.reviewerNotes && (
                      <span className="block text-[10px] text-red-700 mt-1">
                        Reviewer notes: {document.reviewerNotes}
                      </span>
                    )}
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <span
                  className={`inline-flex px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider ${STATUS_STYLES[document.status]}`}
                >
                  {document.status}
                </span>
                <button
                  type="button"
                  onClick={() => void handleView(document)}
                  disabled={busyId === document.id}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-[#102341] text-[11px] font-bold disabled:opacity-60 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  View
                </button>
                {document.status !== "APPROVED" && (
                  <button
                    type="button"
                    onClick={() => void handleDelete(document)}
                    disabled={busyId === document.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-red-200 bg-red-50 hover:bg-red-100 text-red-800 text-[11px] font-bold disabled:opacity-60 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
