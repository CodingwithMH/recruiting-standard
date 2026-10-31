-- CreateEnum
CREATE TYPE "GuardianLinkStatus" AS ENUM ('PENDING', 'ACTIVE', 'REJECTED', 'REVOKED');

-- CreateTable
CREATE TABLE "ParentAthleteLink" (
    "id" TEXT NOT NULL,
    "parentUserId" TEXT NOT NULL,
    "athleteUserId" TEXT NOT NULL,
    "status" "GuardianLinkStatus" NOT NULL DEFAULT 'PENDING',
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParentAthleteLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ParentAthleteLink_parentUserId_athleteUserId_key" ON "ParentAthleteLink"("parentUserId", "athleteUserId");

-- CreateIndex
CREATE INDEX "ParentAthleteLink_parentUserId_status_idx" ON "ParentAthleteLink"("parentUserId", "status");

-- CreateIndex
CREATE INDEX "ParentAthleteLink_athleteUserId_status_idx" ON "ParentAthleteLink"("athleteUserId", "status");

-- AddForeignKey
ALTER TABLE "ParentAthleteLink" ADD CONSTRAINT "ParentAthleteLink_parentUserId_fkey" FOREIGN KEY ("parentUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParentAthleteLink" ADD CONSTRAINT "ParentAthleteLink_athleteUserId_fkey" FOREIGN KEY ("athleteUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
