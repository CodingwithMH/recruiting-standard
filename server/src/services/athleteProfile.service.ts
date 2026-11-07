import { z } from "zod";
import { Prisma } from "@prisma/client";
import type { AthleteProfile } from "@prisma/client";
import { prisma } from "../config/prisma.js";

export const MAX_SPORTS = 10;
export const MAX_POSITIONS_PER_SPORT = 10;
export const MAX_STATS_PER_SPORT = 20;
export const MAX_HIGHLIGHT_LINKS = 10;

export class AthleteProfileError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "AthleteProfileError";
    this.statusCode = statusCode;
  }
}

const optionalNumber = (min: number, max: number) =>
  z.preprocess(
    (value) => (value === "" || value === null || value === undefined ? undefined : value),
    z.coerce.number().min(min).max(max).optional()
  );

export const athleteSportSchema = z.object({
  sport: z.string().trim().min(1, "A sport name is required").max(100),
  isPrimary: z.boolean().optional(),
  positions: z
    .array(z.string().trim().min(1).max(100))
    .max(MAX_POSITIONS_PER_SPORT)
    .default([]),
  statistics: z
    .array(
      z.object({
        label: z.string().trim().min(1, "A stat label is required").max(80),
        value: z.string().trim().min(1, "A stat value is required").max(80),
      })
    )
    .max(MAX_STATS_PER_SPORT)
    .default([]),
});

export const athleteProfileUpdateSchema = z.object({
  graduationYear: z.coerce
    .number()
    .int()
    .min(2020, "Expected graduation year must be 2020 or later")
    .max(2040, "Expected graduation year must be 2040 or earlier"),
  sports: z
    .array(athleteSportSchema)
    .min(1, "Add at least one sport")
    .max(MAX_SPORTS),
  heightInches: optionalNumber(36, 96),
  weightLbs: optionalNumber(50, 500),
  academic: z
    .object({
      gpa: optionalNumber(0, 4),
      actScore: optionalNumber(1, 36),
      satScore: optionalNumber(400, 1600),
      highSchoolName: z.string().trim().max(150).nullable().optional(),
      city: z.string().trim().max(100).nullable().optional(),
      state: z.string().trim().max(100).nullable().optional(),
    })
    .optional(),
  highlightLinks: z
    .array(
      z
        .string()
        .trim()
        .url("Highlight links must be valid URLs")
        .refine(
          (value) => /^https?:\/\//i.test(value),
          "Highlight links must start with http:// or https://"
        )
    )
    .max(MAX_HIGHLIGHT_LINKS)
    .default([]),
});

export type AthleteSportInput = z.infer<typeof athleteSportSchema>;
export type AthleteProfileUpdateInput = z.infer<
  typeof athleteProfileUpdateSchema
>;

export type StoredSport = AthleteSportInput & { isPrimary: boolean };

function dedupeStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const raw of values) {
    const value = raw.trim();
    const key = value.toLowerCase();
    if (!value || seen.has(key)) continue;
    seen.add(key);
    result.push(value);
  }

  return result;
}

function cleanOptionalString(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function normalizeSportEntries(entries: AthleteSportInput[]): StoredSport[] {
  const seen = new Set<string>();
  const cleaned: StoredSport[] = [];

  for (const entry of entries) {
    const sport = entry.sport.trim();
    const key = sport.toLowerCase();
    if (!sport || seen.has(key)) continue;
    seen.add(key);

    cleaned.push({
      sport,
      isPrimary: entry.isPrimary === true,
      positions: dedupeStrings(entry.positions),
      statistics: entry.statistics.map((stat) => ({
        label: stat.label.trim(),
        value: stat.value.trim(),
      })),
    });
  }

  if (cleaned.length === 0) {
    throw new AthleteProfileError("Add at least one sport to your profile.", 400);
  }

  const requestedPrimary = cleaned.findIndex((entry) => entry.isPrimary);

  return cleaned.map((entry, index) => ({
    ...entry,
    isPrimary: index === (requestedPrimary >= 0 ? requestedPrimary : 0),
  }));
}

export function calculateCompletionPercentage(input: {
  graduationYear: number;
  sports: StoredSport[];
  heightInches?: number;
  weightLbs?: number;
  academic?: AthleteProfileUpdateInput["academic"];
  highlightLinks: string[];
}): number {
  const hasPositions = input.sports.some((sport) => sport.positions.length > 0);
  const hasStatistics = input.sports.some(
    (sport) => sport.statistics.length > 0
  );
  const hasTestScore =
    input.academic?.actScore !== undefined ||
    input.academic?.satScore !== undefined;

  const checks = [
    Number.isFinite(input.graduationYear),
    input.sports.length > 0,
    hasPositions,
    hasStatistics,
    input.academic?.gpa !== undefined,
    hasTestScore,
    Boolean(input.academic?.highSchoolName),
    Boolean(input.academic?.city || input.academic?.state),
    input.highlightLinks.length > 0,
    input.heightInches !== undefined && input.weightLbs !== undefined,
  ];

  return Math.round(
    (checks.filter(Boolean).length / checks.length) * 100
  );
}

const storedSportSchema = athleteSportSchema.extend({
  isPrimary: z.boolean(),
});

function parseStoredSports(profile: AthleteProfile): StoredSport[] {
  const stats = profile.athleticStats as { sports?: unknown } | null;

  if (stats && Array.isArray(stats.sports)) {
    const parsed = z.array(storedSportSchema).safeParse(stats.sports);
    if (parsed.success && parsed.data.length > 0) {
      return parsed.data;
    }
  }

  const sportNames = profile.sports.length
    ? profile.sports
    : [profile.primarySport];

  return sportNames.map((sport, index) => ({
    sport,
    isPrimary: sport === profile.primarySport || index === 0,
    positions: sport === profile.primarySport ? profile.positions : [],
    statistics: [],
  }));
}

function serializeProfile(profile: AthleteProfile) {
  return {
    id: profile.id,
    userId: profile.userId,
    graduationYear: profile.graduationYear,
    sports: parseStoredSports(profile),
    heightInches: profile.heightInches,
    weightLbs: profile.weightLbs,
    academic: {
      gpa: profile.gpa,
      actScore: profile.actScore,
      satScore: profile.satScore,
      highSchoolName: profile.highSchoolName,
      city: profile.city,
      state: profile.state,
    },
    highlightLinks: profile.highlightLinks,
    completionPercentage: profile.completionPercentage,
    verificationStatus: profile.verificationStatus,
    verifiedAt: profile.verifiedAt,
    updatedAt: profile.updatedAt,
  };
}

export async function getAthleteProfile(userId: string) {
  const profile = await prisma.athleteProfile.findUnique({
    where: { userId },
  });

  return profile ? serializeProfile(profile) : null;
}

export async function updateAthleteProfile(
  userId: string,
  input: AthleteProfileUpdateInput
) {
  const sports = normalizeSportEntries(input.sports);
  const primarySport = sports.find((sport) => sport.isPrimary)?.sport;
  if (!primarySport) {
    throw new AthleteProfileError("Select a primary sport.", 400);
  }

  const positions = dedupeStrings(
    sports.flatMap((sport) => sport.positions)
  );
  const highlightLinks = dedupeStrings(input.highlightLinks);
  const academic = input.academic ?? {};

  const completionPercentage = calculateCompletionPercentage({
    graduationYear: input.graduationYear,
    sports,
    heightInches: input.heightInches,
    weightLbs: input.weightLbs,
    academic,
    highlightLinks,
  });

  const data = {
    graduationYear: input.graduationYear,
    sports: sports.map((sport) => sport.sport),
    primarySport,
    positions,
    heightInches: input.heightInches ?? null,
    weightLbs: input.weightLbs ?? null,
    gpa: academic.gpa ?? null,
    actScore: academic.actScore ?? null,
    satScore: academic.satScore ?? null,
    highSchoolName: cleanOptionalString(academic.highSchoolName),
    city: cleanOptionalString(academic.city),
    state: cleanOptionalString(academic.state),
    highlightLinks,
    athleticStats: {
      sports,
    } as unknown as Prisma.InputJsonValue,
    completionPercentage,
  };

  const profile = await prisma.athleteProfile.upsert({
    where: { userId },
    create: {
      userId,
      ...data,
    },
    update: data,
  });

  return serializeProfile(profile);
}

export async function getAthleteProfileById(profileId: string) {
  const profile = await prisma.athleteProfile.findFirst({
    where: {
      id: profileId,
      user: { status: "ACTIVE", globalRole: "ATHLETE" },
    },
    include: {
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
            orderBy: { createdAt: "asc" },
          },
        },
      },
    },
  });

  if (!profile) {
    throw new AthleteProfileError("Athlete profile not found.", 404);
  }

  const { user, ...record } = profile;

  return {
    ...serializeProfile(record),
    athlete: user,
  };
}
