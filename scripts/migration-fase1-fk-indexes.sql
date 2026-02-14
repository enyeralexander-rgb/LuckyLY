-- Migración Fase 1 (Remediación): FK faltante e índices para consultas frecuentes.
-- Ejecutar solo si la BD ya tiene el schema aplicado (no es la primera vez).
-- En Neon: SQL Editor → pegar y ejecutar.

-- FK faltante: HomePageConfig.updatedById → User.id
ALTER TABLE "HomePageConfig"
  ADD CONSTRAINT "HomePageConfig_updatedById_fkey"
  FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Índices para listados y reportes por fecha/estado
CREATE INDEX IF NOT EXISTS "Ticket_status_purchasedAt_idx" ON "Ticket"("status", "purchasedAt");
CREATE INDEX IF NOT EXISTS "PrizeClaim_status_processedAt_idx" ON "PrizeClaim"("status", "processedAt");
