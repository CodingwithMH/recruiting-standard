import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { hashPassword, comparePassword } from "../utils/password.js";
import { signToken, type JwtPayload } from "../utils/jwt.js";
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

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

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
      createdAt: true,
    },
  });

  const tokenPayload: JwtPayload = {
    userId: user.id,
    email: user.email,
    globalRole: user.globalRole,
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
  };

  const token = signToken(tokenPayload);

  logger.info("AUTH", `User logged in: ${user.email} (${user.globalRole})`);

  const { passwordHash: _ph, ...userWithoutPassword } = user;

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
