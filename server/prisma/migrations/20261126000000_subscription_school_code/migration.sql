ALTER TABLE "Subscription" ADD COLUMN "schoolCode" TEXT;

UPDATE "Subscription" AS s
SET "schoolCode" = school."schoolId"
FROM "School" AS school
WHERE s."schoolId" = school."id"
  AND school."schoolId" IS NOT NULL;

CREATE INDEX "Subscription_schoolCode_idx" ON "Subscription"("schoolCode");
