-- ============================================
-- MIGRACIÓN: Agregar documentId y eliminar birthDate
-- Fecha: 2026-01-16
-- Entorno: Production
-- ============================================
-- Esta migración:
-- 1. Agrega la columna documentId
-- 2. Pobla documentId con valores únicos basados en nationalId, email o id
-- 3. Hace documentId NOT NULL y único
-- 4. Elimina la columna birthDate
-- ============================================

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

-- ============================================
-- FIN DE LA MIGRACIÓN
-- ============================================
