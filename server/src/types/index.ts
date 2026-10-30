import { Request } from "express";

export type GlobalRole = "PLATFORM_ADMIN" | "SCHOOL_STAFF" | "ATHLETE" | "PARENT";
export type SchoolRole = "SCHOOL_ADMIN" | "COACH_RECRUITER";
export type SchoolStatus = "PENDING" | "APPROVED" | "SUSPENDED" | "REJECTED";

export interface AuthenticatedUser {
  userId: string;
  email: string;
  globalRole: GlobalRole;
  schoolId?: string;
  schoolRole?: SchoolRole;
  schoolStatus?: SchoolStatus;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
  schoolId?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  details?: Record<string, string[]>;
  timestamp: string;
}
