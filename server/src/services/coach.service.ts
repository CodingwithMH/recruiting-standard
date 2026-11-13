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
  // Positions and events share the same profile field (e.g. "Point Guard", "100m").
  position: z.string().trim().min(1).max(100).optional(),
  // City, state, or "City, ST" — matched against the athlete's location fields.
  location: z.string().trim().min(1).max(100).optional(),
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
  lastContactAt: z.coerce.date().nullable().optional(),
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
      committedDate: z.string().optional(),
      details: z.string().max(2000).optional(),
      transferStatus: z.string().max(100).optional(),
      transferDetails: z.string().max(2000).optional(),
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
  highlightLinks: true,
  athleticStats: true,
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

/**
 * Builds common casing variants so free-text sport/position matches work even
 * when the stored value differs only by capitalization (e.g. "point guard").
 */
function caseVariants(value: string): string[] {
  const trimmed = value.trim();
  if (!trimmed) return [];

  const titleCase = trimmed
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());

  return Array.from(
    new Set([trimmed, trimmed.toLowerCase(), trimmed.toUpperCase(), titleCase])
  );
}

function buildLocationFilter(location: string): Prisma.AthleteProfileWhereInput {
  const [cityPart, ...stateParts] = location.split(",");
  const city = cityPart?.trim() ?? "";
  const state = stateParts.join(",").trim();

  if (state) {
    return {
      ...(city
        ? { city: { contains: city, mode: "insensitive" as const } }
        : {}),
      state: { equals: state, mode: "insensitive" },
    };
  }

  return {
    OR: [
      { city: { contains: location, mode: "insensitive" } },
      { state: { contains: location, mode: "insensitive" } },
    ],
  };
}

/**
 * Search is intentionally restricted to APPROVED athlete profiles. Filtering
 * is limited to sport, graduation year, position/event, and location; `search`
 * remains an optional name keyword.
 */
export function buildAthleteSearchWhere(
  query: AthleteSearchQuery
): Prisma.AthleteProfileWhereInput {
  const { sport, graduationYear, position, location, search } = query;

  const userWhere: Prisma.UserWhereInput = {
    status: "ACTIVE",
    globalRole: "ATHLETE",
  };

  if (search) {
    userWhere.OR = [
      { firstName: { contains: search, mode: "insensitive" } },
      { lastName: { contains: search, mode: "insensitive" } },
    ];
  }

  const filters: Prisma.AthleteProfileWhereInput[] = [];

  if (sport) {
    filters.push({
      OR: [
        { primarySport: { contains: sport, mode: "insensitive" } },
        { sports: { hasSome: caseVariants(sport) } },
      ],
    });
  }

  if (position) {
    filters.push({
      positions: { hasSome: caseVariants(position) },
    });
  }

  if (location) {
    filters.push(buildLocationFilter(location));
  }

  const where: Prisma.AthleteProfileWhereInput = {
    verificationStatus: "APPROVED",
    user: userWhere,
  };

  if (graduationYear !== undefined) {
    where.graduationYear = graduationYear;
  }

  if (filters.length > 0) {
    where.AND = filters;
  }

  return where;
}

export async function searchAthletes(query: AthleteSearchQuery) {
  const { page, limit } = query;
  const skip = (page - 1) * limit;
  const where = buildAthleteSearchWhere(query);

  const [total, athletes] = await Promise.all([
    prisma.athleteProfile.count({ where }),
    prisma.athleteProfile.findMany({
      where,
      select: athletePublicSelect,
      orderBy: [{ graduationYear: "asc" }, { updatedAt: "desc" }],
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
  // Only approved, active athlete profiles can be saved as prospects. This
  // keeps the watchlist consistent with approved-only talent search.
  const athleteProfile = await prisma.athleteProfile.findFirst({
    where: {
      id: input.athleteProfileId,
      verificationStatus: "APPROVED",
      user: { status: "ACTIVE", globalRole: "ATHLETE" },
    },
    select: { id: true },
  });

  if (!athleteProfile) {
    throw new CoachError("Approved athlete profile not found.", 404);
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
        "This athlete is already in your prospect watchlist.",
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

export async function deleteRecruitingRecord(
  schoolId: string,
  recordId: string
) {
  const existing = await prisma.recruitingRecord.findFirst({
    where: { id: recordId, schoolId },
    select: { id: true },
  });

  if (!existing) {
    throw new CoachError("Recruiting record not found.", 404);
  }

  await prisma.recruitingRecord.delete({
    where: { id: recordId },
  });

  return { success: true };
}

