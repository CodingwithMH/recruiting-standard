import { z } from "zod";
import { Prisma } from "@prisma/client";
import type { AthleteProfile, VerificationStatus } from "@prisma/client";
import { prisma } from "../config/prisma.js";

export const MAX_SPORTS = 10;
export const MAX_POSITIONS_PER_SPORT = 10;
export const MAX_STATS_PER_SPORT = 20;
export const MAX_HIGHLIGHT_LINKS = 10;

/** Minimum profile completion (0-100%) required to submit for verification. */
export const MIN_SUBMISSION_COMPLETION = 80;

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

export interface CompletionAcademicInput {
  gpa?: number | null;
  actScore?: number | null;
  satScore?: number | null;
  highSchoolName?: string | null;
  city?: string | null;
  state?: string | null;
}

export interface CompletionBreakdownInput {
  graduationYear: number;
  sports: StoredSport[];
  heightInches?: number | null;
  weightLbs?: number | null;
  academic?: CompletionAcademicInput | null;
  highlightLinks: string[];
}

export interface CompletionItem {
  key: string;
  label: string;
  complete: boolean;
}

export interface CompletionBreakdown {
  percentage: number;
  items: CompletionItem[];
}

function isPresent(value: unknown): boolean {
  return value !== null && value !== undefined && value !== "";
}

/**
 * Evaluates the same ten profile checks that drive the stored
 * completionPercentage, but keeps each individual result so the athlete UI can
 * render a "what's missing" checklist alongside the 0-100% indicator.
 */
export function getCompletionBreakdown(
  input: CompletionBreakdownInput
): CompletionBreakdown {
  const hasPositions = input.sports.some((sport) => sport.positions.length > 0);
  const hasStatistics = input.sports.some(
    (sport) => sport.statistics.length > 0
  );
  const hasTestScore =
    isPresent(input.academic?.actScore) || isPresent(input.academic?.satScore);
  const hasLocation =
    isPresent(input.academic?.city) || isPresent(input.academic?.state);

  const items: CompletionItem[] = [
    {
      key: "graduationYear",
      label: "Expected graduation year",
      complete: Number.isFinite(input.graduationYear),
    },
    {
      key: "sports",
      label: "At least one sport",
      complete: input.sports.length > 0,
    },
    {
      key: "positions",
      label: "Positions or events for a sport",
      complete: hasPositions,
    },
    {
      key: "statistics",
      label: "Athletic statistics",
      complete: hasStatistics,
    },
    {
      key: "gpa",
      label: "GPA",
      complete: isPresent(input.academic?.gpa),
    },
    {
      key: "testScore",
      label: "ACT or SAT score",
      complete: hasTestScore,
    },
    {
      key: "highSchoolName",
      label: "High school name",
      complete: isPresent(input.academic?.highSchoolName),
    },
    {
      key: "location",
      label: "City or state/region",
      complete: hasLocation,
    },
    {
      key: "highlightLinks",
      label: "At least one highlight link",
      complete: input.highlightLinks.length > 0,
    },
    {
      key: "measurements",
      label: "Height and weight",
      complete:
        isPresent(input.heightInches) && isPresent(input.weightLbs),
    },
  ];

  return {
    percentage: Math.round(
      (items.filter((item) => item.complete).length / items.length) * 100
    ),
    items,
  };
}

export function calculateCompletionPercentage(
  input: CompletionBreakdownInput
): number {
  return getCompletionBreakdown(input).percentage;
}

export type VerificationSubmissionReason =
  | "ALLOWED"
  | "ALREADY_PENDING"
  | "ALREADY_APPROVED"
  | "MUST_UPDATE_BEFORE_RESUBMIT"
  | "PROFILE_INCOMPLETE";

export interface VerificationSubmissionDecision {
  allowed: boolean;
  reason: VerificationSubmissionReason;
  missingItemCount: number;
}

/**
 * Pure policy for whether an athlete may submit their profile for
 * verification. Database-dependent facts are supplied by the caller so the
 * rule can be unit tested without a database.
 */
export function evaluateVerificationSubmission(input: {
  verificationStatus: VerificationStatus;
  completionPercentage: number;
  missingItemCount: number;
}): VerificationSubmissionDecision {
  const decision = {
    missingItemCount: input.missingItemCount,
  } as VerificationSubmissionDecision;

  if (input.verificationStatus === "PENDING") {
    return { ...decision, allowed: false, reason: "ALREADY_PENDING" };
  }

  if (input.verificationStatus === "APPROVED") {
    return { ...decision, allowed: false, reason: "ALREADY_APPROVED" };
  }

  if (input.verificationStatus === "REJECTED") {
    return { ...decision, allowed: false, reason: "MUST_UPDATE_BEFORE_RESUBMIT" };
  }

  if (input.completionPercentage < MIN_SUBMISSION_COMPLETION) {
    return { ...decision, allowed: false, reason: "PROFILE_INCOMPLETE" };
  }

  return { ...decision, allowed: true, reason: "ALLOWED" };
}

export function verificationSubmissionMessage(
  decision: VerificationSubmissionDecision
): string {
  switch (decision.reason) {
    case "ALREADY_PENDING":
      return "Your profile has already been submitted and is awaiting verification.";
    case "ALREADY_APPROVED":
      return "Your profile is already verified. Save an update to your profile to resubmit it for verification.";
    case "MUST_UPDATE_BEFORE_RESUBMIT":
      return "Address the reviewer feedback and save an update to your profile before resubmitting it for verification.";
    case "PROFILE_INCOMPLETE":
      return `Complete at least ${MIN_SUBMISSION_COMPLETION}% of your profile before submitting it for verification. ${decision.missingItemCount} checklist item${
        decision.missingItemCount === 1 ? "" : "s"
      } still missing.`;
    default:
      return "";
  }
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

function buildBreakdownFromProfile(profile: AthleteProfile) {
  return getCompletionBreakdown({
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
  });
}

function serializeProfile(profile: AthleteProfile) {
  const breakdown = buildBreakdownFromProfile(profile);

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
    completionChecklist: breakdown.items,
    verificationStatus: profile.verificationStatus,
    verificationNotes: profile.verificationNotes,
    submittedAt: profile.submittedForVerificationAt,
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

  const existing = await prisma.athleteProfile.findUnique({
    where: { userId },
    select: { verificationStatus: true },
  });

  // Editing a reviewed profile invalidates the previous verification decision:
  // the athlete must resubmit the updated profile for a fresh review.
  const verificationReset =
    existing &&
    (existing.verificationStatus === "APPROVED" ||
      existing.verificationStatus === "REJECTED")
      ? {
          verificationStatus: "UNVERIFIED" as const,
          verificationNotes: null,
          submittedForVerificationAt: null,
          verifiedAt: null,
          verifiedById: null,
        }
      : {};

  const profile = await prisma.athleteProfile.upsert({
    where: { userId },
    create: {
      userId,
      ...data,
    },
    update: { ...data, ...verificationReset },
  });

  return serializeProfile(profile);
}

export async function submitAthleteProfileForVerification(userId: string) {
  const profile = await prisma.athleteProfile.findUnique({
    where: { userId },
  });

  if (!profile) {
    throw new AthleteProfileError(
      "Create your athlete profile before submitting it for verification.",
      404
    );
  }

  const breakdown = buildBreakdownFromProfile(profile);
  const decision = evaluateVerificationSubmission({
    verificationStatus: profile.verificationStatus,
    completionPercentage: breakdown.percentage,
    missingItemCount: breakdown.items.filter((item) => !item.complete).length,
  });

  if (!decision.allowed) {
    throw new AthleteProfileError(
      verificationSubmissionMessage(decision),
      409
    );
  }

  const submitted = await prisma.athleteProfile.update({
    where: { userId },
    data: {
      verificationStatus: "PENDING",
      submittedForVerificationAt: new Date(),
      verificationNotes: null,
      verifiedAt: null,
      verifiedById: null,
    },
  });

  return serializeProfile(submitted);
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
