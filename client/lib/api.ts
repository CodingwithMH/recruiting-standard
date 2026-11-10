export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  details?: Record<string, string[]>;
  timestamp: string;
}

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  dateOfBirth?: string | null;
  schoolId?: string | null;
  globalRole: "PLATFORM_ADMIN" | "SCHOOL_STAFF" | "ATHLETE" | "PARENT";
  status: "PENDING" | "ACTIVE" | "INACTIVE" | "SUSPENDED";
  createdAt: string;
  memberships?: Array<{
    id: string;
    role: "SCHOOL_ADMIN" | "COACH_RECRUITER";
    school: {
      id: string;
      schoolId: string | null;
      name: string;
      status: "PENDING" | "APPROVED" | "SUSPENDED" | "REJECTED";
    };
  }>;
}

export interface AuthResponse {
  user: UserProfile;
  token: string | null;
  isPendingVerification?: boolean;
  message?: string;
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

const TOKEN_STORAGE_KEY = "trs_auth_token";

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setStoredToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

export function clearStoredToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_STORAGE_KEY);
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const normalizedEndpoint = endpoint.startsWith("/")
    ? endpoint
    : `/${endpoint}`;

  try {
    const response = await fetch(`${API_BASE_URL}${normalizedEndpoint}`, {
      ...options,
      headers,
    });

    const data: ApiResponse<T> = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || `HTTP Error ${response.status}`,
        details: data.details,
        timestamp: data.timestamp || new Date().toISOString(),
      };
    }

    return data;
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : "Unable to reach server. Please check your connection.";
    return {
      success: false,
      error: msg,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Fetches an authorized document stream from the API and opens it in a new tab
 * using a local Blob URL (e.g. `blob:http://localhost:3000/...`).
 *
 * Security benefits:
 * 1. The token is sent exclusively in the Authorization header — never exposed in the URL.
 * 2. The Blob URL is memory-bound to the current browser origin/session.
 * 3. Copying and pasting the Blob URL into Incognito, another browser, or after logout
 *    fails immediately (browser returns ERR_FILE_NOT_FOUND).
 * 4. Third-party cloud storage (Backblaze B2 / S3) URLs are never exposed to the client.
 */
export async function openDocumentPreview(
  documentId: string,
  previewWindow?: Window | null
): Promise<{ success: boolean; error?: string }> {
  try {
    const token = getStoredToken();
    if (!token) {
      if (previewWindow) previewWindow.close();
      return { success: false, error: "Authentication required." };
    }

    const response = await fetch(`${API_BASE_URL}/documents/${documentId}/view`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      if (previewWindow) previewWindow.close();
      const data = await response.json().catch(() => null);
      return {
        success: false,
        error:
          data?.error ||
          (response.status === 403
            ? "Access denied. You do not have permission to view this document."
            : response.status === 404
            ? "Document not found."
            : `Failed to open document (HTTP ${response.status}).`),
      };
    }

    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);

    if (previewWindow && !previewWindow.closed) {
      previewWindow.location.href = blobUrl;
    } else {
      window.open(blobUrl, "_blank");
    }

    return { success: true };
  } catch (err) {
    if (previewWindow) previewWindow.close();
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "Unable to open document. Please check your connection.",
    };
  }
}
