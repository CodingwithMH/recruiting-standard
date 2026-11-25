import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { env } from "../config/env.js";
import { LEGAL_VERSIONS } from "../config/legal.js";
import {
  generateResetToken,
  hashResetToken,
} from "../utils/resetToken.js";
import { sendGuardianAuthorizationRequestEmail } from "../utils/email.js";
import { logger } from "../utils/logger.js";

export const GUARDIAN_AUTHORIZATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

type GuardianAuthorizationWriteClient = Pick<
  typeof prisma,
  "guardianAuthorization"
>;

const tokenSchema = z
  .string()
  .trim()
  .min(32, "A valid guardian authorization link is required")
  .max(128, "A valid guardian authorization link is required");

export const guardianAuthorizationLookupSchema = z.object({
  token: tokenSchema,
});

export const guardianAuthorizationConfirmSchema = z.object({
  token: tokenSchema,
  authorizationAccepted: z.literal(true),
  version: z.string().trim().min(1).optional(),
});

export type GuardianAuthorizationConfirmInput = z.infer<
  typeof guardianAuthorizationConfirmSchema
>;

export class GuardianAuthorizationError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.name = "GuardianAuthorizationError";
    this.statusCode = statusCode;
  }
}

export interface GuardianAuthorizationRequestInput {
  guardianName: string;
  guardianEmail: string;
  athleteName: string;
}

export interface CreatedGuardianAuthorization {
  token: string;
  guardianName: string;
  guardianEmail: string;
  athleteName: string;
  status: "PENDING";
  expiresAt: Date;
}

export async function createGuardianAuthorization(
  userId: string,
  input: GuardianAuthorizationRequestInput,
  tx: GuardianAuthorizationWriteClient = prisma
): Promise<CreatedGuardianAuthorization> {
  const token = generateResetToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + GUARDIAN_AUTHORIZATION_TTL_MS);

  await tx.guardianAuthorization.create({
    data: {
      userId,
      guardianName: input.guardianName.trim(),
      guardianEmail: input.guardianEmail.toLowerCase().trim(),
      tokenHash: hashResetToken(token),
      version: LEGAL_VERSIONS.GUARDIAN_AUTHORIZATION,
      expiresAt,
    },
  });

  return {
    token,
    guardianName: input.guardianName.trim(),
    guardianEmail: input.guardianEmail.trim(),
    athleteName: input.athleteName.trim(),
    status: "PENDING",
    expiresAt,
  };
}

export async function sendGuardianAuthorizationEmail(
  userId: string,
  authorization: CreatedGuardianAuthorization
): Promise<void> {
  const authorizationUrl = `${env.CLIENT_ORIGIN.replace(/\/$/, "")}/guardian-authorization?token=${authorization.token}`;

  try {
    await sendGuardianAuthorizationRequestEmail(
      authorization.guardianEmail,
      authorization.guardianName,
      authorization.athleteName,
      authorizationUrl
    );
  } catch (error) {
    logger.error(
      "AUTH",
      `Failed to send guardian authorization email for user: ${userId}`,
      error
    );
  }
}

export async function getGuardianAuthorizationForToken(token: string) {
  const record = await prisma.guardianAuthorization.findUnique({
    where: { tokenHash: hashResetToken(token) },
    select: {
      id: true,
      status: true,
      version: true,
      expiresAt: true,
      authorizedAt: true,
      guardianName: true,
      guardianEmail: true,
      user: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
          schoolId: true,
        },
      },
    },
  });

  if (!record) {
    throw new GuardianAuthorizationError(
      "This guardian authorization link was not found.",
      404
    );
  }

  if (record.status === "PENDING" && record.expiresAt.getTime() < Date.now()) {
    await prisma.guardianAuthorization.update({
      where: { id: record.id },
      data: { status: "EXPIRED" },
    });
    throw new GuardianAuthorizationError(
      "This guardian authorization link has expired.",
      410
    );
  }

  return record;
}

export async function confirmGuardianAuthorization(
  input: GuardianAuthorizationConfirmInput
) {
  const record = await prisma.guardianAuthorization.findUnique({
    where: { tokenHash: hashResetToken(input.token) },
    select: {
      id: true,
      status: true,
      version: true,
      expiresAt: true,
      userId: true,
    },
  });

  if (!record) {
    throw new GuardianAuthorizationError(
      "This guardian authorization link was not found.",
      404
    );
  }

  if (record.status === "AUTHORIZED") {
    return {
      id: record.id,
      status: "AUTHORIZED" as const,
      authorizedAt: new Date(),
    };
  }

  if (record.status !== "PENDING") {
    throw new GuardianAuthorizationError(
      "This guardian authorization link is no longer active.",
      409
    );
  }

  if (record.expiresAt.getTime() < Date.now()) {
    await prisma.guardianAuthorization.update({
      where: { id: record.id },
      data: { status: "EXPIRED" },
    });
    throw new GuardianAuthorizationError(
      "This guardian authorization link has expired.",
      410
    );
  }

  if (input.version && input.version !== record.version) {
    throw new GuardianAuthorizationError(
      "This authorization link does not match the current policy version. Please contact support for a new link.",
      409
    );
  }

  const now = new Date();

  const updated = await prisma.guardianAuthorization.update({
    where: { id: record.id },
    data: {
      status: "AUTHORIZED",
      respondedAt: now,
      authorizedAt: now,
      authorizationVersion: record.version,
    },
    select: {
      id: true,
      status: true,
      authorizedAt: true,
      authorizationVersion: true,
    },
  });

  logger.info(
    "AUTH",
    `Guardian authorization recorded for athlete user: ${record.userId}`
  );

  return updated;
}

export async function hasAuthorizedGuardianAuthorization(
  userId: string
): Promise<boolean> {
  const record = await prisma.guardianAuthorization.findUnique({
    where: { userId },
    select: { status: true, authorizationVersion: true },
  });

  return (
    record?.status === "AUTHORIZED" &&
    record.authorizationVersion === LEGAL_VERSIONS.GUARDIAN_AUTHORIZATION
  );
}
