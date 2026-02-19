-- ============================================
-- SCRIPT DE LIMPIEZA OPERATIVA - LuckyLY
-- ============================================
-- Limpia datos de usuarios regulares, sorteos, tickets, etc.
-- Mantiene administradores (MASTER, SUPERADMIN, CONTABLE, AGENT).
--
-- Uso: limpieza operativa (borrar datos de negocio sin tocar admins).
-- Para un RESET TOTAL "desde cero" (incluyendo todos los usuarios),
-- usar scripts/reset-database.sql o prisma db push --force-reset.
--
-- Ejecutar en pgAdmin o psql.
-- ============================================

-- Deshabilitar verificación de foreign keys temporalmente
SET session_replication_role = replica;

-- ============================================
-- 1. ELIMINAR TOKENS Y SESIONES
-- ============================================
DELETE FROM "PasswordResetToken";

-- ============================================
-- 2. ELIMINAR AUTENTICACIÓN 2FA DE USUARIOS REGULARES
-- ============================================
DELETE FROM "TwoFactorAuth" WHERE "userId" IN (
  SELECT id FROM "User" WHERE role = 'USER'
);

-- ============================================
-- 3. ELIMINAR NOTIFICACIONES
-- ============================================
DELETE FROM "Notification";

-- ============================================
-- 4. ELIMINAR FAVORITOS
-- ============================================
DELETE FROM "FavoriteRaffle";

-- ============================================
-- 5. ELIMINAR RECLAMOS DE PREMIOS
-- ============================================
DELETE FROM "PrizeClaim";

-- ============================================
-- 6. ELIMINAR ITEMS DE TICKETS
-- ============================================
DELETE FROM "TicketItem";

-- ============================================
-- 7. ELIMINAR TICKETS
-- ============================================
DELETE FROM "Ticket";

-- ============================================
-- 8. ELIMINAR SORTEOS
-- ============================================
DELETE FROM "Raffle";

-- ============================================
-- 9. ELIMINAR VISITAS DE REFERIDOS
-- ============================================
DELETE FROM "ReferralVisit";

-- ============================================
-- 10. ELIMINAR LINKS DE REFERIDOS
-- ============================================
DELETE FROM "ReferralLink";

-- ============================================
-- 11. ELIMINAR REGLAS DE AUTOMATIZACIÓN
-- ============================================
DELETE FROM "AutomationRule";

-- ============================================
-- 12. ELIMINAR LOGS DE AUDITORÍA (OPCIONAL)
-- ============================================
-- Descomenta la siguiente línea si también quieres eliminar
-- el historial de logs de auditoría
-- DELETE FROM "AuditLog";

-- ============================================
-- 13. ELIMINAR USUARIOS REGULARES (rol = USER)
-- ============================================
DELETE FROM "User" WHERE role = 'USER';

-- ============================================
-- REACTIVAR VERIFICACIÓN DE FOREIGN KEYS
-- ============================================
SET session_replication_role = DEFAULT;

-- ============================================
-- VERIFICAR RESULTADOS
-- ============================================
SELECT 'Tokens eliminados' AS resultado;
SELECT 'Notificaciones eliminadas' AS resultado;
SELECT 'Sorteos eliminados' AS resultado;
SELECT 'Tickets eliminados' AS resultado;
SELECT 'Usuarios regulares eliminados' AS resultado;

-- Mostrar administradores que se mantienen
SELECT 
  id, 
  email, 
  name, 
  role, 
  "createdAt"
FROM "User" 
WHERE role IN ('MASTER', 'SUPERADMIN', 'CONTABLE', 'AGENT')
ORDER BY role, "createdAt";

-- ============================================
-- FIN DEL SCRIPT
-- ============================================
