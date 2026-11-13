import type { DocumentStatus, DocumentType } from "@prisma/client";
import { prisma } from "../config/prisma.js";

export const ENROLLMENT_DOCUMENT_TYPES = [
  "ENROLLMENT_LETTER",
  "REPORT_CARD",
] as const;

export type EnrollmentDocumentType = (typeof ENROLLMENT_DOCUMENT_TYPES)[number];

const ENROLLMENT_DOCUMENT_TYPE_SET: ReadonlySet<string> = new Set(
  ENROLLMENT_DOCUMENT_TYPES
);

export const GUARDIAN_CONSENT_VERSION = "enrollment-verification-v1";

export type EnrollmentProofStatus =
  | "MISSING"
  | "PENDING"
  | "APPROVED"
  | "REJECTED";

export type VerificationRequirement =
  | "ENROLLMENT_PROOF"
  | "GUARDIAN_CONSENT";

export interface VerificationRequirements {
  isMinor: boolean;
  guardianConsentRequired: boolean;
  guardianConsentRecorded: boolean;
  enrollmentProofStatus: EnrollmentProofStatus;
  enrollmentProofApproved: boolean;
  eligibleForApproval: boolean;
  missingRequirements: VerificationRequirement[];
}

export function isEnrollmentDocumentType(
  type: DocumentType | string
): type is EnrollmentDocumentType {
  return ENROLLMENT_DOCUMENT_TYPE_SET.has(type);
}

export function calculateAge(dateOfBirth: Date, now: Date = new Date()): number {
  let age = now.getUTCFullYear() - dateOfBirth.getUTCFullYear();
  const monthDiff = now.getUTCMonth() - dateOfBirth.getUTCMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && now.getUTCDate() < dateOfBirth.getUTCDate())
  ) {
    age -= 1;
  }

  return age;
}

/**
 * Athletes with an unknown date of birth are treated as minors for safety, so
 * verification cannot be granted without recorded guardian consent.
 */
export function athleteRequiresGuardianConsent(
  dateOfBirth: Date | null,
  now: Date = new Date()
): boolean {
  if (!dateOfBirth || Number.isNaN(dateOfBirth.getTime())) return true;
  return calculateAge(dateOfBirth, now) < 18;
}

export function evaluateVerificationRequirements(input: {
  dateOfBirth: Date | null;
  documents: Array<{ type: DocumentType | string; status: DocumentStatus | string }>;
  guardianConsentRecorded: boolean;
  now?: Date;
}): VerificationRequirements {
  const requiredDocuments = input.documents.filter((document) =>
    isEnrollmentDocumentType(document.type)
  );

  const enrollmentProofApproved = requiredDocuments.some(
    (document) => document.status === "APPROVED"
  );
  const hasPendingEnrollmentProof = requiredDocuments.some(
    (document) => document.status === "PENDING"
  );
  const hasRejectedEnrollmentProof = requiredDocuments.some(
    (document) => document.status === "REJECTED"
  );

  const enrollmentProofStatus: EnrollmentProofStatus = enrollmentProofApproved
    ? "APPROVED"
    : hasPendingEnrollmentProof
      ? "PENDING"
      : hasRejectedEnrollmentProof
        ? "REJECTED"
        : "MISSING";

  const guardianConsentRequired = athleteRequiresGuardianConsent(
    input.dateOfBirth,
    input.now
  );

  const missingRequirements: VerificationRequirement[] = [];

  if (!enrollmentProofApproved) {
    missingRequirements.push("ENROLLMENT_PROOF");
  }

  if (guardianConsentRequired && !input.guardianConsentRecorded) {
    missingRequirements.push("GUARDIAN_CONSENT");
  }

  return {
    isMinor: guardianConsentRequired,
    guardianConsentRequired,
    guardianConsentRecorded: input.guardianConsentRecorded,
    enrollmentProofStatus,
    enrollmentProofApproved,
    eligibleForApproval: missingRequirements.length === 0,
    missingRequirements,
  };
}

export function verificationRequirementsMessage(
  requirements: VerificationRequirements
): string {
  if (requirements.eligibleForApproval) return "Enrollment verification requirements are met.";

  const problems: string[] = [];

  if (requirements.enrollmentProofStatus === "MISSING") {
    problems.push(
      "an approved current enrollment letter or current report card"
    );
  } else if (requirements.enrollmentProofStatus === "PENDING") {
    problems.push(
      "an enrollment proof that is still pending review"
    );
  } else if (requirements.enrollmentProofStatus === "REJECTED") {
    problems.push(
      "an enrollment proof that was rejected and needs an approved replacement"
    );
  }

  if (
    requirements.guardianConsentRequired &&
    !requirements.guardianConsentRecorded
  ) {
    problems.push("recorded parent or guardian consent");
  }

  return `Cannot approve: the athlete needs ${problems.join(" and ")}.`;
}

export function hasActiveGuardianConsent(links: Array<{
  consentGrantedAt: Date | null;
  consentRevokedAt: Date | null;
}>): boolean {
  return links.some(
    (link) =>
      link.consentGrantedAt !== null &&
      link.consentRevokedAt === null
  );
}

export async function getVerificationRequirementsForProfile(
  athleteProfileId: string
): Promise<VerificationRequirements | null> {
  const profile = await prisma.athleteProfile.findUnique({
    where: { id: athleteProfileId },
    select: {
      userId: true,
      user: { select: { dateOfBirth: true } },
      documents: {
        where: { type: { in: [...ENROLLMENT_DOCUMENT_TYPES] } },
        select: { type: true, status: true },
      },
    },
  });

  if (!profile) return null;

  const consentLinks = await prisma.parentAthleteLink.findMany({
    where: {
      athleteUserId: profile.userId,
      status: "ACTIVE",
      consentGrantedAt: { not: null },
      consentRevokedAt: null,
    },
    select: { consentGrantedAt: true, consentRevokedAt: true },
  });

  return evaluateVerificationRequirements({
    dateOfBirth: profile.user.dateOfBirth,
    documents: profile.documents,
    guardianConsentRecorded: hasActiveGuardianConsent(consentLinks),
  });
}

function verificationRemovedNote(
  requirements: VerificationRequirements
): string {
  if (
    !requirements.enrollmentProofApproved &&
    requirements.guardianConsentRequired &&
    !requirements.guardianConsentRecorded
  ) {
    return "Verification was removed because the athlete no longer has an approved current enrollment proof and guardian consent is no longer recorded. Upload an approved enrollment letter or report card and have a parent or guardian record consent, then resubmit for verification.";
  }

  if (!requirements.enrollmentProofApproved) {
    return "Verification was removed because the athlete no longer has an approved current enrollment letter or report card. Upload a replacement and have it approved, then resubmit for verification.";
  }

  return "Verification was removed because guardian consent is no longer recorded. A parent or guardian must record consent, then the athlete can resubmit for verification.";
}

/**
 * Drops an existing Verified badge when a required enrollment proof or required
 * guardian consent is no longer valid. Optional documents never affect this.
 */
export async function invalidateVerificationIfUnmet(
  athleteProfileId: string
): Promise<boolean> {
  const requirements = await getVerificationRequirementsForProfile(
    athleteProfileId
  );

  if (!requirements || requirements.eligibleForApproval) return false;

  const result = await prisma.athleteProfile.updateMany({
    where: { id: athleteProfileId, verificationStatus: "APPROVED" },
    data: {
      verificationStatus: "UNVERIFIED",
      verificationNotes: verificationRemovedNote(requirements),
      submittedForVerificationAt: null,
      verifiedAt: null,
      verifiedById: null,
    },
  });

  return result.count > 0;
}

export async function invalidateVerificationForAthleteUser(
  athleteUserId: string
): Promise<boolean> {
  const profile = await prisma.athleteProfile.findUnique({
    where: { userId: athleteUserId },
    select: { id: true },
  });

  return profile ? invalidateVerificationIfUnmet(profile.id) : false;
}
