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
  globalRole: "PLATFORM_ADMIN" | "SCHOOL_STAFF" | "ATHLETE" | "PARENT";
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  createdAt: string;
  memberships?: Array<{
    id: string;
    role: "SCHOOL_ADMIN" | "COACH_RECRUITER";
    school: {
      id: string;
      schoolId: string | null;
      name: string;
      status: "PENDING" | "APPROVED" | "SUSPENDED";
    };
  }>;
}

export interface AuthResponse {
  user: UserProfile;
  token: string;
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
