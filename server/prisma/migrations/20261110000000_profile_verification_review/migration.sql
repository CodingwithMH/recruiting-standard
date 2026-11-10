-- Profile verification review workflow: reviewer decision notes (required when
-- rejecting an athlete profile) and the timestamp of the athlete's most recent
-- submission for verification, used to order and audit the admin review queue.
ALTER TABLE "AthleteProfile" ADD COLUMN "verificationNotes" TEXT;
ALTER TABLE "AthleteProfile" ADD COLUMN "submittedForVerificationAt" TIMESTAMP(3);
