CREATE TYPE "LegalDocumentKey" AS ENUM ('TERMS_OF_USE', 'PRIVACY_POLICY');
CREATE TYPE "GuardianAuthorizationStatus" AS ENUM ('PENDING', 'AUTHORIZED', 'EXPIRED', 'REVOKED');

CREATE TABLE "GuardianAuthorization" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "guardianName" TEXT NOT NULL,
    "guardianEmail" TEXT NOT NULL,
    "status" "GuardianAuthorizationStatus" NOT NULL DEFAULT 'PENDING',
    "tokenHash" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),
    "authorizedAt" TIMESTAMP(3),
    "authorizationVersion" TEXT,

    CONSTRAINT "GuardianAuthorization_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LegalAcceptance" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "documentKey" "LegalDocumentKey" NOT NULL,
    "version" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LegalAcceptance_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GuardianAuthorization_userId_key" ON "GuardianAuthorization"("userId");
CREATE UNIQUE INDEX "GuardianAuthorization_tokenHash_key" ON "GuardianAuthorization"("tokenHash");
CREATE INDEX "GuardianAuthorization_status_idx" ON "GuardianAuthorization"("status");
CREATE INDEX "GuardianAuthorization_expiresAt_idx" ON "GuardianAuthorization"("expiresAt");
CREATE UNIQUE INDEX "LegalAcceptance_userId_documentKey_version_key" ON "LegalAcceptance"("userId", "documentKey", "version");
CREATE INDEX "LegalAcceptance_userId_acceptedAt_idx" ON "LegalAcceptance"("userId", "acceptedAt");

ALTER TABLE "GuardianAuthorization" ADD CONSTRAINT "GuardianAuthorization_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LegalAcceptance" ADD CONSTRAINT "LegalAcceptance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
