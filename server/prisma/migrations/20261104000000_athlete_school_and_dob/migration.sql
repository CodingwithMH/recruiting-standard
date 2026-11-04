-- AlterTable
ALTER TABLE "User" ADD COLUMN "dateOfBirth" TIMESTAMP(3),
ADD COLUMN "schoolId" TEXT;

-- CreateIndex
CREATE INDEX "User_schoolId_idx" ON "User"("schoolId");
