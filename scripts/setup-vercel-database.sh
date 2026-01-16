#!/bin/bash

# Script para configurar la base de datos Neon en Vercel
# Este script ayuda a ejecutar las migraciones después de crear la base de datos en Vercel

set -e

echo "🚀 Configurando Base de Datos Neon para Vercel"
echo "================================================"
echo ""

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Verificar que DATABASE_URL esté configurada
if [ -z "$DATABASE_URL" ]; then
    echo -e "${YELLOW}⚠️  DATABASE_URL no está configurada${NC}"
    echo ""
    echo "Opciones:"
    echo "1. Si tienes Vercel CLI instalado, ejecuta:"
    echo "   ${GREEN}vercel env pull .env.local${NC}"
    echo ""
    echo "2. O crea un archivo .env.local con:"
    echo "   ${GREEN}DATABASE_URL=\"[TU_CONNECTION_STRING_DE_VERCEL]\"${NC}"
    echo ""
    echo "Para obtener DATABASE_URL:"
    echo "   - Ve a Vercel Dashboard → Tu Proyecto → Settings → Environment Variables"
    echo "   - Busca DATABASE_URL y copia el valor"
    echo ""
    exit 1
fi

echo -e "${GREEN}✅ DATABASE_URL encontrada${NC}"
echo ""

# Verificar que Prisma esté instalado
if ! command -v npx &> /dev/null; then
    echo -e "${RED}❌ npx no está instalado. Por favor instala Node.js y npm.${NC}"
    exit 1
fi

echo "📦 Generando Prisma Client..."
npx prisma generate

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Error al generar Prisma Client${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Prisma Client generado${NC}"
echo ""

# Intentar ejecutar migraciones
echo "🔄 Ejecutando migraciones con prisma migrate deploy..."
echo ""

if npx prisma migrate deploy; then
    echo -e "${GREEN}✅ Migraciones ejecutadas exitosamente${NC}"
else
    echo -e "${YELLOW}⚠️  prisma migrate deploy falló, intentando con prisma db push...${NC}"
    echo ""
    
    if npx prisma db push --accept-data-loss; then
        echo -e "${GREEN}✅ Esquema aplicado exitosamente con db push${NC}"
    else
        echo -e "${RED}❌ Error al aplicar el esquema${NC}"
        exit 1
    fi
fi

echo ""
echo "👤 Creando administrador MASTER..."
echo ""

if npx tsx scripts/clean-test-data-and-create-master.ts; then
    echo -e "${GREEN}✅ Administrador MASTER creado/actualizado${NC}"
else
    echo -e "${YELLOW}⚠️  Error al crear administrador. Verifica los logs arriba.${NC}"
fi

echo ""
echo "================================================"
echo -e "${GREEN}✅ Configuración completada${NC}"
echo "================================================"
echo ""
echo "📋 Resumen:"
echo "   - Prisma Client generado"
echo "   - Migraciones/esquema aplicado"
echo "   - Administrador MASTER creado"
echo ""
echo "🔑 Credenciales del administrador:"
echo "   Email: enyeralexander@gmail.com"
echo "   Password: 0995697717"
echo ""
echo "💡 Próximos pasos:"
echo "   1. Ve a Vercel Dashboard"
echo "   2. Haz redeploy de tu aplicación"
echo "   3. Prueba el login con las credenciales arriba"
echo ""
