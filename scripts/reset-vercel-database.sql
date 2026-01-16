-- ============================================
-- SCRIPT PARA LIMPIAR BASE DE DATOS EN VERCEL
-- ============================================
-- ADVERTENCIA: Esto eliminará TODOS los datos
-- Solo usar en entornos de desarrollo/preview
-- ============================================

-- Desactivar verificación de claves foráneas temporalmente
SET session_replication_role = 'replica';

-- Eliminar todas las tablas en orden inverso de dependencias
DROP TABLE IF EXISTS "_prisma_migrations" CASCADE;
DROP TABLE IF EXISTS "FavoriteRaffle" CASCADE;
DROP TABLE IF EXISTS "ReferralVisit" CASCADE;
DROP TABLE IF EXISTS "ReferralLink" CASCADE;
DROP TABLE IF EXISTS "SocialMedia" CASCADE;
DROP TABLE IF EXISTS "PaymentMobile" CASCADE;
DROP TABLE IF EXISTS "Rules" CASCADE;
DROP TABLE IF EXISTS "TermsAndConditions" CASCADE;
DROP TABLE IF EXISTS "EmailVerificationToken" CASCADE;
DROP TABLE IF EXISTS "PasswordResetToken" CASCADE;
DROP TABLE IF EXISTS "TwoFactorAuth" CASCADE;
DROP TABLE IF EXISTS "AuditLog" CASCADE;
DROP TABLE IF EXISTS "Notification" CASCADE;
DROP TABLE IF EXISTS "PrizeClaim" CASCADE;
DROP TABLE IF EXISTS "TicketItem" CASCADE;
DROP TABLE IF EXISTS "Ticket" CASCADE;
DROP TABLE IF EXISTS "RaffleTemplate" CASCADE;
DROP TABLE IF EXISTS "Raffle" CASCADE;
DROP TABLE IF EXISTS "HomePageConfig" CASCADE;
DROP TABLE IF EXISTS "User" CASCADE;
DROP TABLE IF EXISTS "AutomationRule" CASCADE;

-- Eliminar todos los ENUMs
DROP TYPE IF EXISTS "AutomationType" CASCADE;
DROP TYPE IF EXISTS "NotificationType" CASCADE;
DROP TYPE IF EXISTS "TicketItemStatus" CASCADE;
DROP TYPE IF EXISTS "PaymentMethod" CASCADE;
DROP TYPE IF EXISTS "Bank" CASCADE;
DROP TYPE IF EXISTS "PrizeStatus" CASCADE;
DROP TYPE IF EXISTS "DrawType" CASCADE;
DROP TYPE IF EXISTS "Role" CASCADE;

-- Reactivar verificación de claves foráneas
SET session_replication_role = 'origin';

-- Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE '✅ Base de datos limpiada exitosamente';
    RAISE NOTICE 'Ahora ejecuta: npx prisma db push --accept-data-loss';
END $$;
