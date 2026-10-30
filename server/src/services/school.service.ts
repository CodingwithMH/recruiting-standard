import { Prisma, PrismaClient, School, type SchoolStatus } from "@prisma/client";
import crypto from "node:crypto";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { generateCandidateSchoolId } from "../utils/schoolId.js";
import { hashPassword } from "../utils/password.js";
import { requestPasswordReset } from "./auth.service.js";
import { logger } from "../utils/logger.js";

const MAX_SCHOOL_ID_ATTEMPTS = 25;

type SchoolClient = Pick<PrismaClient, "school">;

// ----------------------------------------------------
// Validation Schemas
// ----------------------------------------------------

export const schoolRegistrationSchema = z.object({
  schoolName: z.string().min(2, "School name must be at least 2 characters").max(150),
  athleticDirectorName: z.string().min(2, "Contact / Director name is required").max(100),
  contactEmail: z.string().email("A valid institutional email is required"),
  contactPhone: z.string().min(7, "A valid contact phone number is required").max(20),
  address: z.string().min(2, "Street address is required").max(200),
  city: z.string().min(2, "City is required").max(100),
  state: z.string().min(2, "State is required").max(50),
  zipCode: z.string().min(3, "Zip / Postal code is required").max(20),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
  plan: z.enum(["ANNUAL_1500", "MONTHLY_250"]).default("ANNUAL_1500"),
});

export const schoolProfileUpdateSchema = z
  .object({
    name: z.string().min(2, "School name must be at least 2 characters").max(150),
    address: z.string().min(2, "Street address is required").max(200),
    city: z.string().min(2, "City is required").max(100),
    state: z.string().min(2, "State is required").max(50),
    zipCode: z.string().min(3, "Zip / Postal code is required").max(20),
    contactEmail: z.string().email("A valid institutional email is required"),
    contactPhone: z.string().min(7, "A valid contact phone number is required").max(20),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one profile field is required",
  });

export const schoolListQuerySchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "SUSPENDED", "REJECTED"]).optional(),
});

export const addSchoolMemberSchema = z.object({
  email: z.string().email("A valid email address is required"),
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  role: z.enum(["SCHOOL_ADMIN", "COACH_RECRUITER"]).default("COACH_RECRUITER"),
  title: z.string().max(150).optional(),
});

export const updateSchoolMemberSchema = z
  .object({
    role: z.enum(["SCHOOL_ADMIN", "COACH_RECRUITER"]),
    title: z.string().max(150).nullable(),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one membership field is required",
  });

export type SchoolRegistrationInput = z.infer<typeof schoolRegistrationSchema>;
export type SchoolProfileUpdateInput = z.infer<typeof schoolProfileUpdateSchema>;
export type AddSchoolMemberInput = z.infer<typeof addSchoolMemberSchema>;
export type UpdateSchoolMemberInput = z.infer<typeof updateSchoolMemberSchema>;

// ----------------------------------------------------
// Service Errors
// ----------------------------------------------------

export class SchoolNotFoundError extends Error {
  statusCode: number;
  constructor(schoolId: string) {
    super(`School "${schoolId}" was not found`);
    this.name = "SchoolNotFoundError";
    this.statusCode = 404;
  }
}

export class SchoolIdGenerationError extends Error {
  statusCode: number;
  constructor() {
    super("Unable to allocate a unique permanent School ID");
    this.name = "SchoolIdGenerationError";
    this.statusCode = 500;
  }
}

export class SchoolRegistrationError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.name = "SchoolRegistrationError";
    this.statusCode = statusCode;
  }
}

export class SchoolManagementError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.name = "SchoolManagementError";
    this.statusCode = statusCode;
  }
}

// ----------------------------------------------------
// Service Functions
// ----------------------------------------------------

/**
 * Registers a new school along with an initial School Admin user account.
 * Status is set to PENDING and schoolId remains null until Platform Admin approval.
 */
export async function registerSchool(input: SchoolRegistrationInput) {
  const normalizedEmail = input.contactEmail.toLowerCase().trim();

  // Check for existing user or school with this email
  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (existingUser) {
    throw new SchoolRegistrationError(
      "An account with this institutional email address already exists. Please log in or use another email.",
      409
    );
  }

  const existingSchool = await prisma.school.findFirst({
    where: { contactEmail: normalizedEmail },
  });

  if (existingSchool) {
    throw new SchoolRegistrationError(
      "A school registration with this contact email is already registered or pending review.",
      409
    );
  }

  // Parse name into first and last name
  const nameParts = input.athleticDirectorName.trim().split(/\s+/);
  const firstName = nameParts[0] || "Athletic";
  const lastName = nameParts.slice(1).join(" ") || "Director";

  // Hash password
  const passwordHash = await hashPassword(input.password);

  // Execute atomic registration in transaction
  const result = await prisma.$transaction(async (tx) => {
    // 1. Create School record in PENDING status
    const school = await tx.school.create({
      data: {
        name: input.schoolName.trim(),
        address: input.address.trim(),
        city: input.city.trim(),
        state: input.state.trim(),
        zipCode: input.zipCode.trim(),
        contactEmail: normalizedEmail,
        contactPhone: input.contactPhone.trim(),
        status: "PENDING",
        schoolId: null, // Immutable School ID is only allocated on approval
      },
    });

    // 2. Create User record as SCHOOL_STAFF
    const user = await tx.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        firstName,
        lastName,
        phone: input.contactPhone.trim(),
        globalRole: "SCHOOL_STAFF",
        status: "ACTIVE",
      },
    });

    // 3. Create SchoolMembership with SCHOOL_ADMIN role
    await tx.schoolMembership.create({
      data: {
        userId: user.id,
        schoolId: school.id,
        role: "SCHOOL_ADMIN",
        title: "Athletic Director",
        status: "ACTIVE",
      },
    });

    // 4. Create initial pending Subscription record
    await tx.subscription.create({
      data: {
        schoolId: school.id,
        plan: input.plan,
        paymentStatus: "PENDING",
        state: "PENDING",
        notes: "Awaiting platform approval and initial payment confirmation",
      },
    });

    return { school, user };
  });

  logger.info(
    "AUTH",
    `New school registration submitted: ${result.school.name} (${result.school.contactEmail}) - Status: PENDING`
  );

  return {
    school: {
      id: result.school.id,
      name: result.school.name,
      contactEmail: result.school.contactEmail,
      status: result.school.status,
      city: result.school.city,
      state: result.school.state,
      createdAt: result.school.createdAt,
    },
    user: {
      id: result.user.id,
      email: result.user.email,
      firstName: result.user.firstName,
      lastName: result.user.lastName,
      globalRole: result.user.globalRole,
    },
    status: "PENDING",
    message:
      "School registration received successfully. Your account is currently pending review by Platform Administration. Once verified, your permanent School ID will be issued.",
  };
}

/**
 * Approves a pending school and assigns its permanent, immutable School ID.
 *
 * Rules:
 * - A School ID is allocated exactly once and is never regenerated or reused.
 * - Re-approving an already-approved school returns the existing record.
 * - Concurrent approvals are safe thanks to the unique constraint on `schoolId`.
 */
export async function approveSchool(
  schoolId: string,
  approvedById: string,
  db: SchoolClient = prisma
): Promise<School> {
  const school = await db.school.findUnique({ where: { id: schoolId } });

  if (!school) {
    throw new SchoolNotFoundError(schoolId);
  }

  if (school.schoolId) {
    if (school.status === "APPROVED") {
      return school;
    }

    return db.school.update({
      where: { id: schoolId },
      data: {
        status: "APPROVED",
        approvedAt: new Date(),
        approvedById,
      },
    });
  }

  for (let attempt = 0; attempt < MAX_SCHOOL_ID_ATTEMPTS; attempt++) {
    const candidate = generateCandidateSchoolId();

    try {
      return await db.school.update({
        where: { id: schoolId },
        data: {
          schoolId: candidate,
          status: "APPROVED",
          approvedAt: new Date(),
          approvedById,
        },
      });
    } catch (error) {
      const isCollision =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002";

      if (!isCollision) {
        throw error;
      }
    }
  }

  throw new SchoolIdGenerationError();
}

/**
 * Lists schools for Platform Admin review, optionally filtered by status.
 */
export async function listSchools(status?: SchoolStatus) {
  return prisma.school.findMany({
    where: status ? { status } : undefined,
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      schoolId: true,
      name: true,
      contactEmail: true,
      contactPhone: true,
      address: true,
      city: true,
      state: true,
      zipCode: true,
      status: true,
      approvedAt: true,
      createdAt: true,
      _count: { select: { memberships: true } },
    },
  });
}

/**
 * Returns a school profile for an authorized Platform Admin or school member.
 */
export async function getSchoolProfile(schoolId: string) {
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: {
      id: true,
      schoolId: true,
      name: true,
      address: true,
      city: true,
      state: true,
      zipCode: true,
      contactEmail: true,
      contactPhone: true,
      status: true,
      approvedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!school) {
    throw new SchoolNotFoundError(schoolId);
  }

  return school;
}

/**
 * Updates editable school profile fields. School ID and status are immutable here.
 */
export async function updateSchoolProfile(
  schoolId: string,
  input: SchoolProfileUpdateInput
) {
  const existing = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { id: true },
  });

  if (!existing) {
    throw new SchoolNotFoundError(schoolId);
  }

  return prisma.school.update({
    where: { id: schoolId },
    data: {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.address !== undefined ? { address: input.address.trim() } : {}),
      ...(input.city !== undefined ? { city: input.city.trim() } : {}),
      ...(input.state !== undefined ? { state: input.state.trim() } : {}),
      ...(input.zipCode !== undefined ? { zipCode: input.zipCode.trim() } : {}),
      ...(input.contactEmail !== undefined
        ? { contactEmail: input.contactEmail.toLowerCase().trim() }
        : {}),
      ...(input.contactPhone !== undefined
        ? { contactPhone: input.contactPhone.trim() }
        : {}),
    },
    select: {
      id: true,
      schoolId: true,
      name: true,
      address: true,
      city: true,
      state: true,
      zipCode: true,
      contactEmail: true,
      contactPhone: true,
      status: true,
      updatedAt: true,
    },
  });
}

/**
 * Marks a pending registration as rejected. Approved schools must be suspended
 * instead so their permanent School ID is preserved.
 */
export async function rejectSchool(schoolId: string) {
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { id: true, status: true },
  });

  if (!school) {
    throw new SchoolNotFoundError(schoolId);
  }

  if (school.status === "APPROVED") {
    throw new SchoolManagementError(
      "Approved schools cannot be rejected. Suspend the school instead.",
      400
    );
  }

  return prisma.school.update({
    where: { id: schoolId },
    data: { status: "REJECTED" },
    select: {
      id: true,
      schoolId: true,
      name: true,
      status: true,
      updatedAt: true,
    },
  });
}

/**
 * Suspends a school, immediately blocking its members from the portal.
 */
export async function suspendSchool(schoolId: string) {
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { id: true },
  });

  if (!school) {
    throw new SchoolNotFoundError(schoolId);
  }

  return prisma.school.update({
    where: { id: schoolId },
    data: { status: "SUSPENDED" },
    select: {
      id: true,
      schoolId: true,
      name: true,
      status: true,
      updatedAt: true,
    },
  });
}

/**
 * Lists active and invited memberships for a school.
 */
export async function listSchoolMembers(schoolId: string) {
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { id: true },
  });

  if (!school) {
    throw new SchoolNotFoundError(schoolId);
  }

  return prisma.schoolMembership.findMany({
    where: { schoolId, status: { not: "REVOKED" } },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      role: true,
      title: true,
      status: true,
      createdAt: true,
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          status: true,
        },
      },
    },
  });
}

/**
 * Adds an existing school-user to the school or creates a new account and emails
 * a single-use password setup link.
 */
export async function addSchoolMember(
  schoolId: string,
  input: AddSchoolMemberInput
) {
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { id: true },
  });

  if (!school) {
    throw new SchoolNotFoundError(schoolId);
  }

  const normalizedEmail = input.email.toLowerCase().trim();

  const result = await prisma.$transaction(async (tx) => {
    let user = await tx.user.findUnique({ where: { email: normalizedEmail } });
    let invited = false;

    if (!user) {
      const passwordHash = await hashPassword(
        crypto.randomBytes(32).toString("hex")
      );

      user = await tx.user.create({
        data: {
          email: normalizedEmail,
          passwordHash,
          firstName: input.firstName.trim(),
          lastName: input.lastName.trim(),
          globalRole: "SCHOOL_STAFF",
          status: "ACTIVE",
        },
      });
      invited = true;
    } else if (user.globalRole !== "SCHOOL_STAFF") {
      throw new SchoolManagementError(
        "This email belongs to a non-school account and cannot be added to a school.",
        409
      );
    }

    const existing = await tx.schoolMembership.findUnique({
      where: { userId_schoolId: { userId: user.id, schoolId } },
    });

    if (existing?.status === "ACTIVE") {
      throw new SchoolManagementError(
        "This user is already an active member of the school.",
        409
      );
    }

    const membership = existing
      ? await tx.schoolMembership.update({
          where: { id: existing.id },
          data: {
            role: input.role,
            title: input.title?.trim() || null,
            status: "ACTIVE",
          },
        })
      : await tx.schoolMembership.create({
          data: {
            userId: user.id,
            schoolId,
            role: input.role,
            title: input.title?.trim() || null,
            status: "ACTIVE",
          },
        });

    return { membership, invited };
  });

  if (result.invited) {
    await requestPasswordReset({ email: normalizedEmail });
  }

  logger.info(
    "AUTH",
    `School member added to ${schoolId}: ${normalizedEmail} (${input.role})`
  );

  return { member: result.membership, invited: result.invited };
}

/**
 * Updates a school membership's role or title, preventing removal of the last
 * active School Admin.
 */
export async function updateSchoolMember(
  schoolId: string,
  membershipId: string,
  input: UpdateSchoolMemberInput
) {
  const membership = await prisma.schoolMembership.findFirst({
    where: { id: membershipId, schoolId, status: "ACTIVE" },
    select: { id: true, role: true },
  });

  if (!membership) {
    throw new SchoolManagementError("Active membership not found.", 404);
  }

  if (
    membership.role === "SCHOOL_ADMIN" &&
    input.role !== undefined &&
    input.role !== "SCHOOL_ADMIN"
  ) {
    const adminCount = await prisma.schoolMembership.count({
      where: { schoolId, role: "SCHOOL_ADMIN", status: "ACTIVE" },
    });

    if (adminCount <= 1) {
      throw new SchoolManagementError(
        "A school must retain at least one active School Admin.",
        400
      );
    }
  }

  return prisma.schoolMembership.update({
    where: { id: membership.id },
    data: {
      ...(input.role !== undefined ? { role: input.role } : {}),
      ...(input.title !== undefined
        ? { title: input.title?.trim() || null }
        : {}),
    },
    select: {
      id: true,
      role: true,
      title: true,
      status: true,
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });
}

/**
 * Revokes a membership. The user account is retained for audit/history.
 */
export async function removeSchoolMember(
  schoolId: string,
  membershipId: string
) {
  const membership = await prisma.schoolMembership.findFirst({
    where: { id: membershipId, schoolId },
    select: { id: true, role: true, status: true },
  });

  if (!membership) {
    throw new SchoolManagementError("Membership not found.", 404);
  }

  if (membership.status === "REVOKED") {
    return { id: membership.id, status: "REVOKED" as const };
  }

  if (membership.role === "SCHOOL_ADMIN") {
    const adminCount = await prisma.schoolMembership.count({
      where: { schoolId, role: "SCHOOL_ADMIN", status: "ACTIVE" },
    });

    if (adminCount <= 1) {
      throw new SchoolManagementError(
        "A school must retain at least one active School Admin.",
        400
      );
    }
  }

  return prisma.schoolMembership.update({
    where: { id: membership.id },
    data: { status: "REVOKED" },
    select: { id: true, status: true },
  });
}
