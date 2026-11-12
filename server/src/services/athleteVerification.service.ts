import { Prisma } from "@prisma/client";
import type { VerificationStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../config/prisma.js";

export class AthleteVerificationError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "AthleteVerificationError";
    this.statusCode = statusCode;
  }
}

export const athleteVerificationQuerySchema = z.object({
  status: z
    .enum(["UNVERIFIED", "PENDING", "APPROVED", "REJECTED"])
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export type AthleteVerificationQuery = z.infer<
  typeof athleteVerificationQuerySchema
>;

export const athleteVerificationReviewSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  notes: z.string().trim().max(2000).nullable().optional(),
});

export type AthleteVerificationReviewInput = z.infer<
  typeof athleteVerificationReviewSchema
>;

export type VerificationReviewReason = "ALLOWED" | "NOT_PENDING";

export interface VerificationReviewDecision {
  allowed: boolean;
  reason: VerificationReviewReason;
}

/**
 * Pure policy for whether a profile may be reviewed. Only profiles the
 * athlete explicitly submitted (PENDING) can be approved or rejected, which
 * prevents admins from accidentally verifying profiles that were never
 * submitted for review.
 */
export function evaluateVerificationReview(input: {
  currentStatus: VerificationStatus;
}): VerificationReviewDecision {
  return input.currentStatus === "PENDING"
    ? { allowed: true, reason: "ALLOWED" }
    : { allowed: false, reason: "NOT_PENDING" };
}

/**
 * Rejections must carry reviewer notes so the athlete receives actionable
 * feedback in their portal. Approval notes stay optional.
 */
export function assertVerificationReviewNotes(
  status: "APPROVED" | "REJECTED",
  notes: string | null
): void {
  if (status === "REJECTED" && !notes) {
    throw new AthleteVerificationError(
      "Add notes explaining why the athlete profile was rejected.",
      400
    );
  }
}

const verificationQueueSelect = {
  id: true,
  primarySport: true,
  sports: true,
  graduationYear: true,
  completionPercentage: true,
  verificationStatus: true,
  verificationNotes: true,
  submittedForVerificationAt: true,
  verifiedAt: true,
  updatedAt: true,
  user: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      status: true,
    },
  },
} satisfies Prisma.AthleteProfileSelect;

export async function listAthleteProfilesForReview(
  query: AthleteVerificationQuery
) {
  const { status, page, limit } = query;
  const where: Prisma.AthleteProfileWhereInput = status
    ? { verificationStatus: status }
    : {};
  const skip = (page - 1) * limit;

  const [total, profiles] = await Promise.all([
    prisma.athleteProfile.count({ where }),
    prisma.athleteProfile.findMany({
      where,
      select: verificationQueueSelect,
      orderBy: [
        { verificationStatus: "asc" },
        { submittedForVerificationAt: "asc" },
        { updatedAt: "asc" },
      ],
      skip,
      take: limit,
    }),
  ]);

  // Document review summary per athlete so admins can cross-check the
  // transcript/eligibility queue while deciding on the profile itself.
  const documentCounts = await prisma.document.groupBy({
    by: ["athleteProfileId", "status"],
    where: {
      athleteProfileId: { in: profiles.map((profile) => profile.id) },
    },
    _count: { _all: true },
  });

  const countsByProfile = new Map<
    string,
    { approved: number; pending: number; rejected: number }
  >();

  for (const row of documentCounts) {
    const entry =
      countsByProfile.get(row.athleteProfileId) ??
      { approved: 0, pending: 0, rejected: 0 };
    if (row.status === "APPROVED") entry.approved = row._count._all;
    if (row.status === "PENDING") entry.pending = row._count._all;
    if (row.status === "REJECTED") entry.rejected = row._count._all;
    countsByProfile.set(row.athleteProfileId, entry);
  }

  return {
    athletes: profiles.map((profile) => ({
      id: profile.id,
      primarySport: profile.primarySport,
      sports: profile.sports,
      graduationYear: profile.graduationYear,
      completionPercentage: profile.completionPercentage,
      verificationStatus: profile.verificationStatus,
      verificationNotes: profile.verificationNotes,
      submittedAt: profile.submittedForVerificationAt,
      verifiedAt: profile.verifiedAt,
      updatedAt: profile.updatedAt,
      user: profile.user,
      documents:
        countsByProfile.get(profile.id) ??
        { approved: 0, pending: 0, rejected: 0 },
    })),
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

const verificationReviewSelect = {
  id: true,
  verificationStatus: true,
  verificationNotes: true,
  submittedForVerificationAt: true,
  verifiedAt: true,
  updatedAt: true,
} satisfies Prisma.AthleteProfileSelect;

export async function reviewAthleteProfileVerification(
  reviewerId: string,
  athleteProfileId: string,
  input: AthleteVerificationReviewInput
) {
  const notes = input.notes?.trim() || null;

  assertVerificationReviewNotes(input.status, notes);

  const existing = await prisma.athleteProfile.findUnique({
    where: { id: athleteProfileId },
    select: { verificationStatus: true },
  });

  if (!existing) {
    throw new AthleteVerificationError("Athlete profile not found.", 404);
  }

  const decision = evaluateVerificationReview({
    currentStatus: existing.verificationStatus,
  });

  if (!decision.allowed) {
    throw new AthleteVerificationError(
      "Only profiles submitted for verification can be approved or rejected.",
      409
    );
  }

  // When approving, ensure all submitted documents are reviewed and approved.
  if (input.status === "APPROVED") {
    const documentCounts = await prisma.document.groupBy({
      by: ["status"],
      where: { athleteProfileId },
      _count: { _all: true },
    });

    const totalDocs = documentCounts.reduce(
      (sum, g) => sum + (g._count?._all ?? 0),
      0
    );
    const pendingDocs =
      documentCounts.find((g) => g.status === "PENDING")?._count?._all ?? 0;
    const rejectedDocs =
      documentCounts.find((g) => g.status === "REJECTED")?._count?._all ?? 0;

    if (totalDocs === 0) {
      throw new AthleteVerificationError(
        "Cannot approve: the athlete has not uploaded any documents yet.",
        409
      );
    }

    if (pendingDocs > 0 || rejectedDocs > 0) {
      throw new AthleteVerificationError(
        `Cannot approve: ${pendingDocs} document(s) are still pending review and ${rejectedDocs} document(s) have been rejected. All documents must be approved first.`,
        409
      );
    }
  }

  return prisma.athleteProfile.update({
    where: { id: athleteProfileId },
    data: {
      verificationStatus: input.status,
      verificationNotes: notes,
      verifiedAt: input.status === "APPROVED" ? new Date() : null,
      verifiedById: input.status === "APPROVED" ? reviewerId : null,
    },
    select: verificationReviewSelect,
  });
}
