import { Prisma, PrismaClient, School } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { generateCandidateSchoolId } from "../utils/schoolId.js";
import { hashPassword } from "../utils/password.js";
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

export type SchoolRegistrationInput = z.infer<typeof schoolRegistrationSchema>;

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
