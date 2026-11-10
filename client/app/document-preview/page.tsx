"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  Download,
  FileText,
  Image as ImageIcon,
  Lock,
  Loader2,
  ShieldAlert,
  X,
} from "lucide-react";
import { getStoredToken } from "@/lib/api";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

function DocumentPreviewContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const documentId = searchParams.get("id");

  const [loading, setLoading] = useState(true);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [title, setTitle] = useState<string>("Document Preview");
  const [mimeType, setMimeType] = useState<string>("application/pdf");
  const [errorType, setErrorType] = useState<
    "AUTH" | "FORBIDDEN" | "NOT_FOUND" | "GENERAL" | null
  >(null);
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    let active = true;
    let createdUrl: string | null = null;

    async function loadDocument() {
      if (!documentId) {
        setErrorType("GENERAL");
        setErrorMessage("No document ID specified in URL.");
        setLoading(false);
        return;
      }

      const token = getStoredToken();
      if (!token) {
        setErrorType("AUTH");
        setErrorMessage("You must be logged in to view this private document.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setErrorType(null);

      try {
        const response = await fetch(
          `${API_BASE_URL}/documents/${documentId}/view`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!active) return;

        if (!response.ok) {
          if (response.status === 401) {
            setErrorType("AUTH");
            setErrorMessage(
              "Your session has expired or you are not logged in. Please sign in to view this document."
            );
          } else if (response.status === 403) {
            setErrorType("FORBIDDEN");
            setErrorMessage(
              "Access denied. You do not have permission to view this document. Only the owner athlete, platform administrators, linked guardians, and verified coaches with active subscriptions can view verified documents."
            );
          } else if (response.status === 404) {
            setErrorType("NOT_FOUND");
            setErrorMessage("The requested document could not be found.");
          } else {
            const errData = await response.json().catch(() => null);
            setErrorType("GENERAL");
            setErrorMessage(
              errData?.error ||
                `Unable to load document (HTTP ${response.status}).`
            );
          }
          setLoading(false);
          return;
        }

        const disposition = response.headers.get("content-disposition");
        if (disposition) {
          const match = disposition.match(/filename="?([^";]+)"?/i);
          if (match && match[1]) {
            setTitle(decodeURIComponent(match[1]));
          }
        }

        const contentType =
          response.headers.get("content-type") || "application/pdf";
        setMimeType(contentType);

        const blob = await response.blob();
        if (!active) return;

        // If the blob itself has a type, use it
        if (blob.type) {
          setMimeType(blob.type);
        }

        createdUrl = URL.createObjectURL(blob);
        setBlobUrl(createdUrl);
        setLoading(false);
      } catch (err) {
        if (!active) return;
        setErrorType("GENERAL");
        setErrorMessage(
          err instanceof Error
            ? err.message
            : "Failed to connect to the document server."
        );
        setLoading(false);
      }
    }

    void loadDocument();

    return () => {
      active = false;
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [documentId]);

  const isImage =
    mimeType.startsWith("image/") ||
    /\.(png|jpe?g|webp|gif|svg)$/i.test(title);

  const handleDownload = () => {
    if (!blobUrl) return;
    const a = document.createElement("a");
    a.href = blobUrl;
    let filename = title;
    if (!filename.includes(".")) {
      filename = isImage ? `${filename}.png` : `${filename}.pdf`;
    }
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleClose = () => {
    if (window.opener) {
      window.close();
    } else {
      router.back();
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-900 text-white overflow-hidden">
      {/* Top Header Bar */}
      <header className="h-14 bg-slate-800/95 backdrop-blur border-b border-slate-700/80 px-4 flex items-center justify-between shrink-0 z-10 shadow-sm">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center shrink-0">
            {isImage ? (
              <ImageIcon className="w-4 h-4" />
            ) : (
              <FileText className="w-4 h-4" />
            )}
          </div>
          <div className="min-w-0">
            <span className="font-semibold text-sm truncate block max-w-md sm:max-w-xl text-slate-100">
              {title}
            </span>
            <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider block">
              {isImage ? "Image Document" : "PDF Document"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {blobUrl && (
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-xs font-semibold text-slate-200 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Download
            </button>
          )}
          <button
            type="button"
            onClick={handleClose}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700/60 hover:bg-slate-600 text-xs font-semibold text-slate-300 transition cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            Close
          </button>
        </div>
      </header>

      {/* Main Content Area: fills exactly the remainder of 100vh */}
      <main className="flex-1 w-full h-[calc(100vh-3.5rem)] relative overflow-hidden bg-slate-950 flex flex-col">
        {loading && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <p className="text-xs font-medium">
              Verifying access and loading document...
            </p>
          </div>
        )}

        {!loading && errorType && (
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="max-w-md w-full rounded-2xl bg-slate-800 border border-slate-700 p-6 text-center shadow-xl space-y-4">
              <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center bg-red-950/60 border border-red-500/30 text-red-400">
                {errorType === "AUTH" && <Lock className="w-6 h-6" />}
                {errorType === "FORBIDDEN" && (
                  <ShieldAlert className="w-6 h-6" />
                )}
                {(errorType === "NOT_FOUND" || errorType === "GENERAL") && (
                  <AlertCircle className="w-6 h-6" />
                )}
              </div>

              <div className="space-y-1">
                <h2 className="text-base font-bold text-slate-100">
                  {errorType === "AUTH" && "Authentication Required"}
                  {errorType === "FORBIDDEN" && "Access Denied"}
                  {errorType === "NOT_FOUND" && "Document Not Found"}
                  {errorType === "GENERAL" && "Unable to Open Document"}
                </h2>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {errorMessage}
                </p>
              </div>

              {errorType === "AUTH" && (
                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      `/login?redirect=${encodeURIComponent(
                        window.location.pathname + window.location.search
                      )}`
                    )
                  }
                  className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition cursor-pointer"
                >
                  Sign In to View Document
                </button>
              )}
            </div>
          </div>
        )}

        {!loading && blobUrl && isImage && (
          <div className="flex-1 w-full h-full p-4 sm:p-8 flex items-center justify-center overflow-auto bg-slate-950/90">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={blobUrl}
              alt={title}
              className="max-w-full max-h-full object-contain rounded-xl shadow-2xl border border-slate-800"
            />
          </div>
        )}

        {!loading && blobUrl && !isImage && (
          <iframe
            src={blobUrl}
            className="w-full h-full border-0 block"
            title={title}
          />
        )}
      </main>
    </div>
  );
}

export default function DocumentPreviewPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen w-screen bg-slate-900 flex items-center justify-center text-slate-400 text-xs">
          Loading preview...
        </div>
      }
    >
      <DocumentPreviewContent />
    </Suspense>
  );
}
