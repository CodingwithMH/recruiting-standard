import { Prisma, PrismaClient, School } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { generateCandidateSchoolId } from "../utils/schoolId.js";

const MAX_SCHOOL_ID_ATTEMPTS = 25;

type SchoolClient = Pick<PrismaClient, "school">;

export class SchoolNotFoundError extends Error {
  constructor(schoolId: string) {
    super(`School "${schoolId}" was not found`);
    this.name = "SchoolNotFoundError";
  }
}

export class SchoolIdGenerationError extends Error {
  constructor() {
    super("Unable to allocate a unique permanent School ID");
    this.name = "SchoolIdGenerationError";
  }
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
