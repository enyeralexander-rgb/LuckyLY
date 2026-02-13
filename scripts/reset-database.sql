-- ============================================
-- RESET TOTAL DE BASE DE DATOS - LuckyLY
-- ============================================
-- Elimina TODOS los datos incluyendo todos los usuarios (admins y USER).
-- Uso: entorno "desde cero" (nueva instalación o borrado total).
--
-- Ejecutar en psql o pgAdmin conectado a la BD.
-- Después de ejecutar:
--   1. El schema sigue existiendo (tablas vacías).
--   2. Para crear el primer MASTER: definir MASTER_INITIAL_EMAIL y
--      MASTER_INITIAL_PASSWORD y ejecutar node scripts/apply-schema-postgres.js,
--      o llamar a POST /api/setup/create-master con body/query o env.
--
-- Alternativa sin este script: npx prisma db push --force-reset --accept-data-loss
-- y luego node scripts/apply-schema-postgres.js (aplica schema y opcionalmente crea MASTER).
-- ============================================

SET session_replication_role = replica;

-- 1. Tokens y 2FA
DELETE FROM "PasswordResetToken";
DELETE FROM "EmailVerificationToken";
DELETE FROM "TwoFactorAuth";

-- 2. Notificaciones y favoritos
DELETE FROM "Notification";
DELETE FROM "FavoriteRaffle";

-- 3. Referidos (visitas antes que links)
DELETE FROM "ReferralVisit";
DELETE FROM "ReferralLink";

-- 4. Reclamos, items, tickets, sorteos
DELETE FROM "PrizeClaim";
DELETE FROM "TicketItem";
DELETE FROM "Ticket";
DELETE FROM "Raffle";
DELETE FROM "RaffleTemplate";

-- 5. Automatización y auditoría
DELETE FROM "AutomationRule";
DELETE FROM "AuditLog";

-- 6. Desvincular updatedById para poder borrar User
UPDATE "TermsAndConditions" SET "updatedById" = NULL;
UPDATE "Rules" SET "updatedById" = NULL;
UPDATE "PaymentMobile" SET "updatedById" = NULL;
UPDATE "SocialMedia" SET "updatedById" = NULL;
UPDATE "LiveConfig" SET "updatedById" = NULL;
UPDATE "HomePageConfig" SET "updatedById" = NULL;

-- 7. Desvincular createdById entre usuarios
UPDATE "User" SET "createdById" = NULL;

-- 8. Eliminar todos los usuarios
DELETE FROM "User";

SET session_replication_role = DEFAULT;

-- Verificación
SELECT 'Reset total completado. Base de datos vacía.' AS resultado;
