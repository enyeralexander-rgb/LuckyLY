-- Step 1: Add documentId column as nullable first
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "documentId" TEXT;

-- Step 2: Populate documentId for existing users with unique values
-- Use nationalId if available, otherwise use email, otherwise use id
UPDATE "User" 
SET "documentId" = COALESCE(
  CASE WHEN "nationalId" IS NOT NULL AND "nationalId" != '' 
    THEN CONCAT(COALESCE("nationalIdType", ''), '-', "nationalId") 
    ELSE NULL 
  END,
  "email",
  "id"
)
WHERE "documentId" IS NULL;

-- Step 3: For any remaining NULL values, generate unique IDs
UPDATE "User"
SET "documentId" = CONCAT('USER-', "id")
WHERE "documentId" IS NULL;

-- Step 4: Make documentId NOT NULL
ALTER TABLE "User" ALTER COLUMN "documentId" SET NOT NULL;

-- Step 5: Create unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS "User_documentId_key" ON "User"("documentId");

-- Step 6: Add index for documentId
CREATE INDEX IF NOT EXISTS "User_documentId_idx" ON "User"("documentId");

-- Step 7: Remove birthDate column
ALTER TABLE "User" DROP COLUMN IF EXISTS "birthDate";
