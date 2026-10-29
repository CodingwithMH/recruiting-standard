import { getStoredToken, setStoredToken, clearStoredToken, UserProfile } from "./api";

const USER_STORAGE_KEY = "trs_auth_user";

export function getStoredUser(): UserProfile | null {
  if (typeof window === "undefined") return null;
  const userJson = localStorage.getItem(USER_STORAGE_KEY);
  if (!userJson) return null;
  try {
    return JSON.parse(userJson) as UserProfile;
  } catch {
    return null;
  }
}

export function setStoredUser(user: UserProfile): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
}

export function clearStoredUser(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(USER_STORAGE_KEY);
}

export function saveSession(token: string, user: UserProfile): void {
  setStoredToken(token);
  setStoredUser(user);
}

export function endSession(): void {
  clearStoredToken();
  clearStoredUser();
}

export function isAuthenticated(): boolean {
  return !!getStoredToken();
}

export function isSchoolPending(): boolean {
  const user = getStoredUser();
  if (!user || !user.memberships || user.memberships.length === 0) return false;
  return user.memberships.some((m) => m.school.status === "PENDING");
}
