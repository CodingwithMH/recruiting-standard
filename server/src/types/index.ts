import { Request } from "express";

export interface AuthenticatedUser {
  userId: string;
  email: string;
  globalRole: "PLATFORM_ADMIN" | "SCHOOL_STAFF" | "ATHLETE" | "PARENT";
  schoolId?: string;
  schoolRole?: "SCHOOL_ADMIN" | "COACH_RECRUITER";
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  timestamp: string;
}
