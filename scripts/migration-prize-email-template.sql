-- Ejecutar en Neon (o en tu BD) si la tabla PrizeEmailTemplate no existe
CREATE TABLE IF NOT EXISTS "PrizeEmailTemplate" (
    "id" TEXT NOT NULL,
    "body" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PrizeEmailTemplate_pkey" PRIMARY KEY ("id")
);
