-- Migration: Eliminar verificación de correo
-- Ejecutar contra la base de datos (Neon, Vercel Postgres, etc.)
-- Elimina la tabla EmailVerificationToken ya que la verificación de correo fue removida.

DROP TABLE IF EXISTS "EmailVerificationToken" CASCADE;
