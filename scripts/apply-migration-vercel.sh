#!/bin/bash

# Script para aplicar la migración de documentId en Vercel
# Este script puede ejecutarse manualmente o como parte del build

set -e

echo "🔄 Aplicando migración de documentId..."

if [ -z "$DATABASE_URL" ]; then
    echo "❌ Error: DATABASE_URL no está configurada"
    exit 1
fi

# Aplicar la migración SQL directamente
psql "$DATABASE_URL" -f database/migrations/production/20260116160000_remove_birthdate_add_documentid.sql

echo "✅ Migración aplicada exitosamente"
