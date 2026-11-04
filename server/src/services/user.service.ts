import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { requestPasswordReset } from "./auth.service.js";
import { logger } from "../utils/logger.js";

export const userListQuerySchema = z.object({
  role: z
    .enum(["PLATFORM_ADMIN", "SCHOOL_STAFF", "ATHLETE", "PARENT"])
    .optional(),
  status: z.enum(["PENDING", "ACTIVE", "INACTIVE", "SUSPENDED"]).optional(),
  search: z.string().trim().max(200).optional(),
});

export const updateUserSchema = z
  .object({
    firstName: z.string().min(1).max(100),
    lastName: z.string().min(1).max(100),
    phone: z.string().max(30).nullable(),
    status: z.enum(["PENDING", "ACTIVE", "INACTIVE", "SUSPENDED"]),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one user field is required",
  });

export type UserListQuery = z.infer<typeof userListQuerySchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export class UserManagementError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.name = "UserManagementError";
    this.statusCode = statusCode;
  }
}

const userSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
  globalRole: true,
  status: true,
  dateOfBirth: true,
  schoolId: true,
  createdAt: true,
  updatedAt: true,
  memberships: {
    select: {
      id: true,
      role: true,
      title: true,
      status: true,
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
} as const;

export async function listUsers(query: UserListQuery) {
  const search = query.search?.trim();

  return prisma.user.findMany({
    where: {
      ...(query.role ? { globalRole: query.role } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(search
        ? {
            OR: [
              { email: { contains: search, mode: "insensitive" as const } },
              { firstName: { contains: search, mode: "insensitive" as const } },
              { lastName: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 250,
    select: userSelect,
  });
}

export async function getUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: userSelect,
  });

  if (!user) {
    throw new UserManagementError("User not found.", 404);
  }

  return user;
}

export async function updateUser(userId: string, input: UpdateUserInput) {
  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, globalRole: true, status: true },
  });

  if (!existing) {
    throw new UserManagementError("User not found.", 404);
  }

  const deactivating =
    existing.status === "ACTIVE" &&
    input.status !== undefined &&
    input.status !== "ACTIVE";

  if (existing.globalRole === "PLATFORM_ADMIN" && deactivating) {
    const activeAdmins = await prisma.user.count({
      where: { globalRole: "PLATFORM_ADMIN", status: "ACTIVE" },
    });

    if (activeAdmins <= 1) {
      throw new UserManagementError(
        "The platform must retain at least one active Platform Admin.",
        400
      );
    }
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(input.firstName !== undefined ? { firstName: input.firstName.trim() } : {}),
      ...(input.lastName !== undefined ? { lastName: input.lastName.trim() } : {}),
      ...(input.phone !== undefined
        ? { phone: input.phone?.trim() || null }
        : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(deactivating ? { tokenVersion: { increment: 1 } } : {}),
    },
    select: userSelect,
  });

  logger.info(
    "AUTH",
    `Platform Admin updated user ${userId}${input.status ? ` (status: ${input.status})` : ""}`
  );

  return updated;
}

export async function sendUserPasswordReset(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, status: true },
  });

  if (!user) {
    throw new UserManagementError("User not found.", 404);
  }

  if (user.status !== "ACTIVE") {
    throw new UserManagementError(
      "Password reset emails can only be sent to active accounts.",
      400
    );
  }

  await requestPasswordReset({ email: user.email });

  return {
    message: `A password reset link has been sent to ${user.email}.`,
  };
}
