#!/bin/bash

# ============================================
# Script para aplicar el esquema completo
# Entorno: Development (Neon)
# ============================================

set -e

echo "============================================"
echo "Aplicando esquema completo a Development"
echo "============================================"

# Verificar que DATABASE_URL esté configurado
if [ -z "$DATABASE_URL" ]; then
    echo "❌ Error: DATABASE_URL no está configurado"
    echo "Por favor, configura la variable de entorno DATABASE_URL"
    exit 1
fi

# Aplicar el esquema SQL
echo "📝 Aplicando esquema SQL..."
psql "$DATABASE_URL" -f database/SCHEMA_COMPLETO_DEVELOPMENT.sql

echo "✅ Esquema aplicado correctamente"
echo ""
echo "Siguiente paso: Ejecutar 'npx prisma generate' para generar el cliente de Prisma"
