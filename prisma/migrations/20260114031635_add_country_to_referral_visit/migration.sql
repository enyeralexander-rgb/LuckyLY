-- Add country field to ReferralVisit
ALTER TABLE "ReferralVisit" ADD COLUMN IF NOT EXISTS "country" TEXT;
CREATE INDEX IF NOT EXISTS "ReferralVisit_country_idx" ON "ReferralVisit"("country");
