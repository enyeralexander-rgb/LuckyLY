#!/bin/bash

# Script para limpiar caché y regenerar Prisma Client
# Uso: bash scripts/fix-prisma-cache.sh

echo "🧹 Limpiando caché de Next.js..."
rm -rf .next/cache .next/server .next/static node_modules/.cache 2>/dev/null

echo "🔄 Regenerando cliente de Prisma..."
npx prisma generate

echo "✅ Verificando migraciones..."
npx prisma migrate status

echo ""
echo "✅ ¡Listo! Ahora REINICIA el servidor de desarrollo:"
echo "   1. Presiona Ctrl+C para detener el servidor"
echo "   2. Ejecuta: npm run dev"
