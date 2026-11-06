-- Add international-friendly school location fields while preserving existing data.
ALTER TABLE "School" RENAME COLUMN "state" TO "provinceRegion";
ALTER TABLE "School" RENAME COLUMN "zipCode" TO "postalCode";
ALTER TABLE "School" ADD COLUMN "country" TEXT NOT NULL DEFAULT 'United States';
