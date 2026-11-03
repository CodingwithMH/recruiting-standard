"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Film,
  Link2,
  Loader2,
  RefreshCw,
  Trash2,
  UploadCloud,
  Video,
} from "lucide-react";
import { apiRequest } from "@/lib/api";

type Provider = "CLOUDINARY" | "HUDL" | "YOUTUBE" | "VIMEO" | "OTHER";

interface HighlightVideo {
  id: string;
  title: string | null;
  videoUrl: string;
  provider: Provider;
  publicId: string | null;
  durationSeconds: number | null;
  sizeBytes: number | null;
  createdAt: string;
}

interface UploadCredentials {
  provider: "CLOUDINARY";
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  uploadUrl: string;
  maxBytes: number;
  allowedFormats: string[];
}

interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
  duration?: number;
  bytes?: number;
}

const DEFAULT_MAX_BYTES = 104_857_600;

const PROVIDER_LABELS: Record<Provider, string> = {
  CLOUDINARY: "Uploaded video",
  HUDL: "Hudl",
  YOUTUBE: "YouTube",
  VIMEO: "Vimeo",
  OTHER: "Video link",
};

const PROVIDER_STYLES: Record<Provider, string> = {
  CLOUDINARY: "bg-blue-50 text-blue-800 border-blue-200/80",
  HUDL: "bg-violet-50 text-violet-800 border-violet-200/80",
  YOUTUBE: "bg-red-50 text-red-800 border-red-200/80",
  VIMEO: "bg-sky-50 text-sky-800 border-sky-200/80",
  OTHER: "bg-slate-100 text-slate-700 border-slate-200",
};

function formatBytes(bytes: number | null): string {
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

function formatDuration(seconds: number | null): string {
  if (!seconds) return "—";
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.round(seconds % 60);
  return `${minutes}:${remainder.toString().padStart(2, "0")}`;
}

function uploadToCloudinary(
  file: File,
  credentials: UploadCredentials,
  onProgress: (percent: number) => void
): Promise<CloudinaryUploadResult> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("api_key", credentials.apiKey);
    formData.append("timestamp", String(credentials.timestamp));
    formData.append("signature", credentials.signature);
    formData.append("folder", credentials.folder);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", credentials.uploadUrl);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      let body: CloudinaryUploadResult & { error?: { message?: string } };
      try {
        body = JSON.parse(xhr.responseText) as typeof body;
      } catch {
        reject(new Error("Upload failed. The storage provider returned an invalid response."));
        return;
      }

      if (xhr.status >= 200 && xhr.status < 300 && body.secure_url) {
        resolve(body);
      } else {
        reject(
          new Error(
            body.error?.message || `Upload failed (HTTP ${xhr.status}).`
          )
        );
      }
    };

    xhr.onerror = () =>
      reject(new Error("Upload failed. Check your connection and try again."));
    xhr.onabort = () => reject(new Error("Upload cancelled."));

    xhr.send(formData);
  });
}

export default function HighlightVideos() {
  const [highlights, setHighlights] = useState<HighlightVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [savingLink, setSavingLink] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkTitle, setLinkTitle] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadHighlights = useCallback(async () => {
    setLoading(true);

    const res = await apiRequest<HighlightVideo[]>("/athlete/highlights");

    if (res.success && res.data) {
      setHighlights(res.data);
    } else {
      setHighlights([]);
      setError(res.error || "Unable to load your highlight videos.");
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadHighlights();
  }, [loadHighlights]);

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    setError(null);
    setNotice(null);

    if (!file.type.startsWith("video/")) {
      setError("Please choose a video file (MP4, MOV, WEBM, or M4V).");
      return;
    }

    const credentialsRes = await apiRequest<UploadCredentials>(
      "/athlete/highlights/upload-credentials",
      { method: "POST" }
    );

    if (!credentialsRes.success || !credentialsRes.data) {
      setError(
        credentialsRes.error || "Video uploads are not configured on this server."
      );
      return;
    }

    const credentials = credentialsRes.data;

    if (file.size > credentials.maxBytes) {
      setError(
        `That video is too large. The maximum size is ${formatBytes(
          credentials.maxBytes
        )}.`
      );
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      const uploaded = await uploadToCloudinary(file, credentials, setProgress);

      const saved = await apiRequest<HighlightVideo>("/athlete/highlights", {
        method: "POST",
        body: JSON.stringify({
          title:
            file.name.replace(/\.[^.]+$/, "").slice(0, 120) || "Highlight video",
          videoUrl: uploaded.secure_url,
          publicId: uploaded.public_id,
          durationSeconds: uploaded.duration
            ? Math.round(uploaded.duration)
            : undefined,
          sizeBytes: uploaded.bytes ?? file.size,
        }),
      });

      if (!saved.success) {
        setError(saved.error || "Video uploaded, but it could not be published.");
        return;
      }

      setNotice("Highlight video published.");
      await loadHighlights();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Video upload failed.");
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const handleAddLink = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const url = linkUrl.trim();
    if (!url) return;

    setSavingLink(true);
    setError(null);
    setNotice(null);

    const res = await apiRequest<HighlightVideo>("/athlete/highlights", {
      method: "POST",
      body: JSON.stringify({
        title: linkTitle.trim() || undefined,
        videoUrl: url,
      }),
    });

    setSavingLink(false);

    if (res.success) {
      setLinkUrl("");
      setLinkTitle("");
      setNotice("Highlight link published.");
      await loadHighlights();
    } else {
      setError(res.error || "Unable to publish that video link.");
    }
  };

  const handleDelete = async (highlight: HighlightVideo) => {
    if (!window.confirm("Remove this highlight video from your profile?")) {
      return;
    }

    setBusyId(highlight.id);
    setError(null);
    setNotice(null);

    const res = await apiRequest(`/athlete/highlights/${highlight.id}`, {
      method: "DELETE",
    });

    setBusyId(null);

    if (res.success) {
      setNotice("Highlight video removed.");
      await loadHighlights();
    } else {
      setError(res.error || "Unable to remove that highlight video.");
    }
  };

  return (
    <section className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
      <div className="p-6 border-b border-slate-200/80 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Film className="w-4 h-4 text-blue-600" />
          <h2 className="text-base font-bold text-[#102341]">Highlight Videos</h2>
          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 rounded-full px-2 py-0.5">
            {highlights.length}
          </span>
        </div>
        <button
          type="button"
          onClick={() => void loadHighlights()}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-[#102341] text-[11px] font-bold disabled:opacity-60 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="p-6 space-y-5">
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <label
            className={`rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/60 px-5 py-8 flex flex-col items-center justify-center text-center gap-2 transition ${
              uploading
                ? "opacity-70 pointer-events-none"
                : "hover:border-blue-300 hover:bg-blue-50/40 cursor-pointer"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="video/mp4,video/quicktime,video/webm,video/x-m4v"
              onChange={(event) => void handleFileChange(event)}
              className="sr-only"
              disabled={uploading}
            />
            {uploading ? (
              <Loader2 className="w-7 h-7 text-blue-600 animate-spin" />
            ) : (
              <UploadCloud className="w-7 h-7 text-blue-600" />
            )}
            <span className="text-sm font-bold text-[#102341]">
              {uploading ? `Uploading… ${progress}%` : "Upload a highlight video"}
            </span>
            <span className="text-[11px] text-[#65748a] leading-relaxed">
              MP4, MOV, WEBM or M4V · up to {formatBytes(DEFAULT_MAX_BYTES)} ·
              hosted on Cloudinary
            </span>
            {uploading && (
              <div className="w-full max-w-xs h-1.5 bg-slate-200 rounded-full overflow-hidden mt-1">
                <div
                  className="h-full bg-blue-600 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
          </label>

          <form
            onSubmit={(event) => void handleAddLink(event)}
            className="rounded-xl border border-slate-200 bg-white px-5 py-6 space-y-3"
          >
            <div className="flex items-center gap-2">
              <Link2 className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-bold text-[#102341]">
                Or paste a Hudl, YouTube, or Vimeo link
              </span>
            </div>
            <input
              type="url"
              required
              value={linkUrl}
              onChange={(event) => setLinkUrl(event.target.value)}
              placeholder="https://www.hudl.com/video/..."
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-[#102341] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-300"
            />
            <input
              type="text"
              maxLength={120}
              value={linkTitle}
              onChange={(event) => setLinkTitle(event.target.value)}
              placeholder="Title (optional)"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-[#102341] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-300"
            />
            <button
              type="submit"
              disabled={savingLink || !linkUrl.trim()}
              className="inline-flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-lg bg-[#102341] hover:bg-[#1b355c] text-white text-xs font-bold disabled:opacity-50 cursor-pointer"
            >
              {savingLink ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Link2 className="w-3.5 h-3.5" />
              )}
              Publish link
            </button>
          </form>
        </div>

        {loading && (
          <p className="py-8 text-center text-xs text-[#65748a]">
            Loading highlight videos…
          </p>
        )}

        {!loading && highlights.length === 0 && (
          <p className="py-8 text-center text-xs text-[#65748a]">
            No highlight videos yet. Upload your first clip so schools can
            evaluate your film.
          </p>
        )}

        {!loading && highlights.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {highlights.map((highlight) => (
              <article
                key={highlight.id}
                className="rounded-xl border border-slate-200 overflow-hidden bg-white"
              >
                {highlight.provider === "CLOUDINARY" ? (
                  <video
                    src={highlight.videoUrl}
                    controls
                    preload="metadata"
                    className="w-full aspect-video bg-black"
                  />
                ) : (
                  <a
                    href={highlight.videoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full aspect-video bg-slate-900 flex flex-col items-center justify-center gap-2 text-white hover:bg-slate-800 transition"
                  >
                    <Video className="w-7 h-7" />
                    <span className="text-xs font-bold">
                      Open on {PROVIDER_LABELS[highlight.provider]}
                    </span>
                  </a>
                )}

                <div className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-bold text-[#102341] line-clamp-2">
                      {highlight.title || "Untitled highlight"}
                    </h3>
                    <button
                      type="button"
                      onClick={() => void handleDelete(highlight)}
                      disabled={busyId === highlight.id}
                      aria-label="Remove highlight video"
                      className="shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-full border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50 cursor-pointer"
                    >
                      {busyId === highlight.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-[#65748a]">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full border font-bold ${PROVIDER_STYLES[highlight.provider]}`}
                    >
                      {PROVIDER_LABELS[highlight.provider]}
                    </span>
                    <span>{formatDuration(highlight.durationSeconds)}</span>
                    <span>·</span>
                    <span>{formatBytes(highlight.sizeBytes)}</span>
                    <span>·</span>
                    <span>
                      {new Date(highlight.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
