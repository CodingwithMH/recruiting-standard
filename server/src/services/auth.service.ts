import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { env } from "../config/env.js";
import { hashPassword, comparePassword } from "../utils/password.js";
import { signToken, type JwtPayload } from "../utils/jwt.js";
import { generateResetToken, hashResetToken } from "../utils/resetToken.js";
import {
  sendPasswordResetEmail,
  sendSchoolMemberInvitationEmail,
} from "../utils/email.js";
import { logger } from "../utils/logger.js";

// ----------------------------------------------------
// Validation Schemas
// ----------------------------------------------------

export const registerSchema = z.object({
  email: z.string().email("A valid email address is required"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must not exceed 128 characters"),
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  phone: z.string().optional(),
  globalRole: z
    .enum(["SCHOOL_STAFF", "ATHLETE", "PARENT"])
    .default("SCHOOL_STAFF"),
  schoolId: z.string().trim().optional(),
  dateOfBirth: z.string().trim().optional(),
});

export const loginSchema = z.object({
  email: z.string().email("A valid email address is required"),
  password: z.string().min(1, "Password is required"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("A valid email address is required"),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must not exceed 128 characters"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

/** Password reset links are valid for one hour. */
export const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

// ----------------------------------------------------
// Service Errors
// ----------------------------------------------------

export class AuthError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number = 401) {
    super(message);
    this.name = "AuthError";
    this.statusCode = statusCode;
  }
}

// ----------------------------------------------------
// Service Functions
// ----------------------------------------------------

/**
 * Registers a new user account with hashed password.
 * Returns a signed JWT token and the created user profile.
 */
export async function registerUser(input: RegisterInput) {
  const existing = await prisma.user.findUnique({
    where: { email: input.email.toLowerCase() },
  });

  if (existing) {
    throw new AuthError(
      "An account with this email address already exists",
      409
    );
  }

  let verifiedSchoolId: string | undefined = undefined;
  let parsedDob: Date | undefined = undefined;

  if (input.globalRole === "ATHLETE") {
    // 1. Validate Date of Birth (Ages 14 - 20)
    if (!input.dateOfBirth) {
      throw new AuthError(
        "Date of birth is required for student-athlete registration.",
        400
      );
    }

    const dob = new Date(input.dateOfBirth);
    if (isNaN(dob.getTime())) {
      throw new AuthError(
        "Please provide a valid date of birth (YYYY-MM-DD).",
        400
      );
    }

    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }

    if (age < 14) {
      throw new AuthError(
        "Student-athletes must be at least 14 years of age to register.",
        400
      );
    }
    if (age > 20) {
      throw new AuthError(
        "Student-athletes must be 20 years of age or younger to register (including re-classified athletes).",
        400
      );
    }

    parsedDob = dob;

    // 2. Validate School ID
    if (!input.schoolId || input.schoolId.trim().length === 0) {
      throw new AuthError(
        "A valid School ID is required for student-athlete registration. Ask your coach or athletic director for your school's ID.",
        400
      );
    }

    const normalizedSchoolId = input.schoolId.trim().toUpperCase();

    const school = await prisma.school.findFirst({
      where: {
        OR: [
          { schoolId: { equals: normalizedSchoolId, mode: "insensitive" } },
          { id: input.schoolId.trim() },
        ],
      },
      select: { id: true, schoolId: true, name: true, status: true },
    });

    if (!school) {
      throw new AuthError(
        `School ID "${input.schoolId.trim()}" was not found. Please verify the ID with your school's athletic department.`,
        404
      );
    }

    if (school.status !== "APPROVED") {
      throw new AuthError(
        `School "${school.name}" is currently ${school.status.toLowerCase()}. Student-athletes can only register after the school is approved by Platform Administration.`,
        403
      );
    }

    verifiedSchoolId = school.schoolId || school.id;
  }

  const passwordHash = await hashPassword(input.password);

  const user = await prisma.user.create({
    data: {
      email: input.email.toLowerCase(),
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone || null,
      globalRole: input.globalRole,
      dateOfBirth: parsedDob,
      schoolId: verifiedSchoolId,
      status: "ACTIVE",
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      globalRole: true,
      schoolId: true,
      status: true,
      tokenVersion: true,
      createdAt: true,
    },
  });

  const tokenPayload: JwtPayload = {
    userId: user.id,
    email: user.email,
    globalRole: user.globalRole,
    schoolId: user.schoolId || undefined,
    tokenVersion: user.tokenVersion,
  };

  const token = signToken(tokenPayload);

  logger.info("AUTH", `New user registered: ${user.email} (${user.globalRole})`);

  return { user, token };
}

/**
 * Authenticates a user by email and password.
 * Returns a signed JWT token, user profile, and school membership details.
 */
export async function loginUser(input: LoginInput) {
  const user = await prisma.user.findUnique({
    where: { email: input.email.toLowerCase() },
    include: {
      memberships: {
        where: { status: "ACTIVE" },
        include: {
          school: {
            select: {
              id: true,
              schoolId: true,
              name: true,
              status: true,
            },
          },
        },
      },
    },
  });

  if (!user) {
    throw new AuthError("Invalid email or password");
  }

  if (user.status !== "ACTIVE") {
    throw new AuthError(
      "Your account has been deactivated. Please contact support.",
      403
    );
  }

  const isMatch = await comparePassword(input.password, user.passwordHash);
  if (!isMatch) {
    throw new AuthError("Invalid email or password");
  }

  const primaryMembership = user.memberships[0];

  const tokenPayload: JwtPayload = {
    userId: user.id,
    email: user.email,
    globalRole: user.globalRole,
    schoolId: primaryMembership?.schoolId || user.schoolId || undefined,
    schoolRole: primaryMembership?.role,
    tokenVersion: user.tokenVersion,
  };

  const token = signToken(tokenPayload);

  logger.info("AUTH", `User logged in: ${user.email} (${user.globalRole})`);

  const { passwordHash: _ph, tokenVersion: _tv, ...userWithoutPassword } = user;

  return {
    user: userWithoutPassword,
    token,
  };
}

/**
 * Revokes every active session for the user by invalidating issued tokens.
 */
export async function logoutUser(userId: string) {
  await prisma.user.update({
    where: { id: userId },
    data: { tokenVersion: { increment: 1 } },
  });

  logger.info("AUTH", `User logged out and sessions revoked: ${userId}`);

  return { message: "You have been signed out successfully." };
}

/**
 * Fetches the current authenticated user's profile and memberships.
 */
export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      globalRole: true,
      schoolId: true,
      status: true,
      createdAt: true,
      memberships: {
        where: { status: "ACTIVE" },
        include: {
          school: {
            select: {
              id: true,
              schoolId: true,
              name: true,
              status: true,
            },
          },
        },
      },
    },
  });

  if (!user) {
    throw new AuthError("User not found", 404);
  }

  return user;
}

/**
 * Creates a single-use, time-limited password setup token for an active user.
 * Returns `null` when the account does not exist or is not active.
 */
async function issuePasswordSetupLink(email: string) {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
    select: { id: true, email: true, status: true },
  });

  if (!user || user.status !== "ACTIVE") return null;

  const token = generateResetToken();

  await prisma.$transaction([
    prisma.passwordResetToken.deleteMany({ where: { userId: user.id } }),
    prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashResetToken(token),
        expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
      },
    }),
  ]);

  return {
    user,
    resetUrl: `${env.CLIENT_ORIGIN.replace(/\/$/, "")}/reset-password?token=${encodeURIComponent(token)}`,
  };
}

/**
 * Issues a single-use, time-limited password reset token and emails it to the
 * user. Always returns the same message so callers cannot enumerate accounts.
 */
export async function requestPasswordReset(input: ForgotPasswordInput) {
  const issued = await issuePasswordSetupLink(input.email);

  if (issued) {
    try {
      await sendPasswordResetEmail(issued.user.email, issued.resetUrl);
    } catch (error) {
      logger.error(
        "AUTH",
        `Failed to send password reset email for user: ${issued.user.id}`,
        error
      );
    }

    logger.info("AUTH", `Password reset requested for user: ${issued.user.id}`);
  }

  return {
    message:
      "If an account with that email address exists, a password reset link has been sent.",
  };
}

/**
 * Sends a school membership invitation with a password setup link.
 */
export async function sendSchoolMemberInvitation(
  email: string,
  schoolName: string
) {
  const issued = await issuePasswordSetupLink(email);

  if (!issued) return false;

  try {
    await sendSchoolMemberInvitationEmail(
      issued.user.email,
      schoolName,
      issued.resetUrl
    );
  } catch (error) {
    logger.error(
      "AUTH",
      `Failed to send school invitation email for user: ${issued.user.id}`,
      error
    );
    return false;
  }

  logger.info("AUTH", `School invitation sent to user: ${issued.user.id}`);
  return true;
}

/**
 * Consumes a valid reset token, updates the password, invalidates every other
 * outstanding reset token, and revokes existing sessions via `tokenVersion`.
 */
export async function resetPassword(input: ResetPasswordInput) {
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashResetToken(input.token) },
    include: { user: { select: { id: true, status: true } } },
  });

  const isExpired = record ? record.expiresAt.getTime() <= Date.now() : true;

  if (
    !record ||
    record.usedAt ||
    isExpired ||
    record.user.status !== "ACTIVE"
  ) {
    throw new AuthError(
      "This password reset link is invalid or has expired.",
      400
    );
  }

  const passwordHash = await hashPassword(input.password);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: {
        passwordHash,
        tokenVersion: { increment: 1 },
      },
    }),
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    prisma.passwordResetToken.deleteMany({
      where: { userId: record.userId, id: { not: record.id } },
    }),
  ]);

  logger.info("AUTH", `Password reset completed for user: ${record.userId}`);

  return { message: "Your password has been reset successfully." };
}
