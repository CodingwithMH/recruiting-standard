-- CreateEnum
CREATE TYPE "HighlightProvider" AS ENUM ('CLOUDINARY', 'HUDL', 'YOUTUBE', 'VIMEO', 'OTHER');

-- CreateTable
CREATE TABLE "HighlightVideo" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT,
    "videoUrl" TEXT NOT NULL,
    "provider" "HighlightProvider" NOT NULL DEFAULT 'OTHER',
    "publicId" TEXT,
    "durationSeconds" INTEGER,
    "sizeBytes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HighlightVideo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HighlightVideo_userId_videoUrl_key" ON "HighlightVideo"("userId", "videoUrl");

-- CreateIndex
CREATE INDEX "HighlightVideo_userId_createdAt_idx" ON "HighlightVideo"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "HighlightVideo" ADD CONSTRAINT "HighlightVideo_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
