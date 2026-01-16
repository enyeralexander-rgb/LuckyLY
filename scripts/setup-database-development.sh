#!/bin/bash

# ============================================
# Script de Configuración de Base de Datos
# Entorno: Development (Neon)
# ============================================

set -e

echo "============================================"
echo "Configuración de Base de Datos - Development"
echo "============================================"

# Verificar que DATABASE_URL esté configurado
if [ -z "$DATABASE_URL" ]; then
    echo "❌ Error: DATABASE_URL no está configurado"
    echo "Por favor, configura la variable de entorno DATABASE_URL"
    exit 1
fi

echo "📝 Paso 1: Aplicando esquema completo..."
psql "$DATABASE_URL" -f database/SCHEMA_COMPLETO_DEVELOPMENT.sql

echo ""
echo "📦 Paso 2: Generando cliente de Prisma..."
npx prisma generate

echo ""
echo "✅ Base de datos configurada correctamente"
echo ""
echo "Siguiente paso: Ejecutar 'npx prisma db seed' para poblar datos iniciales (opcional)"
