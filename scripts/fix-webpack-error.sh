#!/bin/bash

# Script para solucionar errores de webpack
# Este script limpia completamente el caché y regenera todo

echo "🧹 Limpiando caché de Next.js..."
rm -rf .next
rm -rf node_modules/.cache
rm -rf .next/cache
rm -rf .swc

echo "🔄 Regenerando cliente de Prisma..."
npx prisma generate

echo "✅ Limpieza completada"
echo ""
echo "💡 Ahora ejecuta: npm run dev"
echo "   Si el error persiste, ejecuta: npm run clean:full && npm install && npm run dev"
