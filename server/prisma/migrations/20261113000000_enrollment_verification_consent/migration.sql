-- Current enrollment verification requires one approved enrollment letter or
-- report card. Transcripts, eligibility records, combine reports, physicals,
-- and other documents remain optional supporting records.
ALTER TYPE "DocumentType" ADD VALUE IF NOT EXISTS 'ENROLLMENT_LETTER';
ALTER TYPE "DocumentType" ADD VALUE IF NOT EXISTS 'REPORT_CARD';

-- Guardian consent is stored on the parent-athlete link but represents a
-- separate decision from link approval. Only consent on an ACTIVE link counts.
ALTER TABLE "ParentAthleteLink" ADD COLUMN "consentGrantedAt" TIMESTAMP(3);
ALTER TABLE "ParentAthleteLink" ADD COLUMN "consentRevokedAt" TIMESTAMP(3);
ALTER TABLE "ParentAthleteLink" ADD COLUMN "consentVersion" TEXT;
