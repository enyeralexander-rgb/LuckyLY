-- ============================================
-- Migración: Agregar INCORRECT_DATA a PrizeStatus
-- Fecha: 2026-01-16
-- Entorno: Producción (Main)
-- Descripción: Agrega el valor 'INCORRECT_DATA' al enum PrizeStatus
-- ============================================

-- Verificar si el valor ya existe antes de agregarlo
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'INCORRECT_DATA' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'PrizeStatus')
    ) THEN
        -- Agregar valor al enum
        ALTER TYPE "PrizeStatus" ADD VALUE 'INCORRECT_DATA';
        RAISE NOTICE 'Valor INCORRECT_DATA agregado al enum PrizeStatus';
    ELSE
        RAISE NOTICE 'Valor INCORRECT_DATA ya existe en PrizeStatus, omitiendo migración';
    END IF;
END $$;

-- ============================================
-- FIN DE MIGRACIÓN
-- ============================================
