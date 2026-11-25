import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { LEGAL_DOCUMENT_KEYS, LEGAL_VERSIONS } from "../config/legal.js";

type LegalAcceptanceWriteClient = Pick<typeof prisma, "legalAcceptance">;

export function legalAcceptanceRecords(
  userId: string,
  acceptedAt: Date = new Date()
): Prisma.LegalAcceptanceCreateManyInput[] {
  return LEGAL_DOCUMENT_KEYS.map((documentKey) => ({
    userId,
    documentKey,
    version:
      documentKey === "TERMS_OF_USE"
        ? LEGAL_VERSIONS.TERMS_OF_USE
        : LEGAL_VERSIONS.PRIVACY_POLICY,
    acceptedAt,
  }));
}

export async function recordLegalAcceptances(
  tx: LegalAcceptanceWriteClient,
  userId: string,
  acceptedAt: Date = new Date()
): Promise<void> {
  await tx.legalAcceptance.createMany({
    data: legalAcceptanceRecords(userId, acceptedAt),
    skipDuplicates: true,
  });
}
