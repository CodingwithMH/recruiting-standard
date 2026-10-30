import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { env } from "../config/env.js";
import { hashPassword, comparePassword } from "../utils/password.js";
import { signToken, type JwtPayload } from "../utils/jwt.js";
import { generateResetToken, hashResetToken } from "../utils/resetToken.js";
import { sendPasswordResetEmail } from "../utils/email.js";
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

  const passwordHash = await hashPassword(input.password);

  const user = await prisma.user.create({
    data: {
      email: input.email.toLowerCase(),
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone || null,
      globalRole: input.globalRole,
      status: "ACTIVE",
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      globalRole: true,
      status: true,
      tokenVersion: true,
      createdAt: true,
    },
  });

  const tokenPayload: JwtPayload = {
    userId: user.id,
    email: user.email,
    globalRole: user.globalRole,
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
    schoolId: primaryMembership?.schoolId,
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
 * Issues a single-use, time-limited password reset token and emails it to the
 * user. Always returns the same message so callers cannot enumerate accounts.
 */
export async function requestPasswordReset(input: ForgotPasswordInput) {
  const user = await prisma.user.findUnique({
    where: { email: input.email.toLowerCase().trim() },
    select: { id: true, email: true, status: true },
  });

  if (user && user.status === "ACTIVE") {
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

    const resetUrl = `${env.CLIENT_ORIGIN.replace(/\/$/, "")}/reset-password?token=${encodeURIComponent(token)}`;

    try {
      await sendPasswordResetEmail(user.email, resetUrl);
    } catch (error) {
      logger.error(
        "AUTH",
        `Failed to send password reset email for user: ${user.id}`,
        error
      );
    }

    logger.info("AUTH", `Password reset requested for user: ${user.id}`);
  }

  return {
    message:
      "If an account with that email address exists, a password reset link has been sent.",
  };
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
