import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { logger } from "../utils/logger.js";

// ---------------------------------------------------------------------------
// Error class
// ---------------------------------------------------------------------------

export class CoachError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "CoachError";
    this.statusCode = statusCode;
  }
}

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

export const athleteSearchQuerySchema = z.object({
  sport: z.string().trim().min(1).max(100).optional(),
  graduationYear: z.coerce.number().int().min(2020).max(2040).optional(),
  state: z.string().trim().length(2).toUpperCase().optional(),
  position: z.string().trim().min(1).max(100).optional(),
  minGpa: z.coerce.number().min(0).max(4.0).optional(),
  verificationStatus: z
    .enum(["UNVERIFIED", "PENDING", "APPROVED", "REJECTED"])
    .optional(),
  search: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type AthleteSearchQuery = z.infer<typeof athleteSearchQuerySchema>;

export const saveProspectSchema = z.object({
  athleteProfileId: z.string().uuid("A valid athlete profile ID is required"),
  notes: z.string().trim().max(2000).optional(),
});

export type SaveProspectInput = z.infer<typeof saveProspectSchema>;

export const updateProspectNotesSchema = z.object({
  notes: z.string().trim().max(2000).nullable(),
});

export type UpdateProspectNotesInput = z.infer<typeof updateProspectNotesSchema>;

export const updateRecruitingRecordSchema = z.object({
  status: z
    .enum(["EVALUATING", "CONTACTED", "OFFERED", "COMMITTED", "PASSED"])
    .optional(),
  privateNotes: z.string().trim().max(10000).nullable().optional(),
  lastContactAt: z.coerce.date().optional(),
  contactLogs: z
    .array(
      z.object({
        id: z.string(),
        date: z.string(),
        type: z.string().max(80),
        notes: z.string().max(2000).optional(),
        coachName: z.string().max(200).optional(),
      })
    )
    .optional(),
  offers: z
    .array(
      z.object({
        id: z.string(),
        date: z.string(),
        type: z.string().max(80),
        details: z.string().max(2000).optional(),
        status: z.string().max(80).optional(),
      })
    )
    .optional(),
  commitments: z
    .object({
      committedDate: z.string(),
      details: z.string().max(2000).optional(),
    })
    .nullable()
    .optional(),
});

export type UpdateRecruitingRecordInput = z.infer<
  typeof updateRecruitingRecordSchema
>;

// ---------------------------------------------------------------------------
// Athlete search (Coach/Recruiter — approved athletes only)
// ---------------------------------------------------------------------------

/** Shared select projection for a public athlete summary visible to coaches. */
const athletePublicSelect = {
  id: true,
  primarySport: true,
  sports: true,
  positions: true,
  graduationYear: true,
  heightInches: true,
  weightLbs: true,
  gpa: true,
  actScore: true,
  satScore: true,
  highSchoolName: true,
  city: true,
  state: true,
  verificationStatus: true,
  completionPercentage: true,
  user: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      highlightVideos: {
        select: {
          id: true,
          title: true,
          videoUrl: true,
          provider: true,
          durationSeconds: true,
        },
        orderBy: { createdAt: "asc" as const },
        take: 5,
      },
    },
  },
} satisfies Prisma.AthleteProfileSelect;

export async function searchAthletes(query: AthleteSearchQuery) {
  const { sport, graduationYear, state, position, minGpa, verificationStatus, search, page, limit } = query;
  const skip = (page - 1) * limit;

  const where: Prisma.AthleteProfileWhereInput = {
    // Only surface athletes whose account is active
    user: { status: "ACTIVE" },
  };

  if (sport) {
    where.OR = [
      { primarySport: { contains: sport, mode: "insensitive" } },
      { sports: { has: sport } },
    ];
  }

  if (graduationYear) {
    where.graduationYear = graduationYear;
  }

  if (state) {
    where.state = { equals: state, mode: "insensitive" };
  }

  if (position) {
    where.positions = { has: position };
  }

  if (minGpa !== undefined) {
    where.gpa = { gte: minGpa };
  }

  if (verificationStatus) {
    where.verificationStatus = verificationStatus;
  }

  if (search) {
    where.user = {
      status: "ACTIVE",
      OR: [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
      ],
    };
  }

  const [total, athletes] = await Promise.all([
    prisma.athleteProfile.count({ where }),
    prisma.athleteProfile.findMany({
      where,
      select: athletePublicSelect,
      orderBy: [{ verificationStatus: "asc" }, { graduationYear: "asc" }],
      skip,
      take: limit,
    }),
  ]);

  return {
    athletes,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

// ---------------------------------------------------------------------------
// Saved Prospects
// ---------------------------------------------------------------------------

export async function listProspects(schoolId: string, coachUserId: string) {
  return prisma.savedProspect.findMany({
    where: { schoolId, coachUserId },
    select: {
      id: true,
      notes: true,
      savedAt: true,
      coachUserId: true,
      athleteProfile: { select: athletePublicSelect },
    },
    orderBy: { savedAt: "desc" },
  });
}

export async function saveProspect(
  schoolId: string,
  coachUserId: string,
  input: SaveProspectInput
) {
  // Verify the athlete profile exists and belongs to an active athlete
  const athleteProfile = await prisma.athleteProfile.findFirst({
    where: {
      id: input.athleteProfileId,
      user: { status: "ACTIVE", globalRole: "ATHLETE" },
    },
    select: { id: true },
  });

  if (!athleteProfile) {
    throw new CoachError("Athlete profile not found.", 404);
  }

  try {
    return await prisma.savedProspect.create({
      data: {
        schoolId,
        coachUserId,
        athleteProfileId: input.athleteProfileId,
        notes: input.notes,
      },
      select: {
        id: true,
        notes: true,
        savedAt: true,
        athleteProfile: { select: athletePublicSelect },
      },
    });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      throw new CoachError(
        "This athlete is already saved as a prospect by your school.",
        409
      );
    }
    throw err;
  }
}

export async function updateProspectNotes(
  schoolId: string,
  coachUserId: string,
  prospectId: string,
  input: UpdateProspectNotesInput
) {
  const result = await prisma.savedProspect.updateMany({
    where: { id: prospectId, schoolId, coachUserId },
    data: { notes: input.notes },
  });

  if (result.count === 0) {
    throw new CoachError("Prospect not found.", 404);
  }

  return prisma.savedProspect.findUnique({
    where: { id: prospectId },
    select: {
      id: true,
      notes: true,
      savedAt: true,
      athleteProfile: { select: athletePublicSelect },
    },
  });
}

export async function removeProspect(
  schoolId: string,
  coachUserId: string,
  prospectId: string
) {
  const result = await prisma.savedProspect.deleteMany({
    where: { id: prospectId, schoolId, coachUserId },
  });

  if (result.count === 0) {
    throw new CoachError("Prospect not found.", 404);
  }

  logger.info(
    "COACH",
    `Coach ${coachUserId} removed prospect ${prospectId} from school ${schoolId}`
  );
}

// ---------------------------------------------------------------------------
// Recruiting Records
// ---------------------------------------------------------------------------

const recruitingRecordSelect = {
  id: true,
  status: true,
  privateNotes: true,
  lastContactAt: true,
  contactLogs: true,
  offers: true,
  commitments: true,
  createdAt: true,
  updatedAt: true,
  athleteProfile: { select: athletePublicSelect },
} satisfies Prisma.RecruitingRecordSelect;

export async function getOrCreateRecruitingRecord(
  schoolId: string,
  athleteProfileId: string
) {
  // Verify the athlete profile exists and is active
  const athleteProfile = await prisma.athleteProfile.findFirst({
    where: {
      id: athleteProfileId,
      user: { status: "ACTIVE", globalRole: "ATHLETE" },
    },
    select: { id: true },
  });

  if (!athleteProfile) {
    throw new CoachError("Athlete profile not found.", 404);
  }

  return prisma.recruitingRecord.upsert({
    where: { schoolId_athleteProfileId: { schoolId, athleteProfileId } },
    create: { schoolId, athleteProfileId },
    update: {},
    select: recruitingRecordSelect,
  });
}

export async function listRecruitingRecords(
  schoolId: string,
  statusFilter?: string
) {
  const where: Prisma.RecruitingRecordWhereInput = { schoolId };

  if (statusFilter) {
    where.status = statusFilter as never;
  }

  return prisma.recruitingRecord.findMany({
    where,
    select: recruitingRecordSelect,
    orderBy: { updatedAt: "desc" },
  });
}

export async function updateRecruitingRecord(
  schoolId: string,
  recordId: string,
  input: UpdateRecruitingRecordInput
) {
  const existing = await prisma.recruitingRecord.findFirst({
    where: { id: recordId, schoolId },
    select: { id: true },
  });

  if (!existing) {
    throw new CoachError("Recruiting record not found.", 404);
  }

  return prisma.recruitingRecord.update({
    where: { id: recordId },
    data: {
      ...(input.status !== undefined && { status: input.status }),
      ...(input.privateNotes !== undefined && {
        privateNotes: input.privateNotes,
      }),
      ...(input.lastContactAt !== undefined && {
        lastContactAt: input.lastContactAt,
      }),
      ...(input.contactLogs !== undefined && {
        contactLogs: input.contactLogs as Prisma.InputJsonValue,
      }),
      ...(input.offers !== undefined && {
        offers: input.offers as Prisma.InputJsonValue,
      }),
      ...(input.commitments !== undefined && {
        commitments:
          input.commitments === null
            ? Prisma.JsonNull
            : (input.commitments as Prisma.InputJsonValue),
      }),
    },
    select: recruitingRecordSelect,
  });
}

