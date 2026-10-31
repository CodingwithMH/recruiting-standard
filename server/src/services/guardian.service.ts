import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { sendGuardianLinkRequestEmail } from "../utils/email.js";
import { logger } from "../utils/logger.js";

export const requestGuardianLinkSchema = z.object({
  athleteEmail: z.string().email("A valid athlete email address is required"),
});

export type RequestGuardianLinkInput = z.infer<typeof requestGuardianLinkSchema>;

export class GuardianLinkError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.name = "GuardianLinkError";
    this.statusCode = statusCode;
  }
}

const athleteSummary = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  status: true,
} as const;

const guardianSummary = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  status: true,
} as const;

export async function requestGuardianLink(
  parentUserId: string,
  input: RequestGuardianLinkInput
) {
  const parent = await prisma.user.findUnique({
    where: { id: parentUserId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      globalRole: true,
      status: true,
    },
  });

  if (!parent || parent.globalRole !== "PARENT" || parent.status !== "ACTIVE") {
    throw new GuardianLinkError(
      "Only active Parent/Guardian accounts can request an athlete link.",
      403
    );
  }

  const normalizedEmail = input.athleteEmail.toLowerCase().trim();

  const athlete = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { ...athleteSummary, globalRole: true },
  });

  if (
    !athlete ||
    athlete.globalRole !== "ATHLETE" ||
    athlete.status !== "ACTIVE"
  ) {
    throw new GuardianLinkError(
      "No active athlete account was found with that email address.",
      404
    );
  }

  if (athlete.id === parentUserId) {
    throw new GuardianLinkError(
      "A parent account cannot be linked to itself.",
      400
    );
  }

  const existing = await prisma.parentAthleteLink.findUnique({
    where: {
      parentUserId_athleteUserId: {
        parentUserId,
        athleteUserId: athlete.id,
      },
    },
  });

  if (existing?.status === "ACTIVE") {
    throw new GuardianLinkError(
      "This athlete is already linked to your account.",
      409
    );
  }

  if (existing?.status === "PENDING") {
    throw new GuardianLinkError(
      "A link request is already pending this athlete's approval.",
      409
    );
  }

  const link = existing
    ? await prisma.parentAthleteLink.update({
        where: { id: existing.id },
        data: { status: "PENDING", respondedAt: null },
        include: { athlete: { select: athleteSummary } },
      })
    : await prisma.parentAthleteLink.create({
        data: { parentUserId, athleteUserId: athlete.id },
        include: { athlete: { select: athleteSummary } },
      });

  try {
    await sendGuardianLinkRequestEmail(
      athlete.email,
      `${parent.firstName} ${parent.lastName}`,
      athlete.firstName
    );
  } catch (error) {
    logger.error(
      "AUTH",
      `Failed to send guardian link request email to athlete: ${athlete.id}`,
      error
    );
  }

  logger.info(
    "AUTH",
    `Parent ${parentUserId} requested a guardian link to athlete ${athlete.id}`
  );

  return link;
}

export async function listGuardianLinks(parentUserId: string) {
  return prisma.parentAthleteLink.findMany({
    where: { parentUserId },
    orderBy: { createdAt: "desc" },
    include: { athlete: { select: athleteSummary } },
  });
}

export async function revokeGuardianLink(
  parentUserId: string,
  linkId: string
) {
  const result = await prisma.parentAthleteLink.updateMany({
    where: {
      id: linkId,
      parentUserId,
      status: { in: ["PENDING", "ACTIVE"] },
    },
    data: { status: "REVOKED", respondedAt: new Date() },
  });

  if (result.count === 0) {
    throw new GuardianLinkError("Guardian link not found.", 404);
  }

  return { id: linkId, status: "REVOKED" as const };
}

export async function listAthleteGuardianLinks(athleteUserId: string) {
  return prisma.parentAthleteLink.findMany({
    where: { athleteUserId },
    orderBy: { createdAt: "desc" },
    include: { parent: { select: guardianSummary } },
  });
}

export async function respondToGuardianLink(
  athleteUserId: string,
  linkId: string,
  action: "approve" | "reject"
) {
  const link = await prisma.parentAthleteLink.findFirst({
    where: { id: linkId, athleteUserId, status: "PENDING" },
    select: { id: true },
  });

  if (!link) {
    throw new GuardianLinkError(
      "Pending guardian link request not found.",
      404
    );
  }

  const status = action === "approve" ? "ACTIVE" : "REJECTED";

  const updated = await prisma.parentAthleteLink.update({
    where: { id: link.id },
    data: { status, respondedAt: new Date() },
    include: { parent: { select: guardianSummary } },
  });

  logger.info(
    "AUTH",
    `Athlete ${athleteUserId} ${action === "approve" ? "approved" : "rejected"} guardian link ${link.id}`
  );

  return updated;
}

export async function revokeAthleteGuardianLink(
  athleteUserId: string,
  linkId: string
) {
  const result = await prisma.parentAthleteLink.updateMany({
    where: {
      id: linkId,
      athleteUserId,
      status: { in: ["PENDING", "ACTIVE"] },
    },
    data: { status: "REVOKED", respondedAt: new Date() },
  });

  if (result.count === 0) {
    throw new GuardianLinkError("Guardian link not found.", 404);
  }

  return { id: linkId, status: "REVOKED" as const };
}
